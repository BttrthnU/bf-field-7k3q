(function () {
const IS_NODE = typeof module !== 'undefined' && module.exports;
let PDFLIB, loadTemplate;
if (IS_NODE) {
  const fs = require('node:fs'), path = require('node:path');
  PDFLIB = require('./vendor/pdf-lib.min.js');
  loadTemplate = async () => fs.readFileSync(path.join(__dirname, 'tceq-20700.pdf'));
} else {
  PDFLIB = window.PDFLib;
  loadTemplate = async () => new Uint8Array(await (await fetch('tceq-20700.pdf')).arrayBuffer());
}
const { PDFDocument, StandardFonts, rgb } = PDFLIB;
/* Stamps a field report onto the official TCEQ-20700 PDF (tceq-20700.pdf, revision 04-04-2019).
   The PDF has no fillable fields, so every position below was measured from the form itself.
   Coordinates are PDF points measured from the TOP-left of the form page; converted at draw time.
   Runs in Node (office host) and in the browser (field app, municipality view). */
const H = 792;
const INK = rgb(0.04, 0.09, 0.45);

/* checkbox glyph origin (x0, top) of each box on the printed form */
const BOX = {
  RPBA: [31.0, 152.0], 'RPBA-D': [239.2, 152.0], DCVA: [31.0, 168.0], 'DCVA-D': [239.2, 168.0], PVB: [31.0, 184.0], SVB: [239.2, 184.0],
  type2a: [539.0, 152.0], type2b: [538.7, 168.0],
  rNew: [138.8, 264.2], rExisting: [216.0, 264.2], rReplace: [327.0, 264.2],
  codesYes: [490.2, 280.2], codesNo: [533.5, 280.2], auxYes: [490.2, 296.3], auxNo: [533.5, 296.3],
  pass: [72.7, 346.6], fail: [72.4, 367.4],
  i_c1s_tight: [163.1, 400.7], i_c1s_leak: [162.7, 416.3], i_c2s_tight: [242.9, 400.7], i_c2s_leak: [242.5, 416.3],
  i_rvno: [299.5, 423.8], i_bys_tight: [393.7, 400.7], i_bys_leak: [396.1, 416.3],
  i_aino: [478.6, 400.7], i_aifullY: [437.5, 427.8], i_aifullN: [470.4, 427.8], i_cvs_leak: [558.5, 412.2],
  r_c1s_tight: [168.4, 505.7], r_c2s_tight: [248.2, 505.7], r_bys_tight: [365.8, 518.4],
  gPot: [327.2, 561.5], gNon: [483.6, 561.5],
};
/* text fields: [x, baseline-from-top, max width, font size] */
const TXT = {
  pwsName: [188, 56.6, 395, 9], pwsId: [188, 69.8, 395, 9], pwsAddr: [188, 82.9, 395, 9], pwsContact: [188, 96.1, 395, 9], svcAddr: [188, 109.2, 395, 9],
  mfrM: [146, 215.7, 64, 8], mfrB: [250, 215.7, 86, 8], sizeM: [457, 215.7, 34, 8], sizeB: [534, 215.7, 52, 8],
  modM: [146, 228.9, 64, 8], modB: [250, 228.9, 86, 8], bpaLoc: [433, 228.9, 152, 8],
  serM: [146, 242.1, 64, 8], serB: [250, 242.1, 86, 8], bpaServes: [433, 242.1, 152, 8],
  oldSer: [444, 276.0, 140, 8],
  i_date: [62, 411.0, 40, 7.5], i_time: [62, 423.6, 40, 7.5],
  i_c1: [139, 398.2, 20, 8.5], i_c2: [219, 398.2, 20, 8.5], i_rv: [313.2, 398.2, 15, 8], i_by: [370, 398.2, 20, 8.5], i_ai: [460.5, 398.2, 19, 8], i_cv: [540.5, 398.2, 25, 8.5],
  r_date: [62, 528.6, 40, 7.5], r_time: [62, 541.0, 40, 7.5],
  r_c1: [139, 503.2, 20, 8.5], r_c2: [219, 503.2, 20, 8.5], r_rv: [313.2, 503.2, 15, 8], r_by: [370, 503.2, 20, 8.5], r_ai: [460.5, 503.2, 19, 8], r_cv: [540.5, 503.2, 25, 8.5],
  gMake: [119, 587.0, 112, 8], gSN: [285, 587.0, 88, 8], gDate: [519, 587.0, 66, 8],
  coName: [138, 653.0, 286, 9], coAddr: [138, 679.4, 286, 9], coPhone: [138, 707.7, 124, 9],
  tName: [444, 653.0, 140, 9], tLic: [396, 707.7, 188, 9], tExp: [401, 720.9, 183, 9],
};
const REMARK_LINES = [[121, 608.6, 464], [40, 621.7, 546], [40, 634.8, 546]];
const REPAIR_LINES = [[135, 458.2, 448], [108, 469.4, 476]];
const REPAIR_BYPASS = [150, 485.0, 433];
const SIG_BOX = { x: 431, top: 671.5, w: 152, h: 24.5 };

const clean = s => String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?').trim();
function fmtDate(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? `${m[2]}/${m[3]}/${m[1]}` : clean(s); }
function fmtTime(s) { const m = /^(\d{1,2}):(\d{2})/.exec(s || ''); if (!m) return clean(s); let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m[2]} ${ap}`; }

function wrap(font, text, size, widths) { // greedy wrap into lines whose widths are given
  const words = clean(text).split(' ').filter(Boolean), lines = []; let cur = '', li = 0;
  const limit = () => widths[Math.min(li, widths.length - 1)];
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (font.widthOfTextAtSize(t, size) <= limit() || !cur) {
      if (font.widthOfTextAtSize(t, size) > limit() && !cur) { // single word too long: hard split
        let part = ''; for (const ch of w) { if (font.widthOfTextAtSize(part + ch, size) > limit()) { lines.push(part); li++; part = ''; } part += ch; } cur = part;
      } else cur = t;
    } else { lines.push(cur); li++; cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function fillReport(d, signaturePng) {
  const src = await PDFDocument.load(await loadTemplate());
  const pdf = await PDFDocument.create(); // keep only the form page (page 2); page 1 is the instructions
  const [page] = await pdf.copyPages(src, [1]);
  pdf.addPage(page);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const y = top => H - top;

  const text = (key, value) => {
    const spec = TXT[key]; if (!spec || value == null || value === '') return;
    let [x, base, maxW, size] = spec; const s = clean(value); if (!s) return;
    while (size > 5.5 && font.widthOfTextAtSize(s, size) > maxW) size -= 0.5; // shrink to fit
    let out = s; while (out.length > 1 && font.widthOfTextAtSize(out, size) > maxW) out = out.slice(0, -1);
    page.drawText(out, { x, y: y(base), size, font, color: INK });
  };
  const check = key => {
    const b = BOX[key]; if (!b) return;
    const cx = b[0] + 12.1 / 2 - 0.4, cy = b[1] + 6 + 2.2, r = 3.1;
    const o = { thickness: 1.5, color: INK };
    page.drawLine({ start: { x: cx - r, y: y(cy - r) }, end: { x: cx + r, y: y(cy + r) }, ...o });
    page.drawLine({ start: { x: cx - r, y: y(cy + r) }, end: { x: cx + r, y: y(cy - r) }, ...o });
  };

  // header + assembly
  ['pwsName', 'pwsId', 'pwsAddr', 'pwsContact', 'svcAddr', 'mfrM', 'mfrB', 'sizeM', 'sizeB', 'modM', 'modB', 'bpaLoc', 'serM', 'serB', 'bpaServes', 'oldSer'].forEach(k => text(k, d[k]));
  if (BOX[d.btype]) check(d.btype);
  if (d.btype === 'RPBA-D') check('type2a'); if (d.btype === 'DCVA-D') check('type2b');
  if (d.rNew) check('rNew'); if (d.rExisting) check('rExisting'); if (d.rReplace) check('rReplace');
  if (d.codes === 'Yes') check('codesYes'); if (d.codes === 'No') check('codesNo');
  if (d.aux === 'Yes') check('auxYes'); if (d.aux === 'No') check('auxNo');

  // test result: the form has ONE pass/fail pair; it reports the final outcome (retest if one was done)
  const final = d.r_res || d.i_res; if (final === 'Pass') check('pass'); if (final === 'Fail') check('fail');
  text('i_date', fmtDate(d.i_date)); text('i_time', fmtTime(d.i_time));
  ['i_c1', 'i_c2', 'i_rv', 'i_by', 'i_ai', 'i_cv'].forEach(k => text(k, d[k]));
  if (d.i_c1s === 'Closed tight') check('i_c1s_tight'); if (d.i_c1s === 'Leaked') check('i_c1s_leak');
  if (d.i_c2s === 'Closed tight') check('i_c2s_tight'); if (d.i_c2s === 'Leaked') check('i_c2s_leak');
  if (d.i_rvno) check('i_rvno');
  if (d.i_bys === 'Closed tight') check('i_bys_tight'); if (d.i_bys === 'Leaked') check('i_bys_leak');
  if (d.i_aino) check('i_aino'); if (d.i_aifull === 'Yes') check('i_aifullY'); if (d.i_aifull === 'No') check('i_aifullN');
  if (d.i_cvs === 'Leaked') check('i_cvs_leak');

  // after repair: the form only has "closed tight" boxes there, so anything else is noted in remarks
  text('r_date', fmtDate(d.r_date)); text('r_time', fmtTime(d.r_time));
  ['r_c1', 'r_c2', 'r_rv', 'r_by', 'r_ai', 'r_cv'].forEach(k => text(k, d[k]));
  if (d.r_c1s === 'Closed tight') check('r_c1s_tight'); if (d.r_c2s === 'Closed tight') check('r_c2s_tight'); if (d.r_bys === 'Closed tight') check('r_bys_tight');
  const extra = [];
  if (d.r_c1s === 'Leaked') extra.push('retest 1st check leaked'); if (d.r_c2s === 'Leaked') extra.push('retest 2nd check leaked');
  if (d.r_bys === 'Leaked') extra.push('retest bypass check leaked'); if (d.r_cvs === 'Leaked') extra.push('retest check valve leaked');
  if (d.r_rvno) extra.push('retest relief valve did not open'); if (d.r_aino) extra.push('retest air inlet did not open');
  if (d.r_aifull === 'No') extra.push('retest air inlet did not fully open');

  // repairs (main + bypass) and remarks, wrapped into the printed lines; overflow goes on a continuation page
  const overflow = [];
  // draw carefully: for overflow cases clear the last line first by drawing only up to lines-1 then the tagged line
  const placeSafe = (label, str, lines, size) => {
    const widths = lines.map(l => l[2]); const wr = wrap(font, str, size, widths);
    const n = Math.min(wr.length, lines.length);
    for (let i = 0; i < n; i++) {
      let t = wr[i];
      if (i === lines.length - 1 && wr.length > lines.length) { const tag = ' (cont. on attached page)'; while (t.length > 1 && font.widthOfTextAtSize(t + tag, size) > widths[i]) t = t.slice(0, -1); t += tag; overflow.push([label, clean(str)]); }
      page.drawText(t, { x: lines[i][0], y: y(lines[i][1]), size, font, color: INK });
    }
  };
  if (clean(d.repairs)) placeSafe('Repairs and materials used (main)', d.repairs, REPAIR_LINES, 8);
  if (clean(d.repairsB)) { const s = clean(d.repairsB); let sz = 8; while (sz > 5.5 && font.widthOfTextAtSize(s, sz) > REPAIR_BYPASS[2]) sz -= 0.5; let o = s; while (o.length > 1 && font.widthOfTextAtSize(o, sz) > REPAIR_BYPASS[2]) o = o.slice(0, -1); page.drawText(o, { x: REPAIR_BYPASS[0], y: y(REPAIR_BYPASS[1]), size: sz, font, color: INK }); if (o.length < s.length) overflow.push(['Repairs and materials used (bypass)', s]); }
  const remarks = [clean(d.remarks), extra.length ? '[' + extra.join('; ') + ']' : ''].filter(Boolean).join(' ');
  if (remarks) placeSafe('Remarks', remarks, REMARK_LINES, 8);

  // gauge + company + tester
  if (d.gtype === 'Potable') check('gPot'); if (d.gtype === 'Non-Potable') check('gNon');
  text('gMake', d.gMake); text('gSN', d.gSN); text('gDate', fmtDate(d.gDate));
  ['coName', 'coAddr', 'coPhone', 'tName', 'tLic'].forEach(k => text(k, d[k])); text('tExp', fmtDate(d.tExp));

  // signature image
  if (signaturePng && signaturePng.length) {
    const img = await pdf.embedPng(signaturePng);
    const s = Math.min(SIG_BOX.w / img.width, SIG_BOX.h / img.height);
    const w = img.width * s, h = img.height * s;
    page.drawImage(img, { x: SIG_BOX.x + (SIG_BOX.w - w) / 2, y: y(SIG_BOX.top + SIG_BOX.h) + (SIG_BOX.h - h) / 2, width: w, height: h });
  }

  // continuation page when something did not fit
  if (overflow.length) {
    const p2 = pdf.addPage([612, 792]);
    p2.drawText('Attachment to Form TCEQ-20700', { x: 40, y: 740, size: 13, font: bold });
    p2.drawText(clean([d.pwsName, d.svcAddr, d.serM && 'S/N ' + d.serM, fmtDate(d.i_date)].filter(Boolean).join('  |  ')), { x: 40, y: 722, size: 9, font });
    let yy = 692;
    for (const [label, str] of overflow) {
      p2.drawText(label + ':', { x: 40, y: yy, size: 10, font: bold }); yy -= 15;
      for (const ln of wrap(font, str, 10, [530])) { p2.drawText(ln, { x: 40, y: yy, size: 10, font }); yy -= 13; if (yy < 60) break; }
      yy -= 10;
    }
  }
  pdf.setTitle('TCEQ-20700 Backflow Prevention Assembly Test and Maintenance Report');
  pdf.setProducer('Backflow report office host');
  return await pdf.save();
}
if (IS_NODE) module.exports = { fillReport: async (d, sig) => Buffer.from(await fillReport(d, sig)) }; else window.BFPDF = { fillReport };
})();
