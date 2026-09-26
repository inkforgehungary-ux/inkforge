// Egyszerű futtatható teszt — szintetikus bemeneteken
// Futtatás: node pipeline/js/test/run.js

'use strict';
const { runPipeline, measure, toPrintSize } = require('../stencil-v3.js');

function makeGray(w, h, fn) {
  const g = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[y * w + x] = fn(x, y);
  return g;
}

const W = 400, H = 400;
const results = [];

// 1. Tiszta fekete-fehér rajz (grafikus bemenet) -> Otsu ág
const clean = makeGray(W, H, (x, y) => {
  const inCircle = (x - 200) ** 2 + (y - 200) ** 2 < 120 ** 2;
  const inInner = (x - 200) ** 2 + (y - 200) ** 2 < 70 ** 2;
  return inCircle && !inInner ? 0 : 255;
});
let r = runPipeline(clean, W, H);
results.push({ teszt: 'tiszta rajz (gyuru)', ag: r.report.branchUsed, fedettseg: (r.report.coverage * 100).toFixed(2) + '%', minosites: r.report.quality, hidak: r.report.bridges });

// 2. Sötét, fotószerű bemenet -> top-hat ág
const dark = makeGray(W, H, (x, y) => {
  const base = 35 + Math.sin(x * 0.05) * 10 + Math.cos(y * 0.04) * 8;
  const onLine = Math.abs(x - 200) < 4 || Math.abs(y - 200) < 4;
  return onLine ? 8 : Math.round(base);
});
r = runPipeline(dark, W, H);
results.push({ teszt: 'sotet fotos (kereszt vonal)', ag: r.report.branchUsed, fedettseg: (r.report.coverage * 100).toFixed(2) + '%', minosites: r.report.quality, hidak: r.report.bridges });

// 3. Pontos méret ellenőrzése
const m = toPrintSize(clean, W, H, 100, 300);
results.push({ teszt: 'meret 100mm @300dpi', px: m.width + 'x' + m.height, mm: m.widthMm + 'x' + m.heightMm, px_per_mm: m.pxPerMm });

// 4. Nem lehet 100mm helyett mást kapni
const err = Math.abs(m.widthMm - 100);
results.push({ teszt: 'meret pontossag', elteres_mm: err.toFixed(3), megfelel: err < 0.15 ? 'IGEN' : 'NEM' });

console.log(JSON.stringify(results, null, 2));
