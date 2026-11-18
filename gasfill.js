/* Gas pipe test results: one set of answers fills the City of Dumas form, the Texas RRC PS-86B, or both.
   Works in Node (require) and the browser (window.GASPDF). Needs pdf-lib (vendor/pdf-lib.min.js) and gas-ps86b.pdf.
   The Dumas form has no blank original, so it is drawn here to match the printed city form. */
(function (root) {
  'use strict';
  const isNode = typeof module === 'object' && module.exports;
  const PDFLib = isNode ? require('./vendor/pdf-lib.min.js') : root.PDFLib;
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const loadState = isNode
    ? async () => require('fs').readFileSync(require('path').join(__dirname, 'gas-ps86b.pdf'))
    : async () => new Uint8Array(await (await fetch('gas-ps86b.pdf')).arrayBuffer());

  const INK = rgb(0, 0, 0), FILL = rgb(0.06, 0.2, 0.62);
  const clean = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const fmtDate = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? `${m[2]}/${m[3]}/${m[1]}` : clean(s); };
  const dateParts = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? [m[2], m[3], m[1]] : ['', '', '']; };
  const fmtTime = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); if (!m) return { t: clean(t), ap: '' }; let h = +m[1]; const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return { t: `${h}:${m[2]}`, ap }; };

  // ---------- shared drawing helpers (y measured from the top of the page) ----------
  function tools(page, fonts) {
    const H = page.getHeight();
    const text = (s, x, top, size, font, color, maxW) => {
      s = clean(s); if (!s) return; font = font || fonts.val; size = size || 10;
      if (maxW) while (size > 6 && font.widthOfTextAtSize(s, size) > maxW) size -= 0.25;
      page.drawText(s, { x, y: H - top, size, font, color: color || FILL });
    };
    const center = (s, cx, top, size, font, color) => { const w = font.widthOfTextAtSize(s, size); page.drawText(s, { x: cx - w / 2, y: H - top, size, font, color: color || INK }); };
    const line = (x1, x2, top, th) => page.drawLine({ start: { x: x1, y: H - top }, end: { x: x2, y: H - top }, thickness: th || 0.8, color: INK });
    const circle = (cx, top, r, th) => page.drawEllipse({ x: cx, y: H - top, xScale: r, yScale: r, borderColor: INK, borderWidth: th || 1 });
    const oval = (cx, top, rx, ry) => page.drawEllipse({ x: cx, y: H - top, xScale: rx, yScale: ry, borderColor: FILL, borderWidth: 1.1 });
    const check = (cx, top, s) => { s = s || 6; page.drawLine({ start: { x: cx - s * 0.7, y: H - top }, end: { x: cx - s * 0.15, y: H - top - s * 0.6 }, thickness: 1.6, color: FILL }); page.drawLine({ start: { x: cx - s * 0.15, y: H - top - s * 0.6 }, end: { x: cx + s * 0.9, y: H - top + s * 0.9 }, thickness: 1.6, color: FILL }); };
    const xbox = (x, top, w) => { page.drawLine({ start: { x: x + 1, y: H - top - 1 }, end: { x: x + w - 1, y: H - top - w + 1 }, thickness: 1.3, color: FILL }); page.drawLine({ start: { x: x + 1, y: H - top - w + 1 }, end: { x: x + w - 1, y: H - top - 1 }, thickness: 1.3, color: FILL }); };
    const sig = (img, x, top, w, h) => { if (!img) return; const s = Math.min(w / img.width, h / img.height); page.drawImage(img, { x, y: H - top - img.height * s, width: img.width * s, height: img.height * s }); };
    return { text, center, line, circle, oval, check, xbox, sig, H };
  }

  // ---------- City of Dumas form, drawn to match the printed form ----------
  function drawDumas(page, f, d, sigImg) {
    const T = tools(page, f), B = f.bold, L = 9.5;
    const lab = (s, x, top, size) => page.drawText(s, { x, y: T.H - top, size: size || L, font: B, color: INK });
    T.center('CITY OF DUMAS, TEXAS', 306, 66, 15, B);
    T.center('GAS PIPE TEST RESULTS FORM', 306, 90, 13.5, B);

    lab('ACCT. OR METER #', 72, 128); T.line(166, 330, 130); T.text(d.acct, 170, 127, 11, null, null, 155);
    lab('FACILITY / CAMPUS NAME:', 72, 150); T.line(205, 545, 152); T.text(d.facility, 210, 149, 11, null, null, 330);
    lab('TEST PERFORMED BY:', 72, 172); T.line(180, 545, 174); T.text(d.performedBy, 185, 171, 11, null, null, 355);
    lab('FACILITY ADDRESS:', 72, 194); T.line(170, 330, 196); T.text(d.facAddr, 174, 193, 11, null, null, 154);
    lab('TELEPHONE NUMBER', 336, 194); T.line(440, 545, 196); T.text(d.facPhone, 444, 193, 11, null, null, 100);
    lab('DATE OF TEST:', 72, 216); T.line(146, 270, 218); T.text(fmtDate(d.date), 150, 215, 11);

    lab('TESTING PERFORMED ACCORDING TO: (check one):', 72, 242, 8.5);
    T.circle(82, 258, 6); lab('NATURAL GAS', 94, 261);
    T.circle(82, 278, 6); lab('LP GAS', 94, 281);
    if (d.gasType === 'natural') T.check(82, 258); if (d.gasType === 'lp') T.check(82, 278);

    lab('SYSTEM NORMAL OPERATING PRESSURE (NOP):', 66, 314, 9);
    T.line(296, 380, 316); T.text([d.nop, d.nopUnit].filter(Boolean).join(' '), 300, 313, 11, null, null, 78);
    lab('for NOP < 0.5 psig;   test at 5 psig for 15 min', 66, 338, 8.5);
    lab('for NOP > = 5 psig;   test at 1.5 times NOP for 15 min', 66, 350, 8.5);
    lab('for NOP > = 5 psig;   the test a NOP for 1 hour', 66, 362, 8.5);
    lab('TESTING PRESSURE:', 66, 386); T.line(166, 290, 388); lab('lbs / ozs', 294, 386, 8.5);
    T.text(d.testPressure, 170, 385, 11, null, null, 118);
    if (d.testUnit === 'lbs') T.oval(304, 383, 11, 6.5); if (d.testUnit === 'ozs') T.oval(326, 383, 11, 6.5);
    lab('TIME OF TEST:', 66, 408);
    const s = fmtTime(d.start), e = fmtTime(d.stop);
    lab('START', 66, 432); T.line(98, 190, 434); lab('AM/PM', 192, 432, 8.5); T.text(s.t, 104, 431, 11);
    lab('STOP', 238, 432); T.line(266, 352, 434); lab('AM/PM', 354, 432, 8.5); T.text(e.t, 272, 431, 11);
    const ap = (v, x) => { if (v === 'am') T.oval(x + 6, 429, 8, 6); if (v === 'pm') T.oval(x + 21, 429, 8, 6); };
    ap(s.ap, 192); ap(e.ap, 354);

    // right-hand checklist
    const items = [['co', 'CARBON MONOXIDE DETECTOR', 308], ['flue', 'FLUE', 332], ['flex', 'FLEX CONNECTORS', 356], ['vent', 'VENT CAPS', 380], ['air', 'COMBUSTION AIR', 404]];
    for (const [k, label, top] of items) {
      T.circle(420, top - 3, 7); lab(label, 432, top, 8.5);
      const v = (d.checks || {})[k]; if (v === 'ok') T.check(420, top - 3); if (v === 'na') page.drawText('NA', { x: 414, y: T.H - top + 0.5, size: 7.5, font: f.val, color: FILL });
    }

    lab('REPAIRS REQUIRED?', 66, 468); lab('YES', 200, 468); T.circle(232, 465, 6); lab('NO', 270, 468); T.circle(256, 465, 6);
    if (d.repairs === 'yes') T.check(232, 465); if (d.repairs === 'no') T.check(256, 465);
    lab('FINAL RESULTS?', 66, 494); lab('PASS', 200, 494); T.circle(240, 491, 6); T.circle(262, 491, 6); lab('FAIL', 272, 494);
    if (d.result === 'pass') T.check(240, 491); if (d.result === 'fail') T.check(262, 491);

    lab('TESTER:', 66, 526); T.line(116, 360, 528); lab('PRINT NAME', 200, 536, 7); T.text(d.testerName, 122, 525, 11, null, null, 236);
    lab('DATE:', 366, 526); T.line(398, 520, 528); T.text(fmtDate(d.testerDate || d.date), 402, 525, 11);
    lab('TESTER:', 66, 560); T.line(116, 520, 562); lab('SIGNATURE', 200, 570, 7); T.sig(sigImg, 128, 540, 220, 21);
    lab("TESTER'S LICENSE #", 66, 594); T.line(170, 340, 596); T.text(d.license, 176, 593, 11, null, null, 160);
    lab('PHONE #', 350, 594); T.line(394, 520, 596); T.text(d.testerPhone, 398, 593, 11, null, null, 120);
    lab('WITNESSED BY:', 66, 628); T.line(146, 400, 630); lab('PRINT NAME', 230, 638, 7); T.text(d.witnessName, 152, 627, 11, null, null, 244);
    lab('DATE:', 404, 628); T.line(434, 520, 630); T.text(fmtDate(d.witnessDate), 438, 627, 11);
    lab('WITNESSED BY:', 66, 662); T.line(146, 330, 664); lab('SIGNATURE', 210, 672, 7);
    lab('DATE:', 334, 662); T.line(364, 440, 664);
    const roles = [['building', 'BUILDING OFFICIAL', 80, 706], ['fire', 'CITY FIRE INSPECTOR', 80, 728], ['gasco', 'GAS COMPANY REPRESENTATIVE', 316, 706], ['marshal', 'FIRE MARSHALL', 316, 728]];
    for (const [k, label, x, top] of roles) { T.circle(x, top - 3, 6); lab(label, x + 12, top); if (d.witnessRole === k) T.check(x, top - 3); }
  }

  // ---------- Texas RRC PS-86B, written onto the state's own PDF ----------
  function fillStateForm(page, f, d, sigImg) {
    const T = tools(page, f);
    T.text(d.acct, 190, 118.5, 10.5, null, null, 110);
    T.text(d.facility, 240, 150.5, 10.5, null, null, 243);
    T.text(d.performedBy, 217, 182.5, 10.5, null, null, 270);
    T.text(d.facAddr, 202, 214.5, 10.5, null, null, 345);
    const ph = /^\D*(\d{3})\D*(\d{3})\D*(\d{4})\D*$/.exec(d.facPhone || '');
    if (ph) { T.text(ph[1], 224.5, 246.5, 10); T.text(ph[2] + '-' + ph[3], 252, 246.5, 10.5); } else T.text(d.facPhone, 250, 246.5, 10.5, null, null, 56);
    const [mm, dd, yy] = dateParts(d.date); T.text(mm, 176, 279.5, 10.5); T.text(dd, 222, 279.5, 10.5); T.text(yy, 263, 279.5, 10.5);
    if (d.basis === 'municipal') T.xbox(50.6, 320.2, 8.2); if (d.basis === 'rrc') T.xbox(50.6, 337.4, 8.2);
    T.text(d.nop, 381, 374, 10.5, null, null, 40);
    const unit = (u, top, x1) => { if (u === 'lbs') T.oval(x1 + 8, top, 10, 6.5); if (u === 'ozs') T.oval(x1 + 31, top, 10, 6.5); };
    unit(d.nopUnit, 371, 425.8);
    T.text(d.testPressure, 204, 461, 10.5, null, null, 68); unit(d.testUnit, 458, 277.1);
    const s = fmtTime(d.start), e = fmtTime(d.stop);
    T.text(s.t, 198, 493, 10.5); T.text(e.t, 366, 493, 10.5);
    const ap = (v, x) => { if (v === 'am') T.oval(x + 9, 490, 10, 7); if (v === 'pm') T.oval(x + 32, 490, 10, 7); };
    ap(s.ap, 272.9); ap(e.ap, 437.3);
    if (d.repairs === 'yes') T.xbox(259.6, 517.6, 8.2); if (d.repairs === 'no') T.xbox(330.5, 517.6, 8.2);
    if (d.result === 'pass') T.xbox(220.9, 549.8, 8.2); if (d.result === 'fail') T.xbox(270.9, 549.8, 8.2);
    T.sig(sigImg, 256, 568, 106, 22);
    if (!sigImg) T.text(d.testerName, 258, 589, 10.5, null, null, 104);
    T.text(fmtDate(d.testerDate || d.date), 421, 589.5, 10.5);
    T.text(d.witnessName, 171, 621.5, 10.5, null, null, 175);
    T.text(fmtDate(d.witnessDate), 406, 621.5, 10.5);
  }

  async function fillGas(d, signaturePng, which) {
    which = which || d.forms || 'dumas';
    const out = await PDFDocument.create();
    const f = { bold: await out.embedFont(StandardFonts.TimesRomanBold), val: await out.embedFont(StandardFonts.Helvetica) };
    const sigImg = signaturePng && signaturePng.length ? await out.embedPng(signaturePng) : null;
    if (which === 'dumas' || which === 'both') drawDumas(out.addPage([612, 792]), f, d, sigImg);
    if (which === 'state' || which === 'both') {
      const src = await PDFDocument.load(await loadState());
      const [p] = await out.copyPages(src, [0]); out.addPage(p); fillStateForm(p, f, d, sigImg);
    }
    out.setTitle('Gas pipe test results' + (d.facility ? ' - ' + clean(d.facility) : ''));
    const bytes = await out.save();
    return isNode ? Buffer.from(bytes) : bytes;
  }
  // the test-duration rule for the chosen form, shown in the app
  const RULES = {
    dumas: 'City of Dumas: NOP under 0.5 psig, test at 5 psig for 15 min. NOP 0.5 to under 5 psig, test at 1.5 times NOP for 15 min. NOP 5 psig or more, test at NOP for 1 hour.',
    state: 'State (RRC PS-86B): NOP under 0.5 psig, test at 5 psig for 30 min. NOP 0.5 psig or more, test at 1.5 times NOP or 5 psig, whichever is greater, for 30 min. NOP 5 psig or more, test at NOP for 1 hour.'
  };
  const api = { fillGas, RULES };
  if (isNode) module.exports = api; else root.GASPDF = api;
})(typeof window !== 'undefined' ? window : globalThis);
