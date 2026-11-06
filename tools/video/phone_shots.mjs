// Captures REAL phone-sized screens (Chrome in Google Pixel 7 mode: 412x915 CSS px @2.625x)
// of the whole "open the cloud on the phone" flow, for the explainer video.
//   node tools/video/phone_shots.mjs        (the cloud must be running)
// Chrome's certificate warning is the real one (certificate errors are NOT ignored here).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launch } from '../cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'docs', 'phone');
fs.mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n').map((l) => l.match(/^([A-Z0-9_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const lanIp = execFileSync('ipconfig', ['getifaddr', 'en0']).toString().trim();
const LAN = `https://${lanIp}:${env.HTTPS_PORT || '8443'}`;
const CA = path.join(ROOT, 'certs', 'orbit-root-ca.crt');
const user = { u: env.CLIENT_OFFICE_USER, p: env.CLIENT_OFFICE_PASSWORD };
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

const dav = (method, p) => execFileSync('curl', ['-sS', '--cacert', CA, '-K', '-', '-X', method, '-o', '/dev/null', '-w', '%{http_code}', `https://localhost:${env.HTTPS_PORT || '8443'}${p}`], { input: `user = "${user.u}:${user.p}"\n` }).toString();
const DEMO = 'My-Notes.txt';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-phone-'));
fs.writeFileSync(path.join(tmp, DEMO), 'Uploaded from my Pixel 7 to ORBIT CLOUD.\n');

const b = await launch({ width: 412, height: 915, scale: 2.625, mobile: true, ua: UA, ignoreCerts: false });
const shot = (n) => b.shot(path.join(OUT, n));
const log = (...a) => console.log(...a);
const done = [];
const targets = {};
// centre (CSS px) of the first/last visible element matching a JS expression — used for the tap highlights
const center = (name, expr) => b.eval(`(() => { const el = (${expr}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`).then((c) => { targets[name] = c; return c; });
const byText = (t) => `[...document.querySelectorAll('button, [role=menuitem], a, li')].filter(x => x.offsetParent && (x.innerText || '').trim() === ${JSON.stringify(t)}).pop()`;
try {
  dav('DELETE', `/remote.php/dav/files/${user.u}/${DEMO}`); dav('DELETE', `/remote.php/dav/trashbin/${user.u}/trash`);

  // 1 · the real Chrome certificate warning (cloud's own certificate is not known to Chrome yet)
  await b.goto(`${LAN}/`, 2500);
  await b.waitFor(`!!document.getElementById('details-button')`, 20000, 'certificate warning page');
  await center('p1', `document.getElementById('details-button')`);
  await shot('p1-warning.png'); done.push('p1-warning');

  // 2 · "Advanced" expanded → shows "Proceed to … (unsafe)"
  await b.eval(`document.getElementById('details-button').click()`);
  await b.sleep(1200);
  await center('p2', `document.getElementById('proceed-link')`);
  await shot('p2-advanced.png'); done.push('p2-advanced');

  // 3 · proceed → login page
  await b.eval(`document.getElementById('proceed-link').click()`);
  await b.waitFor(`!!document.querySelector('input[name=user]')`, 40000, 'login page');
  await b.sleep(1200);
  await center('p3', `document.querySelector('input[name=user]')`);
  await shot('p3-login.png'); done.push('p3-login');

  // 4 · credentials typed (password is masked by the browser)
  await b.setValue('input[name=user]', user.u);
  await b.setValue('input[name=password]', user.p);
  await b.sleep(600);
  await center('p4', `document.querySelector('button[type=submit]')`);
  await shot('p4-login-filled.png'); done.push('p4-login-filled');

  // 5 · signed in → files
  await b.click('button[type=submit]');
  await b.waitFor(`location.pathname.startsWith('/apps/')`, 40000, 'redirect after login');
  await b.sleep(6000);   // let the dashboard settle before moving on
  await b.goto(`${LAN}/apps/files/files`, 1500);
  await b.waitFor(`document.body.innerText.includes('Welcome to ORBIT CLOUD')`, 60000, 'files list');
  await b.sleep(1500);
  await center('p5', `[...document.querySelectorAll('button')].find(x => x.offsetParent && /^new$/i.test((x.getAttribute('aria-label') || x.title || x.innerText || '').trim()))`);
  await shot('p5-files.png'); done.push('p5-files');

  // 6 · the "+" menu
  const info = await b.eval(`[...document.querySelectorAll('button')].filter(e => e.offsetParent).map(e => (e.getAttribute('aria-label') || e.title || e.innerText || '').trim()).filter(Boolean).slice(0, 25)`);
  log('visible buttons:', JSON.stringify(info));
  const opened = await b.eval(`(() => { const e = [...document.querySelectorAll('button')].find(x => x.offsetParent && /^(new|add)$/i.test((x.getAttribute('aria-label') || x.title || x.innerText || '').trim())) || [...document.querySelectorAll('.upload-picker button, [class*=upload-picker] button')].find(x => x.offsetParent); if (e) { e.click(); return true; } return false; })()`);
  log('plus menu opened:', opened);
  await b.sleep(1200);
  await center('p6', byText('Upload files'));
  await shot('p6-plus-menu.png'); done.push('p6-plus-menu');
  await b.eval(`document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'}))`);
  await b.sleep(400);

  // 7 · file added (real upload through the page's file input)
  await b.upload('input[type=file]', [path.join(tmp, DEMO)]);
  await b.waitFor(`document.body.innerText.includes(${JSON.stringify(DEMO.replace(/\.txt$/, ''))})`, 40000, 'uploaded file in list');
  await b.sleep(1500);
  await center('p7', `(() => { const row = [...document.querySelectorAll('[data-cy-files-list-row]')].find(r => r.getAttribute('data-cy-files-list-row-name') === ${JSON.stringify(DEMO)}); return row && row.querySelector('button[aria-label*="Actions" i], .action-item__menutoggle'); })()`);
  await shot('p7-added.png'); done.push('p7-added');

  // 8 · the "⋯" actions menu of that file
  const menu = await b.eval(`(async () => {
    const row = [...document.querySelectorAll('[data-cy-files-list-row]')].find(r => r.getAttribute('data-cy-files-list-row-name') === ${JSON.stringify(DEMO)});
    if (!row) return 'row-not-found';
    const btn = row.querySelector('button[aria-label*="Actions" i], .action-item__menutoggle');
    if (!btn) return 'menu-button-not-found';
    btn.click(); await new Promise(r => setTimeout(r, 900));
    return [...document.querySelectorAll('[role=menuitem], .action-button, .action-item__popper li')].map(e => (e.innerText || '').trim()).filter(Boolean).join(' | ');
  })()`);
  log('actions menu:', menu);
  await b.sleep(600);
  await center('p8_download', byText('Download'));
  await center('p8_delete', byText('Delete file'));
  await shot('p8-actions.png'); done.push('p8-actions');

  // 9 · delete → gone from the list
  const del = await b.eval(`(() => { const e = [...document.querySelectorAll('[role=menuitem], button')].filter(x => x.offsetParent && /^Delete( file)?$/i.test((x.innerText || '').trim())).pop(); if (e) { e.click(); return true; } return false; })()`);
  log('delete clicked:', del);
  await b.sleep(2000);
  await b.sleep(1500);
  if (!del) dav('DELETE', `/remote.php/dav/files/${user.u}/${DEMO}`);
  await shot('p9-deleted.png'); done.push('p9-deleted');

  // 10 · Deleted files (trash)
  await b.goto(`${LAN}/apps/files/trashbin`, 2500);
  await b.waitFor(`document.body.innerText.includes(${JSON.stringify(DEMO.replace(/\.txt$/, ''))})`, 25000, 'file in trash');
  await shot('p10-trash.png'); done.push('p10-trash');
} catch (e) {
  console.error('PHONE SHOT FAILED:', e.message);
  await shot('_failed.png').catch(() => {});
  process.exitCode = 1;
} finally {
  try { dav('DELETE', `/remote.php/dav/files/${user.u}/${DEMO}`); dav('DELETE', `/remote.php/dav/trashbin/${user.u}/trash`); } catch {}
  await b.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.writeFileSync(path.join(OUT, 'targets.json'), JSON.stringify({ lanIp, ...targets }, null, 2));
  log('captured:', done.join(', '));
}
async function key_enter(br) { await br.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); }
