// Builds Assignment3_ICC_Report.docx and .pdf from one content source (report_content.mjs).
//   node tools/make_report.mjs
// Facts (versions, test output, screenshots) are read from what the live cloud produced.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as D from 'docx';
import { buildReport } from './report_content.mjs';
import { launch } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (...p) => path.join(ROOT, ...p);
const BRAND = '3B3FD8', BRAND_L = 'ECEDFF', INK = '1B1F3B', MUTED = '5B6178', LINE = 'C9CDE0';

// ── gather facts ─────────────────────────────────────────────────────────────
function readEnv() {
  const out = {};
  if (!fs.existsSync(rel('.env'))) return out;
  for (const l of fs.readFileSync(rel('.env'), 'utf8').split('\n')) {
    const m = l.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (m && !/PASSWORD/.test(m[1])) out[m[1]] = m[2];          // never read secrets into the report
  }
  return out;
}
const env = readEnv();
const maybe = (f) => (fs.existsSync(f) ? f : null);
const factsFile = rel('docs', 'facts.json');
const extra = fs.existsSync(factsFile) ? JSON.parse(fs.readFileSync(factsFile, 'utf8')) : {};
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const testOutput = fs.existsSync(rel('docs', 'test-results.txt')) ? stripAnsi(fs.readFileSync(rel('docs', 'test-results.txt'), 'utf8')).trim() : '';
const rm = testOutput.match(/Result:\s*(\d+) passed,\s*(\d+) failed/);
const testSummary = rm ? `${rm[1]} checks passed, ${rm[2]} failed` : 'test results not available';
const shot = (n) => maybe(rel('docs', 'screenshots', n));

const facts = {
  studentName: extra.studentName || '', regNo: extra.regNo || '', enrolment: extra.enrolment || '', groupNo: extra.groupNo || '', instructor: extra.instructor || '',
  cloudName: env.CLOUD_NAME || 'ORBIT CLOUD',
  slogan: env.CLOUD_SLOGAN || 'Your files. Your cloud. Anywhere.',
  ncVersion: extra.ncVersion || '34',
  adminUser: env.ADMIN_USER || 'orbitadmin',
  homeUser: env.CLIENT_HOME_USER || 'home',
  officeUser: env.CLIENT_OFFICE_USER || 'office',
  lanUrl: extra.lanUrl || '',
  lanHost: extra.lanHost || '',
  date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  testDate: extra.testDate || '',
  testOutput, testSummary,
  backupLine: extra.backupLine || '`./orbit backup` creates a consistent copy (database dump, files, SHA-256 checksums); `./orbit restore` verifies and restores it.',
  shots: {
    login: shot('01-login.png'), files_home: shot('02-files-home.png'), upload: shot('03-upload-add.png'),
    versions: shot('04-versions.png'), trash: shot('05-trash.png'), office_lan: shot('06-office-lan.png'),
    mobile: shot('07-mobile.png'), office_mobile: shot('09-office-and-mobile.png'), admin_users: shot('08-admin-users.png'),
  },
  diagrams: { architecture: rel('docs', 'architecture.png'), sequence: rel('docs', 'request-flow.png') },
};
const blocks = buildReport(facts);

// ── helpers ──────────────────────────────────────────────────────────────────
function inline(text) {
  const out = [];
  for (const part of text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)) {
    if (!part) continue;
    if (part.startsWith('**')) out.push({ text: part.slice(2, -2), bold: true });
    else if (part.startsWith('`')) out.push({ text: part.slice(1, -1), code: true });
    else out.push({ text: part });
  }
  return out;
}
const pngSize = (f) => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const CM = 37.795;   // CSS px per cm

// split blocks into sections at {t:'section'} markers (first section is portrait)
function sections(bl) {
  const secs = [{ o: 'portrait', blocks: [] }];
  for (const b of bl) {
    if (b.t === 'section') secs.push({ o: b.o, blocks: [] });
    else secs[secs.length - 1].blocks.push(b);
  }
  return secs.filter((s) => s.blocks.length);
}
const SECS = sections(blocks);

// ═════════════════════════════════════════════════════════════════════════════
// HTML → PDF
// ═════════════════════════════════════════════════════════════════════════════
function htmlInline(text) {
  return inline(text).map((r) => r.bold ? `<b>${esc(r.text)}</b>` : r.code ? `<code>${esc(r.text)}</code>` : esc(r.text)).join('');
}
function htmlBlock(b) {
  switch (b.t) {
    case 'cover': return `
      <div class="cover">
        <div class="cover-band"></div>
        <div class="cover-course">${esc(b.course)}</div>
        <div class="cover-title">${esc(b.title)}</div>
        <div class="cover-cloud">${esc(b.cloud)}</div>
        <div class="cover-slogan">${esc(b.slogan)}</div>
        <table class="fields">
          <tr><td>Student Name</td><td class="filled">${esc(b.student || '')}</td></tr>
          <tr><td>Reg No.</td><td class="filled">${esc(b.regNo || '')}</td></tr>
          <tr><td>Enrolment #</td><td class="filled">${esc(b.enrolment || '')}</td></tr>
          <tr><td>Group</td><td class="filled">${esc(b.groupNo || '')}</td></tr>
          <tr><td>Instructor</td><td class="filled">${esc(b.instructor || '')}</td></tr>
          <tr><td>Date</td><td class="filled">${esc(b.date)}</td></tr>
        </table>
        <div class="cover-q">Question 1 · Tool selection &nbsp;|&nbsp; Question 2 · Own cloud &nbsp;|&nbsp; Question 3 · Diagram</div>
      </div>`;
    case 'h1': return `<h1>${htmlInline(b.text)}</h1>`;
    case 'h2': return `<h2>${htmlInline(b.text)}</h2>`;
    case 'p': return `<p>${htmlInline(b.text)}</p>`;
    case 'ul': return `<ul>${b.items.map((i) => `<li>${htmlInline(i)}</li>`).join('')}</ul>`;
    case 'ol': return `<ol>${b.items.map((i) => `<li>${htmlInline(i)}</li>`).join('')}</ol>`;
    case 'code': return `<pre>${esc(b.text)}</pre>`;
    case 'callout': return `<div class="callout">${htmlInline(b.text)}</div>`;
    case 'pagebreak': return '<div class="pb"></div>';
    case 'table': return `<table class="grid"><colgroup>${b.widths.map((w) => `<col style="width:${w}%">`).join('')}</colgroup><thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c, i) => `<td${b.firstColBold && i === 0 ? ' class="b"' : ''}>${htmlInline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    case 'img': {
      const svg = b.file.replace(/\.png$/, '.svg');
      const file = pathToFileURL(b.maxWcm && fs.existsSync(svg) ? svg : b.file).href;
      const style = b.maxWcm ? `max-width:${b.maxWcm}cm;max-height:${b.maxHcm}cm;` : `width:${b.widthPct || 100}%;max-height:11.5cm;object-fit:contain;`;
      return `<figure><img src="${file}" style="${style}"><figcaption>${esc(b.caption)}</figcaption></figure>`;
    }
    default: return '';
  }
}
const CSS = `
  @page { size: A4; margin: 18mm 18mm 20mm 18mm; }
  @page land { size: A4 landscape; margin: 8mm 10mm 13mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.42; color: #${INK}; margin: 0; }
  .sec-landscape { page: land; break-before: page; }
  .sec-landscape h1 { font-size: 15pt; margin: 0 0 4px; padding-bottom: 3px; }
  .sec-landscape h2 { font-size: 11pt; margin: 6px 0 4px; }
  .sec-landscape figure { margin: 4px 0 0; }
  .sec-portrait.later { break-before: page; }
  h1 { font-size: 19pt; color: #${BRAND}; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 2px solid #${BRAND}; break-after: avoid; }
  h2 { font-size: 12.5pt; margin: 18px 0 6px; color: #${INK}; break-after: avoid; }
  p { margin: 6px 0; }
  ul, ol { margin: 6px 0 8px; padding-left: 22px; } li { margin: 2px 0; }
  code { font-family: Menlo, Consolas, monospace; font-size: 9pt; background: #F1F2F8; padding: 1px 4px; border-radius: 3px; }
  pre { font-family: Menlo, Consolas, monospace; font-size: 7.3pt; line-height: 1.22; background: #F5F6FA; border: 1px solid #${LINE}; border-left: 4px solid #${BRAND}; border-radius: 4px; padding: 9px 11px; white-space: pre-wrap; margin: 8px 0; }
  table.grid { border-collapse: collapse; width: 100%; margin: 7px 0 9px; font-size: 9pt; }
  table.grid th { background: #${BRAND}; color: #fff; text-align: left; padding: 6px 8px; font-weight: 600; }
  table.grid td { border: 1px solid #${LINE}; padding: 4px 8px; vertical-align: top; }
  table.grid tr:nth-child(even) td { background: #F8F8FC; }
  table.grid td.b { font-weight: 600; }
  tr { break-inside: avoid; }
  .callout { background: #${BRAND_L}; border-left: 4px solid #${BRAND}; padding: 8px 12px; margin: 10px 0; border-radius: 4px; font-size: 9.6pt; }
  figure { margin: 10px 0 12px; text-align: center; break-inside: avoid; }
  figure img { border: 1px solid #${LINE}; border-radius: 4px; }
  figcaption { font-size: 8.8pt; color: #${MUTED}; margin-top: 4px; font-style: italic; }
  .pb { break-after: page; }
  /* cover */
  .cover { min-height: 245mm; display: flex; flex-direction: column; justify-content: center; position: relative; padding: 0 6mm; }
  .cover-band { position: absolute; left: -18mm; right: -18mm; top: -18mm; height: 14mm; background: #${BRAND}; }
  .cover-course { font-size: 13pt; letter-spacing: 3px; text-transform: uppercase; color: #${MUTED}; font-weight: 600; }
  .cover-title { font-size: 28pt; font-weight: 800; margin: 6px 0 26px; }
  .cover-cloud { font-size: 46pt; font-weight: 900; color: #${BRAND}; letter-spacing: 1px; line-height: 1.05; }
  .cover-slogan { font-size: 14pt; color: #${MUTED}; margin: 8px 0 38px; font-style: italic; }
  table.fields { border-collapse: collapse; width: 100%; font-size: 11.5pt; margin-bottom: 30px; }
  table.fields td { padding: 11px 8px 4px 0; vertical-align: bottom; }
  table.fields td:first-child { width: 34%; font-weight: 600; }
  table.fields td.blank { border-bottom: 1.2px solid #8A90B0; }
  table.fields td.filled { border-bottom: 1.2px solid #8A90B0; }
  .cover-q { font-size: 9.5pt; color: #${MUTED}; border-top: 1px solid #${LINE}; padding-top: 10px; }
`;
async function renderPdf() {
  const body = SECS.map((s, i) => `<section class="sec-${s.o}${i ? ' later' : ''}">${s.blocks.map(htmlBlock).join('\n')}</section>`).join('\n');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(facts.cloudName)} — Assignment No-3</title><style>${CSS}</style></head><body>${body}</body></html>`;
  const htmlFile = rel('docs', 'report.html');
  fs.writeFileSync(htmlFile, html);
  const b = await launch({ width: 1000, height: 1400 });
  try {
    await b.goto(pathToFileURL(htmlFile).href, 1500);
    const footer = `<div style="font-family:Helvetica,Arial;font-size:8px;color:#5B6178;width:100%;padding:0 14mm;display:flex;justify-content:space-between"><span>${esc(facts.cloudName)} — Assignment No-3 (OWN CLOUD)</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
    const r = await b.send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer });
    fs.writeFileSync(rel('Assignment3_ICC_Report.pdf'), Buffer.from(r.data, 'base64'));
  } finally { await b.close(); }
  fs.rmSync(htmlFile, { force: true });
}

// ═════════════════════════════════════════════════════════════════════════════
// DOCX
// ═════════════════════════════════════════════════════════════════════════════
const A4 = { w: 11906, h: 16838 };
const MARGIN_P = 1134;                       // 2 cm
const MARGIN_L = 680;                        // 1.2 cm
const widthDxa = (o) => (o === 'portrait' ? A4.w - 2 * MARGIN_P : A4.h - 2 * MARGIN_L);
const border = (color = LINE, size = 4, space) => ({ style: D.BorderStyle.SINGLE, size, color, ...(space ? { space } : {}) });
const allBorders = (c) => ({ top: border(c), bottom: border(c), left: border(c), right: border(c) });
let listN = 0;
const numConfigs = [{
  reference: 'bullets',
  levels: [{ level: 0, format: D.LevelFormat.BULLET, text: '•', alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }],
}];

function runs(text, base = {}) {
  return inline(text).map((r) => new D.TextRun({ text: r.text, bold: r.bold || base.bold, font: r.code ? 'Courier New' : undefined, size: r.code ? 18 : base.size, color: base.color, shading: r.code ? { type: D.ShadingType.CLEAR, fill: 'F1F2F8', color: 'auto' } : undefined, italics: base.italics }));
}
const para = (text, o = {}) => new D.Paragraph({ children: runs(text, o), spacing: { before: 60, after: 100, line: 300 }, ...o.p });

function docxBlocks(sec) {
  const W = widthDxa(sec.o);
  const out = [];
  let breakNext = false;
  for (const b of sec.blocks) {
    switch (b.t) {
      case 'cover': {
        const noB = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        const row = (label, value) => new D.TableRow({ children: [
          new D.TableCell({ width: { size: 3200, type: D.WidthType.DXA }, borders: { top: noB, left: noB, right: noB, bottom: noB }, margins: { top: 160, bottom: 40, left: 0, right: 80 }, children: [new D.Paragraph({ children: [new D.TextRun({ text: label, bold: true, size: 24 })] })] }),
          new D.TableCell({ width: { size: W - 3200, type: D.WidthType.DXA }, borders: { top: noB, left: noB, right: noB, bottom: border('8A90B0', 8) }, margins: { top: 160, bottom: 40, left: 80, right: 80 }, children: [new D.Paragraph({ border: { bottom: border('8A90B0', 8, 2) }, children: [new D.TextRun({ text: value || ' ', size: 24 })] })] }),
        ] });
        out.push(
          new D.Paragraph({ spacing: { before: 1800 }, children: [new D.TextRun({ text: b.course.toUpperCase(), bold: true, color: MUTED, size: 26, characterSpacing: 60 })] }),
          new D.Paragraph({ spacing: { before: 120, after: 500 }, children: [new D.TextRun({ text: b.title, bold: true, size: 56, color: INK })] }),
          new D.Paragraph({ spacing: { after: 60 }, children: [new D.TextRun({ text: b.cloud, bold: true, size: 92, color: BRAND })] }),
          new D.Paragraph({ spacing: { after: 800 }, children: [new D.TextRun({ text: b.slogan, italics: true, size: 28, color: MUTED })] }),
          new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: [3200, W - 3200], borders: { top: noB, bottom: noB, left: noB, right: noB, insideHorizontal: noB, insideVertical: noB }, rows: [row('Student Name', b.student), row('Reg No.', b.regNo), row('Enrolment #', b.enrolment), row('Group', b.groupNo), row('Instructor', b.instructor), row('Date', b.date)] }),
          new D.Paragraph({ spacing: { before: 700 }, border: { top: border(LINE, 6) }, children: [new D.TextRun({ text: 'Question 1 · Tool selection   |   Question 2 · Own cloud   |   Question 3 · Diagram', size: 19, color: MUTED })] }),
        );
        break;
      }
      case 'h1': out.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, pageBreakBefore: breakNext, children: [new D.TextRun({ text: b.text })] })); breakNext = false; break;
      case 'h2': out.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, children: [new D.TextRun({ text: b.text })] })); break;
      case 'p': out.push(para(b.text)); break;
      case 'ul': b.items.forEach((i) => out.push(new D.Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 60, line: 290 }, children: runs(i) }))); break;
      case 'ol': {
        const ref = `num${++listN}`;
        numConfigs.push({ reference: ref, levels: [{ level: 0, format: D.LevelFormat.DECIMAL, text: '%1.', alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 320 } } } }] });
        b.items.forEach((i) => out.push(new D.Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60, line: 290 }, children: runs(i) })));
        break;
      }
      case 'code': {
        const lines = b.text.split('\n');
        lines.forEach((ln, i) => out.push(new D.Paragraph({
          spacing: { before: 0, after: 0, line: 252 },
          shading: { type: D.ShadingType.CLEAR, fill: 'F5F6FA', color: 'auto' },
          border: { left: { style: D.BorderStyle.SINGLE, size: 24, color: BRAND, space: 6 } },
          indent: { left: 120 },
          keepLines: true,
          children: [new D.TextRun({ text: ln === '' ? ' ' : ln, font: 'Courier New', size: 16 })],
          spacing: { before: i === 0 ? 100 : 0, after: i === lines.length - 1 ? 140 : 0, line: 252 },
        })));
        break;
      }
      case 'callout': out.push(new D.Paragraph({ spacing: { before: 120, after: 140, line: 290 }, shading: { type: D.ShadingType.CLEAR, fill: BRAND_L, color: 'auto' }, border: { left: { style: D.BorderStyle.SINGLE, size: 24, color: BRAND, space: 8 } }, indent: { left: 160 }, children: runs(b.text, { size: 20 }) })); break;
      case 'pagebreak': breakNext = true; break;   // applied to the next heading (portable across Word / LibreOffice / viewers)
      case 'table': {
        const cols = b.widths.map((w) => Math.floor((W * w) / 100)); cols[cols.length - 1] += W - cols.reduce((a, c) => a + c, 0);
        const mk = (text, i, head) => new D.TableCell({
          width: { size: cols[i], type: D.WidthType.DXA }, borders: allBorders(head ? BRAND : LINE),
          shading: head ? { type: D.ShadingType.CLEAR, fill: BRAND, color: 'auto' } : undefined,
          margins: { top: 70, bottom: 70, left: 110, right: 110 },
          children: [new D.Paragraph({ spacing: { after: 0, line: 270 }, children: head ? [new D.TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })] : runs(text, { size: 19, bold: b.firstColBold && i === 0 }) })],
        });
        out.push(new D.Table({
          width: { size: W, type: D.WidthType.DXA }, columnWidths: cols,
          borders: { top: border(LINE), bottom: border(LINE), left: border(LINE), right: border(LINE), insideHorizontal: border(LINE), insideVertical: border(LINE) },
          rows: [new D.TableRow({ tableHeader: true, cantSplit: true, children: b.head.map((h, i) => mk(h, i, true)) }),
            ...b.rows.map((r) => new D.TableRow({ cantSplit: true, children: r.map((c, i) => mk(c, i, false)) }))],
        }), new D.Paragraph({ spacing: { after: 100 }, children: [] }));
        break;
      }
      case 'img': {
        const { w, h } = pngSize(b.file);
        let wpx, hpx;
        if (b.maxWcm) { const s = Math.min((b.maxWcm * CM) / w, (b.maxHcm * CM) / h); wpx = Math.round(w * s); hpx = Math.round(h * s); }
        else { const maxW = Math.min(((W / 1440) * 96) * ((b.widthPct || 100) / 100), 640); const s = Math.min(maxW / w, (11.5 * CM) / h); wpx = Math.round(w * s); hpx = Math.round(h * s); }
        out.push(
          new D.Paragraph({ alignment: D.AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 40 }, children: [new D.ImageRun({ type: 'png', data: fs.readFileSync(b.file), transformation: { width: wpx, height: hpx }, altText: { title: b.caption, description: b.caption, name: path.basename(b.file) } })] }),
          new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 160 }, children: [new D.TextRun({ text: b.caption, italics: true, size: 18, color: MUTED })] }),
        );
        break;
      }
    }
  }
  return out;
}

async function renderDocx() {
  const footer = (o) => new D.Footer({ children: [new D.Paragraph({
    tabStops: [{ type: D.TabStopType.RIGHT, position: widthDxa(o) }],
    border: { top: border(LINE, 4) },
    children: [new D.TextRun({ text: `${facts.cloudName} — Assignment No-3 (OWN CLOUD)`, size: 16, color: MUTED }), new D.TextRun({ children: ['\tPage ', D.PageNumber.CURRENT, ' of ', D.PageNumber.TOTAL_PAGES], size: 16, color: MUTED })],
  })] });
  const children = SECS.map((s) => ({
    properties: { page: { size: { width: A4.w, height: A4.h, orientation: s.o === 'landscape' ? D.PageOrientation.LANDSCAPE : D.PageOrientation.PORTRAIT }, margin: s.o === 'portrait' ? { top: MARGIN_P, bottom: MARGIN_P, left: MARGIN_P, right: MARGIN_P } : { top: MARGIN_L, bottom: MARGIN_L, left: MARGIN_L, right: MARGIN_L } } },
    footers: { default: footer(s.o) },
    children: docxBlocks(s),
  }));
  const doc = new D.Document({
    creator: facts.cloudName, title: `${facts.cloudName} — Assignment No-3 (OWN CLOUD)`, description: 'Cloud Computing — Assignment 3',
    styles: {
      default: { document: { run: { font: 'Calibri', size: 22, color: INK } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Calibri', size: 38, bold: true, color: BRAND }, paragraph: { spacing: { before: 200, after: 160 }, keepNext: true, outlineLevel: 0, border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: BRAND, space: 4 } } } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Calibri', size: 26, bold: true, color: INK }, paragraph: { spacing: { before: 280, after: 100 }, keepNext: true, outlineLevel: 1 } },
      ],
    },
    numbering: { config: numConfigs },
    sections: children,
  });
  fs.writeFileSync(rel('Assignment3_ICC_Report.docx'), await D.Packer.toBuffer(doc));
}

// ── run ──────────────────────────────────────────────────────────────────────
const which = process.argv[2] || 'both';
if (which === 'both' || which === 'docx') { await renderDocx(); console.log('wrote Assignment3_ICC_Report.docx'); }
if (which === 'both' || which === 'pdf') { await renderPdf(); console.log('wrote Assignment3_ICC_Report.pdf'); }
