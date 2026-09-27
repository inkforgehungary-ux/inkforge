// INKFORGE — MOTOR-HANGOLAS v3
// MERT TANULSAGOK (valodi kepeken):
//  1) portré 'tonal' aggal: 48% fedettseg, 32 hid, 1 darab -> FELISMERHETO
//  2) ugyanaz 'edge' aggal: 15% fedettseg, 525 hid, 129 darab -> SZETESETT
//  3) vilagos portré: 'flat' besorolas -> tonal 0% -> URES KIMENET (hiba volt)
//  => FOTOHOZ A 'tonal' AZ ELSO, es ha 0%-ot ad, valtunk 'edge'-re.

// ---------- MERES ----------
export function measureV2(gray, w, h) {
  let s = 0, s2 = 0;
  for (let i = 0; i < gray.length; i++) { s += gray[i]; s2 += gray[i] * gray[i]; }
  const mean = s / gray.length;
  const std = Math.sqrt(Math.max(0, s2 / gray.length - mean * mean));

  let soft = 0, hard = 0, n = 0, cornerCount = 0;
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const i = y * w + x; n++;
      const gx = Math.abs(gray[i + 1] - gray[i - 1]);
      const gy = Math.abs(gray[i + w] - gray[i - w]);
      const m = gx + gy;
      if (m > 30) soft++;
      if (m > 90) hard++;
      if (gx > 25 && gy > 25) cornerCount++;
    }
  }
  const softEdge = soft / (n || 1);
  const hardEdge = hard / (n || 1);
  const cornerRatio = cornerCount / (n || 1);
  const polarity = mean < 118 ? 'dark' : 'light';

  // Egyszerusitett, MERT alapu besorolas:
  //  - keves el egyaltalan  -> 'flat' -> de a FOTOT is ide soroljuk, ha van elteres
  //  - vilagos hatter + egeszseges el -> 'lineart'
  //  - minden mas -> 'photo' (a tonal ag az elso)
  let kind;
  if (softEdge < 0.06 && std < 25) kind = 'flat';
  else if (polarity === 'light' && hardEdge > 0.08 && softEdge < 0.16) kind = 'lineart';
  else kind = 'photo';

  // A FOTOHOZ a 'tonal' — ez a mert bizonyitek
  const branch = kind === 'lineart' ? 'lineart' : 'tonal';

  const verdict = mean < 60 ? 'nagyon sotet' : mean < 100 ? 'sotet' : mean > 200 ? 'nagyon vilagos' : 'kozepes';

  let readiness, readinessText;
  if (kind === 'flat') {
    readiness = 'too-plain';
    readinessText = 'A kep nagyon egyszeru — keves a forma. Kis emblema vagy egyszeru rajz eseten ez jo, fotohoz nem.';
  } else if (kind === 'photo') {
    readiness = 'needs-prep';
    readinessText = 'Fotobol dolgozunk: a motor a tomeges format keresi. A legjobb eredmenyhez noveld a kontrasztot.';
  } else {
    readiness = 'ready';
    readinessText = 'A kep alkalmas stencil-keszitesre.';
  }

  return {
    mean: Math.round(mean * 10) / 10,
    std: Math.round(std * 10) / 10,
    softEdge: Math.round(softEdge * 1000) / 1000,
    hardEdge: Math.round(hardEdge * 1000) / 1000,
    cornerRatio: Math.round(cornerRatio * 1000) / 1000,
    polarity: polarity,
    kind: kind,
    readiness: readiness,
    readinessText: readinessText,
    verdict: verdict,
    branch: branch
  };
}

// ---------- AUTO GAMMA ----------
export function autoGamma(coverage) {
  if (coverage < 0.20) return 0.75;
  if (coverage < 0.30) return 0.90;
  if (coverage < 0.40) return 1.00;
  if (coverage < 0.50) return 1.45;
  if (coverage < 0.60) return 1.90;
  return 2.40;
}

// ---------- FOTO -> KONTUR (tartalek ag) ----------
export function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h);
  const out = new Uint8Array(w * h);
  const d = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / d;
      acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / d;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

export function photoToContour(gray, w, h, opts) {
  const o = opts || {};
  const thr = o.threshold !== undefined ? o.threshold : 0.24;
  const blurR = o.blur || 3;
  const bg = boxBlur(gray, w, h, 24);
  const flat = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) flat[i] = Math.min(255, Math.max(0, 128 + (gray[i] - bg[i]) * 3));
  const soft = boxBlur(flat, w, h, blurR);
  const edges = cannyLocal(soft, w, h, thr * 0.5, thr);
  const closed = dilateLocal(erodeLocal(edges, w, h, 1), w, h, 1);
  return { img: closed, branch: 'edge', threshold: thr };
}

function cannyLocal(g, w, h, lo, hi) {
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h), mag = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const a = g[i - w - 1], b = g[i - w], c = g[i - w + 1];
    const d = g[i - 1], f = g[i + 1];
    const gg = g[i + w - 1], hh = g[i + w], k = g[i + w + 1];
    const sx = (c + 2 * f + k) - (a + 2 * d + gg);
    const sy = (gg + 2 * hh + k) - (a + 2 * b + c);
    gx[i] = sx; gy[i] = sy;
    mag[i] = Math.sqrt(sx * sx + sy * sy);
  }
  let maxM = 0;
  for (let i = 0; i < w * h; i++) if (mag[i] > maxM) maxM = mag[i];
  if (maxM === 0) return new Uint8Array(w * h);
  const norm = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) norm[i] = mag[i] / maxM;
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (norm[i] < lo) continue;
    const deg = ((Math.atan2(gy[i], gx[i]) * 180 / Math.PI) + 180) % 180;
    let a1x = 1, a1y = 0, a2x = -1, a2y = 0;
    if (deg < 22.5 || deg >= 157.5) { a1x = 1; a1y = 0; a2x = -1; a2y = 0; }
    else if (deg < 67.5) { a1x = 1; a1y = 1; a2x = -1; a2y = -1; }
    else if (deg < 112.5) { a1x = 0; a1y = 1; a2x = 0; a2y = -1; }
    else { a1x = 1; a1y = -1; a2x = -1; a2y = 1; }
    const p1 = norm[(y + a1y) * w + (x + a1x)];
    const p2 = norm[(y + a2y) * w + (x + a2x)];
    if (norm[i] >= p1 && norm[i] >= p2) out[i] = norm[i] >= hi ? 255 : 128;
  }
  const changed = new Uint8Array(w * h);
  let any = true;
  while (any) {
    any = false;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (out[i] !== 128 || changed[i]) continue;
      let strong = false;
      for (let dy = -1; dy <= 1 && !strong; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (out[(y + dy) * w + (x + dx)] === 255) { strong = true; break; }
      }
      if (strong) { out[i] = 255; changed[i] = 1; any = true; }
    }
  }
  const fin = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) fin[i] = out[i] === 255 ? 255 : 0;
  return fin;
}

function erodeLocal(src, w, h, r) {
  const o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 255;
    for (let dy = -r; dy <= r; dy++) {
      const yy = y + dy; if (yy < 0 || yy >= h) continue;
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx; if (xx < 0 || xx >= w) continue;
        const p = src[yy * w + xx]; if (p < v) v = p;
      }
    }
    o[y * w + x] = v;
  }
  return o;
}

function dilateLocal(src, w, h, r) {
  const o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (let dy = -r; dy <= r; dy++) {
      const yy = y + dy; if (yy < 0 || yy >= h) continue;
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx; if (xx < 0 || xx >= w) continue;
        const p = src[yy * w + xx]; if (p > v) v = p;
      }
    }
    o[y * w + x] = v;
  }
  return o;
}

export const TUNING_VERSION = '3.0.0';
