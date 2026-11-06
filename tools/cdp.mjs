// Minimal Chrome DevTools Protocol driver — no dependencies (Node 22+ has fetch + WebSocket).
// Used by screenshots.mjs to drive the real ORBIT CLOUD web UI in headless Chrome.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ width = 1440, height = 900, scale = 1, mobile = false, ua = '', ignoreCerts = true } = {}) {
  if (!fs.existsSync(CHROME)) throw new Error(`Google Chrome not found at ${CHROME}`);
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit-chrome-'));
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    ...(ignoreCerts ? ['--ignore-certificate-errors'] : []),   // the cloud uses its own private CA
    '--hide-scrollbars', '--no-first-run', '--disable-gpu', '--mute-audio',
    `--window-size=${width},${height}`, 'about:blank',
  ], { stdio: 'ignore' });

  let targets;
  for (let i = 0; i < 60; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (targets.length) break; } catch {}
    await sleep(250);
  }
  const page = targets?.find((t) => t.type === 'page');
  if (!page) { proc.kill(); throw new Error('Chrome did not start'); }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id);
      m.error ? rej(new Error(`${m.error.message}`)) : res(m.result);
    } else if (m.method) listeners.forEach((l) => l(m));
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params }));
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  if (ua) await send('Emulation.setUserAgentOverride', { userAgent: ua });

  const api = {
    send,
    onEvent: (fn) => listeners.push(fn),
    async viewport(w, h, { mobile = false, scale = 1 } = {}) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile });
    },
    async goto(url, settle = 1200) {
      const loaded = new Promise((r) => { const l = (m) => { if (m.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(l), 1); r(); } }; listeners.push(l); setTimeout(r, 30000); });
      await send('Page.navigate', { url }); await loaded; await sleep(settle);
    },
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async waitFor(expression, timeout = 20000, label = expression) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) { try { if (await api.eval(expression)) return true; } catch {} await sleep(250); }
      throw new Error(`Timed out waiting for: ${label}`);
    },
    async click(selector) {
      await api.waitFor(`!!document.querySelector(${JSON.stringify(selector)})`, 15000, `selector ${selector}`);
      await api.eval(`document.querySelector(${JSON.stringify(selector)}).click()`);
    },
    async clickText(text, scopeSelector = 'body', tags = 'button, a, [role=menuitem], [role=button], li') {
      await api.waitFor(`[...document.querySelectorAll(${JSON.stringify(scopeSelector + ' ' )} + ${JSON.stringify(tags)})].some(e => e.innerText && e.innerText.trim() === ${JSON.stringify(text)})`, 15000, `text "${text}"`).catch(() => {});
      return api.eval(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(tags)})].find(e => e.innerText && e.innerText.trim() === ${JSON.stringify(text)}); if (e) { e.click(); return true; } return false; })()`);
    },
    async setValue(selector, value) {
      await api.waitFor(`!!document.querySelector(${JSON.stringify(selector)})`, 15000, `selector ${selector}`);
      await api.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    },
    async upload(selector, files) {
      const { root } = await send('DOM.getDocument', { depth: -1 });
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector });
      if (!nodeId) throw new Error(`file input not found: ${selector}`);
      await send('DOM.setFileInputFiles', { files, nodeId });
    },
    async shot(file, { fullPage = false } = {}) {
      let clip;
      if (fullPage) {
        const m = await send('Page.getLayoutMetrics');
        const s = m.cssContentSize || m.contentSize; clip = { x: 0, y: 0, width: s.width, height: s.height, scale: 1 };
      }
      const { data } = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip, captureBeyondViewport: true } : {}) });
      fs.writeFileSync(file, Buffer.from(data, 'base64')); return file;
    },
    async clearSession() { await send('Network.enable'); await send('Network.clearBrowserCookies'); await send('Network.clearBrowserCache'); },
    sleep,
    async close() { try { ws.close(); } catch {} proc.kill('SIGKILL'); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} },
  };
  return api;
}
