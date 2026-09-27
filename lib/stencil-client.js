// INKFORGE — STENCIL KLIENS
// A tonal az ELSO ag fotohoz. Ha 0%-ot ad, valtunk edge-re.

import {
  toGray, runPipeline, toPrintSize, branchTonal, blur5, stretch,
  cleanMask, open as openLocal, addBridges as addBridgesLocal,
  components as componentsLocal, finalPolish as finalPolishLocal,
  dilateDisk as dilateDiskLocal, enforceStrokeWidth,
  registrationMarks, multiLayer, ENGINE_VERSION
} from './engine.js';
import { measureV2, photoToContour } from './tuning.js';

export { ENGINE_VERSION };

const MAX_DIM = 4000;

export function decodeFile(file, maxDim) {
  return new Promise(function (resolve, reject) {
    if (typeof window === 'undefined') { reject(new Error('Csak bongeszoben fut.')); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      const cap = maxDim || MAX_DIM;
      let w = img.naturalWidth, h = img.naturalHeight;
      const sc = Math.min(1, cap / Math.max(w, h));
      w = Math.max(1, Math.round(w * sc)); h = Math.max(1, Math.round(h * sc));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const c = cv.getContext('2d', { willReadFrequently: true });
      c.drawImage(img, 0, 0, w, h);
      const rgba = c.getImageData(0, 0, w, h).data;
      resolve({ rgba: rgba, gray: toGray(rgba, w, h), w: w, h: h, srcW: img.naturalWidth, srcH: img.naturalHeight });
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('A kep nem olvashato.')); };
    img.src = url;
  });
}

function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

function coverageOf(mask) {
  let c = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) c++;
  return c / (mask.length || 1);
}

// Tonal ag: gamma-hangolassal a cel-savba
export function tonalRun(gray, w, h, opts) {
  const o = opts || {};
  let gamma = o.gamma || 1;
  let res = tonalOnce(gray, w, h, gamma, o);
  let cov = coverageOf(res.mask);

  const target = o.targetCoverage || 0.32;
  const tol = 0.06;
  let steps = 0;
  while (Math.abs(cov - target) > tol && steps < 4) {
    const ratio = cov / target;
    let g = gamma;
    if (ratio > 1.10) g = Math.min(2.6, gamma * (1 + (ratio - 1) * 0.7));
    else if (ratio < 0.90) g = Math.max(0.65, gamma * (1 - (1 - ratio) * 0.5));
    if (Math.abs(g - gamma) < 0.05) break;
    gamma = g;
    res = tonalOnce(gray, w, h, gamma, o);
    cov = coverageOf(res.mask);
    steps++;
  }
  res.report.gamma = Math.round(gamma * 100) / 100;
  res.report.gammaSteps = steps;
  return res;
}

function tonalOnce(gray, w, h, gamma, o) {
  const norm = stretch(gray, 0.01);
  const soft = blur5(norm, w, h);
  const res = branchTonal(soft, w, h, gamma);

  let img = res.img;
  if (o.strokePx && o.strokePx > 0) img = enforceStrokeWidth(img, w, h, o.strokePx);
  else {
    const st = o.baseStroke === undefined ? 0 : o.baseStroke;
    if (st > 0) img = dilateDiskLocal(img, w, h, st);
  }

  const opened = openLocal(img, w, h, o.morph === undefined ? 1 : o.morph);
  const cleaned = cleanMask(opened, w, h, o.minArea || 20);
  const bridged = addBridgesLocal(cleaned.img, w, h, {
    bridgePx: o.bridgePx || 2,
    minArea: o.minArea || 20,
    maxLen: Math.round(Math.max(w, h) * 0.10)
  });
  const final = finalPolishLocal(bridged.img, w, h, o.polish === undefined ? 1 : o.polish);

  const cov = coverageOf(final);
  const comp = componentsLocal(final, w, h);
  const big = comp.stats.filter(function (s) { return s.area >= (o.minArea || 20); }).length;

  return {
    mask: final,
    report: {
      branchUsed: 'tonal', threshold: res.threshold,
      bridges: bridged.bridges, islands: big,
      coverage: Math.round(cov * 10000) / 100,
      holesFilled: 0,
      quality: cov < 0.02 ? 'tul ritka' : cov > 0.40 ? 'tul fedett' : (big > 1 ? 'hidakkal javithato' : 'hasznalhato'),
      verdictText: cov < 0.02 ? 'Tul keves festek jut at — noveld a kontrasztot.'
        : cov > 0.40 ? 'Tul sok a fedett terulet.'
        : (big > 1 ? 'Tobb kulon darab — kieshet.' : 'Nyomtatasra kesz.')
    }
  };
}

// Edge ag: hatter-lepapitas + Canny
export function edgeRun(gray, w, h, opts) {
  const o = opts || {};
  const c = photoToContour(gray, w, h, {
    threshold: o.edgeThreshold || 0.24,
    blur: o.edgeBlur || 3
  });
  const minA = o.minArea || Math.round(w * h * 0.0015);
  const cleaned = cleanBig(c.img, w, h, minA);
  const st = o.baseStroke === undefined ? 1 : o.baseStroke;
  const thick = st > 0 ? dilateDiskLocal(cleaned, w, h, st) : cleaned;
  const br = addBridgesSmart(thick, w, h, { bridgePx: o.bridgePx || 2, minArea: minA });
  const cov = coverageOf(br.img);

  return {
    mask: br.img,
    report: {
      branchUsed: 'edge', threshold: -1,
      bridges: br.bridges, islands: br.pieces,
      coverage: Math.round(cov * 10000) / 100,
      holesFilled: 0,
      quality: cov < 0.02 ? 'tul ritka' : cov > 0.40 ? 'tul fedett' : (br.pieces > 1 ? 'hidakkal javithato' : 'hasznalhato'),
      verdictText: cov < 0.02 ? 'A kontur-kereses nem talalt format — valts Motor agat.'
        : cov > 0.40 ? 'Tul sok a fedett terulet.'
        : (br.pieces > 1 ? 'Tobb kulon darab — kieshet.' : 'Nyomtatasra kesz.')
    }
  };
}

export async function runStencil(file, opts, onStage) {
  const o = opts || {};
  const say = function (s) { if (onStage) onStage(s); };

  say('decode');
  const dec = await decodeFile(file, o.maxDim);

  say('measure');
  const m = measureV2(dec.gray, dec.w, dec.h);
  await tick();

  say('process');
  const wanted = (o.branch && o.branch !== 'auto') ? o.branch : m.branch;
  let res;
  let switched = false;

  if (wanted === 'lineart') {
    res = runPipeline(dec.gray, dec.w, dec.h, {
      branch: 'lineart', contrast: o.contrast,
      baseStroke: o.baseStroke, morph: o.morph,
      polish: o.polish, minArea: o.minArea,
      bridgePx: o.bridgePx, fillHoles: o.fillHoles
    });
  } else if (wanted === 'edge') {
    res = edgeRun(dec.gray, dec.w, dec.h, o);
  } else {
    // TONAL az elso
    res = tonalRun(dec.gray, dec.w, dec.h, o);
    // HA URES: valtunk edge-re — nem hagyunk ures kimenetet
    if (res.report.coverage < 1.0) {
      say('fallback');
      await tick();
      const e = edgeRun(dec.gray, dec.w, dec.h, o);
      if (e.report.coverage > res.report.coverage) {
        res = e;
        switched = true;
      }
    }
  }

  res.report.kind = m.kind;
  res.report.polarity = m.polarity;
  res.report.readiness = m.readiness;
  res.report.readinessText = m.readinessText;
  res.report.switched = switched;
  res.report.switchText = switched ? 'A tömeges ág nem talált formát — a kontúr-ágra váltottunk.' : '';

  say('print');
  await tick();

  const print = toPrintSize(res.mask, dec.w, dec.h, o.widthMm || 100, o.dpi || 300);

  let layers = null;
  if (o.layers && o.layers > 1) {
    layers = multiLayer(dec.gray, dec.w, dec.h, o.layers, {
      minArea: o.minArea || 20, bridges: true, bridgePx: o.bridgePx || 2
    });
  }

  say('done');
  return {
    dec: dec, mask: print.img, baseMask: res.mask,
    width: print.width, height: print.height,
    report: res.report, print: {
      widthMm: print.widthMm, heightMm: print.heightMm,
      pxPerMm: print.pxPerMm, dpi: print.dpi,
      px: print.width + ' x ' + print.height
    },
    layers: layers,
    regMarks: o.registration ? registrationMarks(print.width, print.height, Math.round(print.pxPerMm * 5)) : null
  };
}

function cleanBig(src, w, h, minArea) {
  const labels = new Int32Array(w * h);
  const q = new Int32Array(w * h);
  let next = 1;
  const keep = [];
  for (let i = 0; i < w * h; i++) {
    if (src[i] === 0 || labels[i] !== 0) continue;
    const lbl = next++;
    let qh = 0, qt = 0, area = 0;
    q[qt++] = i; labels[i] = lbl;
    while (qh < qt) {
      const p = q[qh++], py = (p / w) | 0, px = p % w;
      area++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const np = ny * w + nx;
        if (src[np] !== 0 && labels[np] === 0) { labels[np] = lbl; q[qt++] = np; }
      }
    }
    if (area >= minArea) keep.push(lbl);
  }
  const keepSet = new Uint8Array(next);
  for (let k = 0; k < keep.length; k++) keepSet[keep[k]] = 1;
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { const lb = labels[i]; if (lb !== 0 && keepSet[lb]) out[i] = 255; }
  return out;
}

function addBridgesSmart(src, w, h, opts) {
  const o = opts || {};
  const thickness = Math.max(1, o.bridgePx || 2);
  const minArea = o.minArea || 40;
  const maxLen = Math.round(Math.max(w, h) * 0.04);
  const labels = new Int32Array(w * h);
  const q = new Int32Array(w * h);
  const stats = [];
  let next = 1;
  for (let i = 0; i < w * h; i++) {
    if (src[i] === 0 || labels[i] !== 0) continue;
    const lbl = next++;
    let qh = 0, qt = 0, area = 0, sx = 0, sy = 0;
    q[qt++] = i; labels[i] = lbl;
    while (qh < qt) {
      const p = q[qh++], py = (p / w) | 0, px = p % w;
      area++; sx += px; sy += py;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const np = ny * w + nx;
        if (src[np] !== 0 && labels[np] === 0) { labels[np] = lbl; q[qt++] = np; }
      }
    }
    stats.push({ label: lbl, area: area, cx: sx / area, cy: sy / area });
  }
  stats.sort(function (a, b) { return b.area - a.area; });
  const pieces = stats.filter(function (s) { return s.area >= minArea; }).length;
  if (stats.length <= 1) return { img: src, bridges: 0, pieces: pieces };
  const out = src.slice();
  const mainLabel = stats[0].label;
  let bridges = 0;
  for (let s = 1; s < stats.length; s++) {
    const c = stats[s];
    if (c.area < minArea) continue;
    let best = Infinity, bp = null;
    for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) {
      if (labels[y * w + x] !== mainLabel) continue;
      const d = (x - c.cx) * (x - c.cx) + (y - c.cy) * (y - c.cy);
      if (d < best) { best = d; bp = [x, y]; }
    }
    if (!bp) continue;
    if (Math.sqrt(best) > maxLen) continue;
    const xa = Math.round(c.cx), ya = Math.round(c.cy);
    const steps = Math.max(Math.abs(bp[0] - xa), Math.abs(bp[1] - ya)) || 1;
    const rad = Math.max(0, Math.floor(thickness / 2));
    for (let t = 0; t <= steps; t++) {
      const x = Math.round(xa + (bp[0] - xa) * t / steps);
      const y = Math.round(ya + (bp[1] - ya) * t / steps);
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) out[ny * w + nx] = 255;
      }
    }
    bridges++;
  }
  return { img: out, bridges: bridges, pieces: pieces };
}

export function maskToCanvas(mask, w, h, invert) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const d = c.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    let v = mask[i] > 0 ? 0 : 255;
    if (invert) v = 255 - v;
    d.data[i * 4] = v; d.data[i * 4 + 1] = v; d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255;
  }
  c.putImageData(d, 0, 0);
  return cv;
}

export function maskToDataURL(mask, w, h, invert) {
  if (typeof window === 'undefined') return '';
  return maskToCanvas(mask, w, h, invert).toDataURL('image/png');
}

export function previewURL(mask, w, h, maxW) {
  if (typeof window === 'undefined') return '';
  const sc = Math.min(1, (maxW || 900) / w);
  const tw = Math.max(1, Math.round(w * sc)), th = Math.max(1, Math.round(h * sc));
  const src = maskToCanvas(mask, w, h);
  const cv = document.createElement('canvas');
  cv.width = tw; cv.height = th;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(src, 0, 0, w, h, 0, 0, tw, th);
  return cv.toDataURL('image/png');
}
