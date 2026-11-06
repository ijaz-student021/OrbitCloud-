// Builds the explainer video  Video/ORBIT_CLOUD_Pixel7_Guide.mp4
//   node tools/video/phone_shots.mjs     # once: real phone-sized screens (cloud must be running)
//   node tools/video/build_video.mjs     # slides + narration (macOS `say`) + encoding (ffmpeg)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from '../cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PH = path.join(ROOT, 'docs', 'phone');
const WORK = path.join(ROOT, 'docs', 'video-work');
const OUT_DIR = path.join(ROOT, 'Video');
const OUT = path.join(OUT_DIR, 'ORBIT_CLOUD_Pixel7_Guide.mp4');
const VOICE = process.env.ORBIT_VOICE || 'Rishi';
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const T = JSON.parse(fs.readFileSync(path.join(PH, 'targets.json'), 'utf8'));
const IP = T.lanIp;
const ADDR = `https://${IP}:8443`;
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const urlsOut = stripAnsi(execFileSync('./orbit', ['urls'], { cwd: ROOT }).toString()).split('\n').filter((l) => !/Logins:|browser warns/.test(l)).join('\n').trim();
const spokenIp = IP.split('.').join(' dot ');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── storyboard ──────────────────────────────────────────────────────────────
const MAC = ['STEP 1 · ON THE MAC', '#3B3FD8'], PHONE = ['ON THE PIXEL 7', '#0B8F7F'], ACT = ['TRY THE 4 ACTIONS', '#0B8F7F'], OPT = ['OPTIONAL', '#B45309'], WARN = ['IF IT DOES NOT OPEN', '#C62828'];
const S = [
  { chip: ['PHONE GUIDE', '#3B3FD8'], title: 'Open ORBIT CLOUD on your Google Pixel 7', en: ['A short step-by-step guide.', 'All phone screens are real, in Pixel 7 size.'], ur: 'Pixel 7 par ORBIT CLOUD kaise kholein — step by step',
    say: 'Welcome. This short video shows, step by step, how to open ORBIT CLOUD on your Google Pixel 7.', v: { t: 'phone', img: 'p5-files.png' } },
  { chip: ['BEFORE YOU START', '#3B3FD8'], title: 'Check these 3 things', en: [], ur: 'Pehle yeh 3 cheezein check karein: dono ek hi Wi-Fi par hon, Mac chalu ho, Docker khula ho',
    say: 'Before you start, check three things. One. Your phone and your Mac must be on the same Wi-Fi. Two. Your Mac must be awake. Three. Docker Desktop must be open on the Mac.',
    v: { t: 'cards', items: [['📶', 'Phone and Mac on the SAME Wi-Fi'], ['💻', 'Mac is awake (not sleeping)'], ['🐳', 'Docker Desktop is open on the Mac']] } },
  { chip: MAC, title: 'Find the address', en: ['Open Terminal on the Mac.', 'First go to the folder:  cd ~/Desktop/Assignment3_ICC', 'Then run:  ./orbit urls', 'Look at the “home / office” line.'], ur: "Terminal kholein. Pehle folder mein jayen: cd ~/Desktop/Assignment3_ICC — phir ./orbit urls likhein. 'home / office' wali line ka address yaad rakhein.",
    say: `Step one. On your Mac, open Terminal. First go to the project folder. Type: c d, space, tilde, slash, Desktop, slash, Assignment 3 I C C, and press Enter. Every orbit command must be run inside this folder. Then run: dot slash orbit space urls. Find the line called home slash office. That is the address you will type on the phone. Today it is H T T P S colon slash slash ${spokenIp}, colon 8443.`,
    v: { t: 'terminal' } },
  { chip: PHONE, title: 'Open Chrome and type the address', en: ['Type the address from Step 1.', 'Chrome shows a warning. This is normal!', 'The cloud uses its own security certificate.'], ur: 'Chrome kholein aur woh address likhein. Warning aaye to ghabrayen nahi — yeh normal hai.',
    say: 'Step two. On the Pixel, open Chrome and type that address. Chrome shows a warning: Your connection is not private. Do not worry. This is normal, because ORBIT CLOUD uses its own security certificate.', v: { t: 'phone', img: 'p1-warning.png', warn: true } },
  { chip: PHONE, title: 'Tap “Advanced”', en: ['At the bottom of the screen.'], ur: "Neeche 'Advanced' par tap karein", say: 'Tap Advanced.', v: { t: 'phone', img: 'p1-warning.png', warn: true, ring: T.p1 } },
  { chip: PHONE, title: 'Tap “Proceed to … (unsafe)”', en: ['You only do this once.', 'The traffic is still encrypted.'], ur: "Phir 'Proceed to ... (unsafe)' par tap karein — sirf ek baar",
    say: 'Then tap: Proceed to the address, unsafe. You only need to do this once. The traffic is still encrypted.', v: { t: 'phone', img: 'p2-advanced.png', warn: true, ring: T.p2 } },
  { chip: ['STEP 3 · LOG IN', '#0B8F7F'], title: 'Type your user name', en: ['User name:  office   (or  home)', 'Password: on the Mac, inside the same folder, run  ./orbit credentials'], ur: 'Username: office ya home. Password: Mac par (usi folder mein) ./orbit credentials chalayen.',
    say: 'Step three. Log in. The user name is office, or home. For the password, run dot slash orbit space credentials on the Mac, and type the password for that user.', v: { t: 'phone', img: 'p3-login.png', warn: true, ring: T.p3 } },
  { chip: ['STEP 3 · LOG IN', '#0B8F7F'], title: 'Tap “Log in”', en: [], ur: "'Log in' dabayen", say: 'Then tap Log in.', v: { t: 'phone', img: 'p4-login-filled.png', warn: true, ring: T.p4 } },
  { chip: ['YOU ARE IN', '#0B8F7F'], title: 'This is your cloud storage', en: ['Your own files, on your phone.', 'Now the 4 actions:  ADD · UPDATE · DOWNLOAD · DELETE'], ur: 'Aap login ho gaye. Ab 4 kaam try karein: ADD, UPDATE, DOWNLOAD, DELETE',
    say: 'You are in! This is your own cloud storage, on your phone. Now let us try the four actions: add, update, download and delete.', v: { t: 'phone', img: 'p5-files.png', warn: true } },
  { chip: ['ACTION 1 · ADD', '#0B8F7F'], title: 'Tap the + button', en: ['Bottom right corner.'], ur: 'ADD: neeche right mein + button dabayen', say: 'Add. Tap the plus button, at the bottom right.', v: { t: 'phone', img: 'p5-files.png', warn: true, ring: T.p5 } },
  { chip: ['ACTION 1 · ADD', '#0B8F7F'], title: 'Tap “Upload files”', en: ['Then choose a file from your phone.'], ur: "'Upload files' dabayen aur phone se file chunein", say: 'Then tap Upload files, and choose a file from your phone.', v: { t: 'phone', img: 'p6-plus-menu.png', warn: true, ring: T.p6 } },
  { chip: ['ACTION 1 · ADD  ✔', '#0B8F7F'], title: 'The file is in the cloud', en: ['It appears in the list at once.', 'Now stored safely in ORBIT CLOUD.'], ur: 'File list mein aa gayi — yeh ADD hai', say: 'The file appears in the list. That is add. It is now stored in your cloud.', v: { t: 'phone', img: 'p7-added.png', warn: true } },
  { chip: ['ACTIONS 2–4', '#0B8F7F'], title: 'Tap the ⋯ (three dots)', en: ['Next to the file name.'], ur: 'File ke saath ⋯ (teen dots) dabayen', say: 'Now tap the three dots next to the file.', v: { t: 'phone', img: 'p7-added.png', warn: true, ring: T.p7 } },
  { chip: ['UPDATE · DOWNLOAD · DELETE', '#0B8F7F'], title: 'Choose what to do', en: ['Download → saves the file on the phone', 'Update → upload the same file name again; Details → Versions shows the old copy', 'Delete file → moves it to the trash'], ur: 'Download: file phone mein. Update: wahi naam dobara upload karein; Details → Versions mein purani copy. Delete file: trash mein.',
    say: 'Tap Download to save the file on your phone. To update a file, upload a file with the same name. Then open Details, and Versions, to see the older copy. Or tap Delete file.', v: { t: 'phone', img: 'p8-actions.png', warn: true, ring: T.p8_download } },
  { chip: ['ACTION 4 · DELETE  ✔', '#0B8F7F'], title: 'Deleted', en: ['The file disappears from the list.', 'Look at the message at the bottom: “Delete file: done”.'], ur: 'File list se hat gayi — yeh DELETE hai', say: 'After delete, the file disappears from the list.', v: { t: 'phone', img: 'p9-deleted.png', warn: true } },
  { chip: ['ACTION 4 · DELETE  ✔', '#0B8F7F'], title: '… but it is not lost', en: ['It waits in “Deleted files”.', 'You can restore it any time.'], ur: "Delete ki hui file 'Deleted files' mein hoti hai — wapas restore ho sakti hai", say: 'It is not lost. It waits in Deleted files, and you can restore it at any time.', v: { t: 'phone', img: 'p10-trash.png', warn: true } },
  { chip: OPT, title: 'Remove the warning for good', en: [], ur: 'Warning hamesha ke liye hatani ho to: Mac par ./orbit share-ca chalayen, phone par address kholein, phir certificate install karein.',
    say: 'Optional. To remove the warning for good: on the Mac run dot slash orbit space share dash C A. Open the address it prints on the phone. Then go to Settings, Security and privacy, More security and privacy, Encryption and credentials, Install a certificate, C A certificate, and choose the downloaded file.',
    v: { t: 'steps', items: ['On the Mac run:  ./orbit share-ca', `On the phone open the address it prints (http://${IP}:8765/…)`, 'Settings → Security & privacy → More security & privacy', 'Encryption & credentials → Install a certificate → CA certificate', 'Install anyway → choose the downloaded file'], color: '#B45309' } },
  { chip: WARN, title: 'Phone cannot reach the Mac?', en: [], ur: 'Phone connect na ho to: Pixel ka hotspot on karein, Mac ko us se connect karein, ./orbit up phir ./orbit urls chalayen, naya address phone par kholein.',
    say: 'If the phone cannot open the address, the Wi-Fi may block devices. Turn on the hotspot on your Pixel, connect the Mac to it, run dot slash orbit space up, then orbit urls, and open the new address on the phone.',
    v: { t: 'steps', items: ['Some Wi-Fi networks block device-to-device traffic', 'Pixel: Settings → Network & internet → Hotspot & tethering → ON', 'Connect the Mac to the Pixel hotspot', 'On the Mac run:  ./orbit up   then   ./orbit urls', 'Open the new address on the phone'], color: '#C62828' } },
  { chip: ['DONE', '#3B3FD8'], title: 'That’s it!', en: ['ORBIT CLOUD works on your phone.', 'Good luck with your viva.'], ur: 'Bas! Viva ke liye best of luck', say: 'That is it. ORBIT CLOUD now works on your phone. Good luck with your viva.', v: { t: 'phone', img: 'p5-files.png', warn: true } },
];

// ── HTML for one slide ──────────────────────────────────────────────────────
const SC = 0.88;                                  // phone screen scale (412x915 → 363x805)
const imgUrl = (n) => pathToFileURL(path.join(PH, n)).href;
function visualHtml(s, phase) {
  const v = s.v;
  if (v.t === 'phone') {
    const ring = v.ring ? (() => {
      const R = phase ? 44 : 31; const x = v.ring.x * SC, y = v.ring.y * SC;
      // keep the label on screen and off the thing being tapped: beside the ring near the bottom, below it otherwise
      const low = y > 640;
      const tapTop = low ? y - 15 : y + 52;
      const tapLeft = low ? (x > 180 ? Math.max(x - R - 88, 6) : x + R + 12) : Math.min(Math.max(x - 26, 6), 363 - 74);
      return `<div class="ov"><div class="ring" style="left:${x - R}px;top:${y - R}px;width:${R * 2}px;height:${R * 2}px;opacity:${phase ? 0.55 : 1}"></div><div class="tap" style="left:${tapLeft}px;top:${tapTop}px">TAP</div></div>`;
    })() : '';
    return `<div class="phone"><div class="bar"><span class="${v.warn ? 'warn' : ''}">${v.warn ? '⚠ Not secure' : '🔒'}</span><span class="u">${esc(IP)}:8443</span></div><div class="screen"><img src="${imgUrl(v.img)}">${ring}</div></div>
      <div class="note">Real screens from ORBIT CLOUD, shown in Pixel 7 size</div>`;
  }
  if (v.t === 'terminal') {
    const shown = urlsOut.split('\n').filter((l) => /open from|this computer|home \/ office|\.local:/.test(l)).map((l) => l.replace(/\s*\(any device.*$/, ''));
    const lines = shown.map((l) => (/home \/ office/.test(l) ? `<span class="hl${phase ? ' hl2' : ''}">${esc(l)}</span>` : esc(l))).join('\n');
    return `<div class="term"><div class="dots"><i></i><i></i><i></i><span>Terminal</span></div><pre><b>~ $</b> cd ~/Desktop/Assignment3_ICC\n<b>~/Desktop/Assignment3_ICC $</b> ./orbit urls\n${lines}</pre></div>`;
  }
  if (v.t === 'cards') return `<div class="cards">${v.items.map(([e, t], i) => `<div class="card"><div class="n">${i + 1}</div><div class="e">${e}</div><div class="t">${esc(t)}</div></div>`).join('')}</div>`;
  if (v.t === 'steps') return `<div class="steps">${v.items.map((t, i) => `<div class="st" style="border-color:${v.color}"><div class="n" style="background:${v.color}">${i + 1}</div><div class="t">${esc(t)}</div></div>`).join('')}</div>`;
  return '';
}
function slideHtml(s, i, phase) {
  const prog = S.map((_, k) => `<i class="${k < i ? 'd' : k === i ? 'c' : ''}"></i>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:1920px;height:1080px;font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1B1F3B;background:linear-gradient(135deg,#F5F6FF 0%,#FFFFFF 55%,#EEF9F7 100%);position:relative;overflow:hidden}
  .brand{position:absolute;left:100px;top:56px;font-size:26px;font-weight:800;letter-spacing:1px;color:#3B3FD8}.brand span{font-weight:500;color:#5B6178;letter-spacing:0}
  .left{position:absolute;left:100px;top:110px;height:860px;width:900px;display:flex;flex-direction:column;justify-content:center}
  .chip{display:inline-block;color:#fff;font-weight:700;font-size:25px;letter-spacing:1.5px;padding:10px 22px;border-radius:30px;margin-bottom:26px}
  h1{font-size:${s.title.length > 34 ? 58 : 68}px;line-height:1.1;font-weight:800;margin-bottom:30px}
  .en p{font-size:35px;line-height:1.35;margin:0 0 10px;color:#2A2F55}
  .ur{margin-top:34px;padding:22px 28px;background:#FFF7E6;border-left:8px solid #F59E0B;border-radius:12px;font-size:31px;line-height:1.4;color:#4A3200}
  .ur small{display:block;font-size:19px;font-weight:700;letter-spacing:2px;color:#B45309;margin-bottom:6px}
  .prog{position:absolute;left:100px;bottom:52px;display:flex;gap:7px}.prog i{display:block;width:34px;height:7px;border-radius:4px;background:#D5D8E6}.prog i.d{background:#3B3FD8}.prog i.c{background:#F59E0B;width:56px}
  .right{position:absolute;left:1060px;top:0;width:800px;height:1080px}
  .phone{position:absolute;left:218px;top:70px;width:392px;background:#101322;border-radius:42px;padding:14px;box-shadow:0 30px 70px rgba(27,31,59,.35)}
  .bar{height:54px;background:#fff;border-radius:22px 22px 0 0;display:flex;align-items:center;gap:12px;padding:0 18px;font-size:19px}
  .bar .warn{color:#C62828;font-weight:700}.bar .u{color:#1B1F3B}
  .screen{position:relative;width:363px;height:805px;background:#fff;border-radius:0 0 26px 26px}.screen img{width:363px;height:805px;object-fit:cover;object-position:top;display:block;border-radius:0 0 26px 26px}.ov{position:absolute;left:0;top:0;width:363px;height:805px;overflow:visible}
  .ring{position:absolute;border:7px solid #FF3B30;border-radius:50%;background:rgba(255,59,48,.18);box-shadow:0 0 0 4px rgba(255,255,255,.7)}
  .tap{position:absolute;background:#FF3B30;color:#fff;font-weight:800;font-size:20px;padding:5px 14px;border-radius:18px;letter-spacing:1px}
  .note{position:absolute;left:150px;top:985px;width:520px;text-align:center;font-size:18px;color:#5B6178}
  .term{position:absolute;left:-10px;top:230px;width:820px;background:#12142A;border-radius:18px;box-shadow:0 30px 70px rgba(27,31,59,.35);overflow:hidden}
  .dots{background:#2A2D4A;padding:14px 18px;display:flex;align-items:center;gap:9px;color:#C9CDE0;font-size:19px}.dots i{width:15px;height:15px;border-radius:50%;background:#FF5F56}.dots i:nth-child(2){background:#FFBD2E}.dots i:nth-child(3){background:#27C93F}.dots span{margin-left:14px}
  .term pre{padding:26px 24px 34px;font:22px/1.7 Menlo,Consolas,monospace;color:#E6E8FF;white-space:pre}.term b{color:#7EE787}
  .hl{background:#FFE066;color:#12142A;font-weight:700;padding:3px 6px;border-radius:5px;box-shadow:0 0 0 3px #F59E0B}.hl2{box-shadow:0 0 0 7px rgba(245,158,11,.55)}
  .cards{position:absolute;left:30px;top:170px;width:740px}.card{display:flex;align-items:center;gap:26px;background:#fff;border:3px solid #D5D8E6;border-radius:22px;padding:30px 34px;margin-bottom:28px;box-shadow:0 12px 30px rgba(27,31,59,.1)}
  .card .n{width:54px;height:54px;border-radius:50%;background:#3B3FD8;color:#fff;font-weight:800;font-size:30px;display:flex;align-items:center;justify-content:center}.card .e{font-size:64px}.card .t{font-size:34px;font-weight:700;line-height:1.25}
  .steps{position:absolute;left:20px;top:120px;width:760px}.st{display:flex;align-items:center;gap:22px;background:#fff;border:3px solid;border-radius:18px;padding:20px 26px;margin-bottom:20px;box-shadow:0 10px 26px rgba(27,31,59,.09)}
  .st .n{flex:none;width:46px;height:46px;border-radius:50%;color:#fff;font-weight:800;font-size:26px;display:flex;align-items:center;justify-content:center}.st .t{font-size:28px;line-height:1.3;font-weight:600}
  </style></head><body>
  <div class="brand">ORBIT CLOUD <span>· Phone guide</span></div>
  <div class="left"><div class="chip" style="background:${s.chip[1]}">${esc(s.chip[0])}</div><h1>${esc(s.title)}</h1>
    <div class="en">${s.en.map((l) => `<p>${esc(l)}</p>`).join('')}</div>
    <div class="ur"><small>ROMAN URDU</small>${esc(s.ur)}</div></div>
  <div class="right">${visualHtml(s, phase)}</div>
  <div class="prog">${prog}</div></body></html>`;
}

// ── 1. slides → PNG (two phases for pulsing highlights) ─────────────────────
const b = await launch({ width: 1920, height: 1080 });
const frames = [];                                       // per scene: [png paths]
try {
  for (let i = 0; i < S.length; i++) {
    const needsPulse = !!(S[i].v.ring || S[i].v.t === 'terminal');
    const phases = needsPulse ? [0, 1] : [0];
    const files = [];
    for (const ph of phases) {
      const f = path.join(WORK, `slide${String(i + 1).padStart(2, '0')}_${ph}.html`);
      fs.writeFileSync(f, slideHtml(S[i], i, ph));
      await b.goto(pathToFileURL(f).href, 600);
      const png = f.replace('.html', '.png');
      await b.shot(png);
      files.push(png);
    }
    frames.push(files);
    process.stdout.write(`slide ${i + 1}/${S.length}  `);
  }
} finally { await b.close(); }
console.log('\nslides rendered');

// ── 2. narration (macOS speech) → padded WAV per slide ──────────────────────
const durOf = (f) => parseFloat(/estimated duration:\s*([\d.]+)/.exec(execFileSync('afinfo', [f]).toString())[1]);
const wavs = []; const dur = [];
for (let i = 0; i < S.length; i++) {
  const n = String(i + 1).padStart(2, '0');
  const aiff = path.join(WORK, `n${n}.aiff`);
  execFileSync('say', ['-v', VOICE, '-r', '150', '-o', aiff, '--', S[i].say]);
  const D = Math.max(4.5, durOf(aiff) + 0.7 + 1.1);          // lead-in + speech + pause
  const wav = path.join(WORK, `s${n}.wav`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiff, '-af', `adelay=700|700,apad=whole_dur=${D.toFixed(3)}`, '-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
  wavs.push(wav); dur.push(D);
}
fs.writeFileSync(path.join(WORK, 'audio.txt'), wavs.map((w) => `file '${w}'`).join('\n'));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(WORK, 'audio.txt'), '-c', 'copy', path.join(WORK, 'narration.wav')]);

// ── 3. frame list (pulse = alternate the two phases every 0.5 s) ────────────
const lines = [];
frames.forEach((files, i) => {
  let t = 0, k = 0;
  while (t < dur[i] - 1e-6) {
    const d = Math.min(files.length > 1 ? 0.5 : dur[i], dur[i] - t);
    lines.push(`file '${files[k % files.length]}'`, `duration ${d.toFixed(3)}`);
    t += d; k += 1;
  }
});
lines.push(`file '${frames[frames.length - 1][0]}'`);
fs.writeFileSync(path.join(WORK, 'frames.txt'), lines.join('\n'));

// ── 4. encode ───────────────────────────────────────────────────────────────
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(WORK, 'frames.txt'), '-i', path.join(WORK, 'narration.wav'),
  '-vf', 'fps=30,scale=1920:1080,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-shortest', OUT], { stdio: 'inherit' });
const total = dur.reduce((a, c) => a + c, 0);
console.log(`video written: ${OUT}  (${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')}, ${S.length} scenes, voice ${VOICE})`);
