// INKFORGE — KIMENETI MODUL
// A4-es nyomtatasi PDF mm-pontosan + kulon PNG atlatszo hatterrel.
// A meret a PDF-ben pont-meret (1 mm = 2.834645 pt) — ettol 1:1.

const MM = 2.8346456693;
const A4 = { w: 595.276, h: 841.89 };

// ---------- CRC32 ----------
const CRC_TABLE = (function () {
  const tb = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    tb[n] = c >>> 0;
  }
  return tb;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 255] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const l = data.length;
  const len = new Uint8Array(4);
  len[0] = (l >>> 24) & 255; len[1] = (l >>> 16) & 255; len[2] = (l >>> 8) & 255; len[3] = l & 255;
  const t = new TextEncoder().encode(type);
  const cb = new Uint8Array(4 + l);
  cb.set(t); cb.set(data, 4);
  const c = crc32(cb);
  const crc = new Uint8Array(4);
  crc[0] = (c >>> 24) & 255; crc[1] = (c >>> 16) & 255; crc[2] = (c >>> 8) & 255; crc[3] = c & 255;
  return [len, t, data, crc];
}

// ---------- PNG nyers adat (RGBA, atlatszo hatter) ----------
// 0 = atlatszo (festek atmegy), 255 = tinta (festek marad)
export function buildPNGRaw(mask, w, h, opts) {
  const o = opts || {};
  const transparentBg = o.transparent !== false;
  const color = o.color || [0, 0, 0];
  const raw = new Uint8Array(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    const rs = y * (w * 4 + 1);
    raw[rs] = 0;
    for (let x = 0; x < w; x++) {
      const p = rs + 1 + x * 4;
      if (mask[y * w + x]) {
        raw[p] = color[0]; raw[p + 1] = color[1]; raw[p + 2] = color[2]; raw[p + 3] = 255;
      } else if (transparentBg) {
        raw[p] = 255; raw[p + 1] = 255; raw[p + 2] = 255; raw[p + 3] = 0;
      } else {
        raw[p] = 255; raw[p + 1] = 255; raw[p + 2] = 255; raw[p + 3] = 255;
      }
    }
  }
  return raw;
}

export function adler32(bytes) {
  let a = 1, b = 0;
  for (let i = 0; i < bytes.length; i++) { a = (a + bytes[i]) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}

// zlib kontener (0x78 0x01 + deflate + Adler32)
export function assemblePNG(deflatedZlib, w, h) {
  const ihdr = new Uint8Array(13);
  ihdr[0] = (w >>> 24) & 255; ihdr[1] = (w >>> 16) & 255; ihdr[2] = (w >>> 8) & 255; ihdr[3] = w & 255;
  ihdr[4] = (h >>> 24) & 255; ihdr[5] = (h >>> 16) & 255; ihdr[6] = (h >>> 8) & 255; ihdr[7] = h & 255;
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])];
  chunk('IHDR', ihdr).forEach(function (p) { parts.push(p); });
  chunk('IDAT', deflatedZlib).forEach(function (p) { parts.push(p); });
  chunk('IEND', new Uint8Array(0)).forEach(function (p) { parts.push(p); });
  let tot = 0;
  parts.forEach(function (p) { tot += p.length; });
  const out = new Uint8Array(tot);
  let off = 0;
  parts.forEach(function (p) { out.set(p, off); off += p.length; });
  return out;
}

// Fizikai meret a PNG-be (pHYs chunk) — 1 m = 1000 mm
export function withPhysicalSize(pngBytes, pxPerMm) {
  const ppm = Math.round(pxPerMm * 1000);
  const data = new Uint8Array(9);
  data[0] = (ppm >>> 24) & 255; data[1] = (ppm >>> 16) & 255; data[2] = (ppm >>> 8) & 255; data[3] = ppm & 255;
  data[4] = (ppm >>> 24) & 255; data[5] = (ppm >>> 16) & 255; data[6] = (ppm >>> 8) & 255; data[7] = ppm & 255;
  data[8] = 1;
  const parts = chunk('pHYs', data);
  const ihdrEnd = 8 + 25;
  const out = new Uint8Array(pngBytes.length + 21);
  out.set(pngBytes.subarray(0, ihdrEnd), 0);
  let off = ihdrEnd;
  parts.forEach(function (p) { out.set(p, off); off += p.length; });
  out.set(pngBytes.subarray(ihdrEnd), off);
  return out;
}

// ---------- PDF nyomtatasi lap ----------
export async function buildPrintSheet(cfg) {
  const { PDFLib, pngBytes, stencilW, stencilH, widthMm, dpi, studioName, studioEmail, stencilName, dateStr } = cfg;
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.w, A4.h]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const img = await pdf.embedPng(pngBytes);

  const M = 14 * MM;
  const gold = rgb(0.72, 0.55, 0.16);
  const grey = rgb(0.45, 0.45, 0.48);
  const dark = rgb(0.11, 0.11, 0.13);
  const guide = rgb(0.72, 0.72, 0.75);

  const hy = A4.h - M;
  page.drawText('INKFORGE', { x: M, y: hy - 8, size: 13, font: bold, color: gold });
  page.drawText('NYOMTATASI LAP', { x: M + 78, y: hy - 8, size: 8, font, color: grey });

  let ry = hy - 8;
  const rightMeta = [studioName || '', stencilName || 'stencil', Number(widthMm).toFixed(1) + ' mm szeles', dpi + ' DPI', dateStr || ''].filter(Boolean);
  rightMeta.forEach(function (line) {
    const tw = font.widthOfTextAtSize(line, 7.5);
    page.drawText(line, { x: A4.w - M - tw, y: ry, size: 7.5, font, color: grey });
    ry -= 9.5;
  });
  page.drawLine({ start: { x: M, y: hy - 20 }, end: { x: A4.w - M, y: hy - 20 }, thickness: 0.9, color: gold });

  // Stencil PONT-meretben
  const swPt = widthMm * MM;
  const shPt = swPt * stencilH / stencilW;
  const areaTop = hy - 34;
  const areaBottom = M + 92;
  const areaW = A4.w - 2 * M;
  const areaH = areaTop - areaBottom;
  let fit = 1, dW = swPt, dH = shPt;
  if (dW > areaW || dH > areaH) { fit = Math.min(areaW / dW, areaH / dH); dW *= fit; dH *= fit; }
  const ix = M + (areaW - dW) / 2;
  const iy = areaBottom + (areaH - dH) / 2;

  page.drawRectangle({ x: ix, y: iy, width: dW, height: dH, borderColor: guide, borderWidth: 0.5, borderDashArray: [3, 3] });
  page.drawImage(img, { x: ix, y: iy, width: dW, height: dH });

  const dimLabel = Number(widthMm).toFixed(1) + ' x ' + (shPt / MM).toFixed(1) + ' mm' + (fit < 1 ? '   (kicsinyitve: ' + Math.round(fit * 100) + '%)' : '   1:1');
  page.drawText(dimLabel, { x: ix, y: iy + dH + 4, size: 7, font, color: grey });

  // Illesztokeresztek
  const cl = 7 * MM, cm = M * 0.75;
  const corners = [[cm, cm], [A4.w - cm, cm], [cm, A4.h - cm], [A4.w - cm, A4.h - cm]];
  corners.forEach(function (p) {
    page.drawLine({ start: { x: p[0] - cl / 2, y: p[1] }, end: { x: p[0] + cl / 2, y: p[1] }, thickness: 0.5, color: gold });
    page.drawLine({ start: { x: p[0], y: p[1] - cl / 2 }, end: { x: p[0], y: p[1] + cl / 2 }, thickness: 0.5, color: gold });
    page.drawCircle({ x: p[0], y: p[1], size: cl / 2, borderColor: gold, borderWidth: 0.5 });
  });

  // 100 mm kalibracio
  const calY = M + 34, x0 = M, x1 = M + 100 * MM;
  page.drawLine({ start: { x: x0, y: calY }, end: { x: x1, y: calY }, thickness: 1.2, color: dark });
  for (let i = 0; i <= 10; i++) {
    const xx = x0 + i * 10 * MM;
    page.drawLine({ start: { x: xx, y: calY }, end: { x: xx, y: calY + (i % 5 === 0 ? 5 : 3) }, thickness: 0.7, color: dark });
  }
  page.drawText('100 mm kalibracio — ha a papiron nem 10 cm, a nyomtato atmeretezte a kepet.', { x: x0, y: calY - 12, size: 6.5, font, color: dark });

  const factY = M + 14;
  const facts = [
    'Mert meret: ' + Number(widthMm).toFixed(2) + ' mm x ' + (shPt / MM).toFixed(2) + ' mm',
    'Raszter: ' + stencilW + ' x ' + stencilH + ' px @ ' + dpi + ' DPI   (' + (dpi / 25.4).toFixed(3) + ' px/mm)'
  ];
  facts.forEach(function (f, i) { page.drawText(f, { x: M, y: factY - i * 10, size: 7, font, color: grey }); });

  const wY = M + 62;
  page.drawRectangle({ x: M, y: wY, width: A4.w - 2 * M, height: 18, borderColor: rgb(0.8, 0.52, 0.18), borderWidth: 0.7 });
  page.drawText('Nyomtatas elott: kapcsold ki a Fit to page opciot, es ellenorizd a kalibracios vonalat.', { x: M + 6, y: wY + 6, size: 6.5, font, color: rgb(0.45, 0.28, 0.05) });

  if (studioEmail) {
    const ft = 'Keszitette: InkForge  ·  ' + studioEmail;
    const tw = font.widthOfTextAtSize(ft, 6.5);
    page.drawText(ft, { x: A4.w - M - tw, y: M - 6, size: 6.5, font, color: grey });
  }

  return await pdf.save();
}

// ---------- Fajlnevek ----------
export function stencilFilenames(name, widthMm, dpi) {
  const base = (name || 'stencil').replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase();
  const tag = widthMm + 'mm-' + dpi + 'dpi';
  return {
    pdf: base + '-' + tag + '-nyomtatasi-lap.pdf',
    png: base + '-' + tag + '-atlatszo.png',
    base: base + '-' + tag
  };
}

export const OUTPUT_VERSION = '1.0.0';
