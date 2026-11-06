// Captures the report screenshots by driving the REAL ORBIT CLOUD web UI in headless Chrome.
//   node tools/screenshots.mjs            (the cloud must be running: ./orbit up)
// Everything shown is genuine: real logins, real uploads, real deletes — nothing is mocked.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

// non-interactive credentials come from .env (never printed)
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n').map((l) => l.match(/^([A-Z0-9_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const PORT = env.HTTPS_PORT || '8443';
const LOCAL = `https://localhost:${PORT}`;
const lanIp = (() => { try { return execFileSync('ipconfig', ['getifaddr', 'en0']).toString().trim() || execFileSync('ipconfig', ['getifaddr', 'en1']).toString().trim(); } catch { return ''; } })();
const LAN = lanIp ? `https://${lanIp}:${PORT}` : LOCAL;
const CA = path.join(ROOT, 'certs', 'orbit-root-ca.crt');
const users = {
  home: { u: env.CLIENT_HOME_USER, p: env.CLIENT_HOME_PASSWORD },
  office: { u: env.CLIENT_OFFICE_USER, p: env.CLIENT_OFFICE_PASSWORD },
  admin: { u: env.ADMIN_USER, p: env.ADMIN_PASSWORD },
};

// small WebDAV helper (certificate verified against the cloud's own CA); credentials go via stdin config
function dav(user, method, urlPath, { data, headers = [] } = {}) {
  const args = ['-sS', '--cacert', CA, '-K', '-', '-X', method, '-o', '/dev/null', '-w', '%{http_code}', ...headers.flatMap((h) => ['-H', h])];
  if (data !== undefined) args.push('--data-binary', data);
  args.push(`${LOCAL}${urlPath}`);
  return execFileSync('curl', args, { input: `user = "${user.u}:${user.p}"\n` }).toString();
}
const davBody = (user, method, urlPath, headers = [], data) => {
  const args = ['-sS', '--cacert', CA, '-K', '-', '-X', method, ...headers.flatMap((h) => ['-H', h])];
  if (data) args.push('--data', data);
  args.push(`${LOCAL}${urlPath}`);
  return execFileSync('curl', args, { input: `user = "${user.u}:${user.p}"\n` }).toString();
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-shots-'));
const DEMO = 'ORBIT-Cloud-Notes.txt';
const demoFile = path.join(tmp, DEMO);
fs.writeFileSync(demoFile, 'ORBIT CLOUD — demo file\nVersion 1 — uploaded from the web interface.\n');

const b = await launch({ width: 1440, height: 900 });
const key = (k, code, vk) => b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk });
const label = (text) => b.eval(`(() => { const d = document.createElement('div'); d.textContent = ${JSON.stringify(text)}; d.style.cssText = 'position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:2147483647;background:#1B1F3B;color:#fff;font:600 13px/1 Menlo,monospace;padding:8px 14px;border-radius:8px;opacity:.94'; document.body.appendChild(d); })()`);

const dismiss = () => b.eval(`(() => { const e = [...document.querySelectorAll('button, a')].find(x => /^(skip|close)$/i.test((x.innerText || '').trim()) && x.offsetParent); if (e) { e.click(); return true; } return false; })()`);
async function login(base, who) {
  await b.clearSession();
  await b.goto(`${base}/login`, 1500);
  await b.waitFor(`!!document.querySelector('input[name=user]')`, 30000, 'login form');
  await b.setValue('input[name=user]', users[who].u);
  await b.setValue('input[name=password]', users[who].p);
  await b.click('button[type=submit]');
  await b.waitFor(`location.pathname.startsWith('/apps/') || location.pathname.startsWith('/settings')`, 40000, 'redirect after login');
  await b.sleep(1500);
  for (let i = 0; i < 3; i++) { await dismiss(); await key('Escape', 'Escape', 27); await b.sleep(300); }   // dismiss any first-run dialog
}
async function openFiles(base, dir = '/') {
  await b.goto(`${base}/apps/files/files?dir=${encodeURIComponent(dir)}`, 1500);
  await b.waitFor(`!!document.querySelector('[data-cy-files-list]') || !!document.querySelector('.files-list') || !!document.querySelector('[data-cy-files-content-empty]')`, 40000, 'files list');
  await b.sleep(1500);
  for (let i = 0; i < 2; i++) { await dismiss(); await key('Escape', 'Escape', 27); await b.sleep(200); }
}
const rowExists = (name) => `[...document.querySelectorAll('[data-cy-files-list-row-name]')].some(r => r.getAttribute('data-cy-files-list-row-name') === ${JSON.stringify(name)}) || document.body.innerText.includes(${JSON.stringify(name)})`;

const retry = async (fn, n = 3) => { for (let i = 0; i < n; i++) { try { return await fn(); } catch (e) { if (i === n - 1) throw e; console.log('  retrying after:', e.message); await b.sleep(5000); } } };
const done = [];
try {
  // 0 · clean state for the demo file
  dav(users.home, 'DELETE', `/remote.php/dav/files/${users.home.u}/${DEMO}`);
  dav(users.home, 'DELETE', `/remote.php/dav/trashbin/${users.home.u}/trash`);

  // 1 · branded login page
  await b.clearSession();
  await b.goto(`${LOCAL}/login`, 2000);
  await b.waitFor(`!!document.querySelector('input[name=user]')`, 30000, 'login page');
  await b.shot(path.join(OUT, '01-login.png')); done.push('01-login');

  // 2 · client "home" signs in
  await retry(() => login(LOCAL, 'home'));
  await openFiles(LOCAL);
  await b.shot(path.join(OUT, '02-files-home.png')); done.push('02-files-home');

  // 3 · ADD through the UI (real file-input upload)
  await b.upload('input[type=file]', [demoFile]);
  await b.waitFor(rowExists(DEMO), 40000, 'uploaded file in list');
  await b.sleep(1200);
  await b.shot(path.join(OUT, '03-upload-add.png')); done.push('03-upload-add');

  // 4 · UPDATE (second version through the same WebDAV API the apps use) → version history in the UI
  const code = dav(users.home, 'PUT', `/remote.php/dav/files/${users.home.u}/${DEMO}`, { data: 'ORBIT CLOUD — demo file\nVersion 2 — UPDATED (new content replaces the old; the old stays in history).\n' });
  const xml = davBody(users.home, 'PROPFIND', `/remote.php/dav/files/${users.home.u}/${DEMO}`, ['Depth: 0'], '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns"><d:prop><oc:fileid/></d:prop></d:propfind>');
  const fileid = (xml.match(/<oc:fileid>(\d+)/) || [])[1];
  console.log(`update PUT → HTTP ${code}, file id ${fileid}`);
  await b.goto(`${LOCAL}/apps/files/files/${fileid}?dir=/&opendetails=true`, 2500);
  await b.waitFor(`document.body.innerText.includes('Versions')`, 25000, 'sidebar tabs');
  await b.eval(`(() => { const t = [...document.querySelectorAll('[role=tab], button, a')].find(e => e.innerText && e.innerText.trim() === 'Versions'); if (t) t.click(); })()`);
  await b.sleep(2500);
  await b.shot(path.join(OUT, '04-versions.png')); done.push('04-versions');

  // 5 · DELETE through the UI → trash bin
  await openFiles(LOCAL);
  await b.waitFor(rowExists(DEMO), 20000, 'demo file before delete');
  const deleted = await b.eval(`(async () => {
    const row = [...document.querySelectorAll('[data-cy-files-list-row]')].find(r => r.getAttribute('data-cy-files-list-row-name') === ${JSON.stringify(DEMO)});
    if (!row) return 'row-not-found';
    const btn = row.querySelector('button[aria-label*="Actions" i], .action-item__menutoggle, button.action-item__menutoggle');
    if (!btn) return 'menu-button-not-found';
    btn.click(); await new Promise(r => setTimeout(r, 700));
    const item = [...document.querySelectorAll('[role=menuitem], .action-button, li button, button')].find(e => /^Delete( file)?$/i.test((e.innerText || '').trim()));
    if (!item) return 'delete-item-not-found';
    item.click(); return 'clicked';
  })()`);
  console.log('delete via UI:', deleted);
  await b.sleep(1500);
  await key('Enter', 'Enter', 13);   // confirm if a dialog is shown
  await b.sleep(1500);
  if (deleted !== 'clicked') dav(users.home, 'DELETE', `/remote.php/dav/files/${users.home.u}/${DEMO}`);   // fallback keeps the demo moving
  await b.goto(`${LOCAL}/apps/files/trashbin`, 2500);
  await b.waitFor(`document.body.innerText.includes(${JSON.stringify(DEMO.replace(/\.txt$/, ''))})`, 25000, 'file in trash');
  await b.shot(path.join(OUT, '05-trash.png')); done.push('05-trash');

  // 6 · client "office" through the LAN address (how another device reaches the cloud)
  await retry(async () => { await login(LAN, 'office'); await openFiles(LAN); });
  await label(`address: ${LAN}/apps/files/`);
  await b.shot(path.join(OUT, '06-office-lan.png')); done.push('06-office-lan');

  // 7 · phone-sized layout
  await b.viewport(390, 844, { mobile: true, scale: 2 });
  await openFiles(LAN);
  await b.shot(path.join(OUT, '07-mobile.png')); done.push('07-mobile');
  await b.viewport(1440, 900);

  // 8 · provider view: accounts + quotas
  await retry(() => login(LOCAL, 'admin'));
  await b.viewport(2100, 760);   // wide enough for the Quota column
  await b.goto(`${LOCAL}/settings/users`, 2500);
  await b.waitFor(`document.body.innerText.includes(${JSON.stringify(users.office.u)})`, 30000, 'users list');
  await b.sleep(1500);
  await b.shot(path.join(OUT, '08-admin-users.png')); done.push('08-admin-users');
} catch (e) {
  console.error('SCREENSHOT STEP FAILED:', e.message);
  await b.shot(path.join(OUT, '_failed-state.png')).catch(() => {});
  process.exitCode = 1;
} finally {
  // leave the cloud tidy
  try { dav(users.home, 'DELETE', `/remote.php/dav/files/${users.home.u}/${DEMO}`); dav(users.home, 'DELETE', `/remote.php/dav/trashbin/${users.home.u}/trash`); } catch {}
  await b.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('captured:', done.join(', '));
}
