// INKFORGE STENCIL ENGINE v2 — tiszta fuggvenyek, DOM nelkul.
// Otsu, top-hat, Canny, diszk-morfologia, tavolmezo, hidak, lyuk-kitклtes,
// tobb-reteg, szin-bontas, nyomtatasi meret.

const MM_PER_INCH = 25.4;

export function toGray(rgba, w, h) {
  const g = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = rgba[i * 4], gg = rgba[i * 4 + 1], b = rgba[i * 4 + 2], a = rgba[i * 4 + 3];
    const l = (0.299 * r + 0.587 * gg + 0.114 * b) | 0;
    g[i] = a === 255 ? l : ((l * a + 255 * (255 - a)) / 255 | 0);
  }
  return g;
}

export function histogram(a) {
  const h = new Uint32Array(256);
  for (let i = 0; i < a.length; i++) h[a[i]]++;
  return h;
}

export function stats(a) {
  let s = 0, s2 = 0;
  for (let i = 0; i < a.length; i++) { s += a[i]; s2 += a[i] * a[i]; }
  const m = s / a.length;
  return { mean: m, std: Math.sqrt(Math.max(0, s2 / a.length - m * m)) };
}

export function otsu(a) {
  const h = histogram(a), n = a.length;
  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * h[t];
  let wB = 0, sumB = 0, maxV = -1, best = 128;
  for (let t = 0; t < 256; t++) {
    wB += h[t];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += t * h[t];
    const mB = sumB / wB, mF = (sumAll - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxV) { maxV = v; best = t; }
  }
  return best;
}

export function stretch(a, clipPct) {
  const clip = clipPct === undefined ? 0.01 : clipPct;
  const h = histogram(a), n = a.length;
  let acc = 0, lo = 0, hi = 255;
  for (let i = 0; i < 256; i++) { acc += h[i]; if (acc > n * clip) { lo = i; break; } }
  acc = 0;
  for (let i = 255; i >= 0; i--) { acc += h[i]; if (acc > n * clip) { hi = i; break; } }
  const range = Math.max(1, hi - lo);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.min(255, Math.max(0, Math.round((a[i] - lo) * 255 / range)));
  return out;
}

export function blur5(src, w, h) {
  const k = [1, 4, 6, 4, 1];
  const tmp = new Float32Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0;
    for (let i = -2; i <= 2; i++) s += src[y * w + Math.min(w - 1, Math.max(0, x + i))] * k[i + 2];
    tmp[y * w + x] = s / 16;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0;
    for (let i = -2; i <= 2; i++) s += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * k[i + 2];
    out[y * w + x] = s / 16;
  }
  return out;
}

export function erode(src, w, h, r) {
  const t = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 255;
    for (let i = -r; i <= r; i++) { const p = src[y * w + Math.min(w - 1, Math.max(0, x + i))]; if (p < v) v = p; }
    t[y * w + x] = v;
  }
  const o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 255;
    for (let i = -r; i <= r; i++) { const p = t[Math.min(h - 1, Math.max(0, y + i)) * w + x]; if (p < v) v = p; }
    o[y * w + x] = v;
  }
  return o;
}

export function dilate(src, w, h, r) {
  const t = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (let i = -r; i <= r; i++) { const p = src[y * w + Math.min(w - 1, Math.max(0, x + i))]; if (p > v) v = p; }
    t[y * w + x] = v;
  }
  const o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (let i = -r; i <= r; i++) { const p = t[Math.min(h - 1, Math.max(0, y + i)) * w + x]; if (p > v) v = p; }
    o[y * w + x] = v;
  }
  return o;
}

export function erodeDisk(src, w, h, r) {
  const o = new Uint8Array(w * h), r2 = r * r;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 255;
    for (let dy = -r; dy <= r; dy++) {
      const yy = y + dy; if (yy < 0 || yy >= h) continue;
      const lim = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy)));
      for (let dx = -lim; dx <= lim; dx++) {
        const xx = x + dx; if (xx < 0 || xx >= w) continue;
        const p = src[yy * w + xx]; if (p < v) v = p;
      }
    }
    o[y * w + x] = v;
  }
  return o;
}

export function dilateDisk(src, w, h, r) {
  const o = new Uint8Array(w * h), r2 = r * r;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (let dy = -r; dy <= r; dy++) {
      const yy = y + dy; if (yy < 0 || yy >= h) continue;
      const lim = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy)));
      for (let dx = -lim; dx <= lim; dx++) {
        const xx = x + dx; if (xx < 0 || xx >= w) continue;
        const p = src[yy * w + xx]; if (p > v) v = p;
      }
    }
    o[y * w + x] = v;
  }
  return o;
}

export function open(src, w, h, r) { return dilate(erode(src, w, h, r), w, h, r); }
export function close(src, w, h, r) { return erode(dilate(src, w, h, r), w, h, r); }

export function distanceField(mask, w, h) {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = mask[i] > 0 ? INF : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (d[i] === 0) continue;
    let m = d[i];
    if (y > 0) m = Math.min(m, d[i - w] + 3);
    if (x > 0) m = Math.min(m, d[i - 1] + 3);
    if (x > 0 && y > 0) m = Math.min(m, d[i - w - 1] + 4);
    if (x < w - 1 && y > 0) m = Math.min(m, d[i - w + 1] + 4);
    d[i] = m;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (d[i] === 0) continue;
    let m = d[i];
    if (y < h - 1) m = Math.min(m, d[i + w] + 3);
    if (x < w - 1) m = Math.min(m, d[i + 1] + 3);
    if (x < w - 1 && y < h - 1) m = Math.min(m, d[i + w + 1] + 4);
    if (x > 0 && y < h - 1) m = Math.min(m, d[i + w - 1] + 4);
    d[i] = m;
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = Math.min(255, Math.round(d[i] / 3));
  return out;
}

export function cannyEdges(gray, w, h, low, high) {
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h), mag = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const a = gray[i - w - 1], b = gray[i - w], c = gray[i - w + 1];
    const d = gray[i - 1], f = gray[i + 1];
    const g = gray[i + w - 1], hh = gray[i + w], k = gray[i + w + 1];
    const sx = (c + 2 * f + k) - (a + 2 * d + g);
    const sy = (g + 2 * hh + k) - (a + 2 * b + c);
    gx[i] = sx; gy[i] = sy;
    mag[i] = Math.sqrt(sx * sx + sy * sy);
  }
  let maxM = 0;
  for (let i = 0; i < w * h; i++) if (mag[i] > maxM) maxM = mag[i];
  if (maxM === 0) return new Uint8Array(w * h);
  const norm = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) norm[i] = mag[i] / maxM;
  const thrLow = low === undefined ? 0.08 : low;
  const thrHigh = high === undefined ? 0.20 : high;
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (norm[i] < thrLow) continue;
    const ang = Math.atan2(gy[i], gx[i]);
    let a1x = 1, a1y = 0, a2x = -1, a2y = 0;
    const deg = ((ang * 180 / Math.PI) + 180) % 180;
    if (deg < 22.5 || deg >= 157.5) { a1x = 1; a1y = 0; a2x = -1; a2y = 0; }
    else if (deg < 67.5) { a1x = 1; a1y = 1; a2x = -1; a2y = -1; }
    else if (deg < 112.5) { a1x = 0; a1y = 1; a2x = 0; a2y = -1; }
    else { a1x = 1; a1y = -1; a2x = -1; a2y = 1; }
    const p1 = norm[(y + a1y) * w + (x + a1x)];
    const p2 = norm[(y + a2y) * w + (x + a2x)];
    if (norm[i] >= p1 && norm[i] >= p2) out[i] = norm[i] >= thrHigh ? 255 : 128;
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
  const final = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) final[i] = out[i] === 255 ? 255 : 0;
  return final;
}

export function components(src, w, h) {
  const labels = new Int32Array(w * h);
  const statsArr = [];
  const q = new Int32Array(w * h);
  let next = 1;
  for (let i = 0; i < w * h; i++) {
    if (src[i] === 0 || labels[i] !== 0) continue;
    const lbl = next++;
    let qh = 0, qt = 0;
    q[qt++] = i; labels[i] = lbl;
    let area = 0, sx = 0, sy = 0, minx = w, maxx = 0, miny = h, maxy = 0;
    while (qh < qt) {
      const p = q[qh++], py = (p / w) | 0, px = p % w;
      area++; sx += px; sy += py;
      if (px < minx) minx = px; if (px > maxx) maxx = px;
      if (py < miny) miny = py; if (py > maxy) maxy = py;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const np = ny * w + nx;
        if (src[np] !== 0 && labels[np] === 0) { labels[np] = lbl; q[qt++] = np; }
      }
    }
    statsArr.push({ label: lbl, area: area, cx: sx / area, cy: sy / area, minx: minx, maxx: maxx, miny: miny, maxy: maxy });
  }
  return { labels: labels, stats: statsArr };
}

export function addBridges(src, w, h, opts) {
  const o = opts || {};
  const thickness = Math.max(1, o.bridgePx || 3);
  const maxLen = o.maxLen || Math.round(Math.max(w, h) * 0.22);
  const minArea = o.minArea || Math.max(20, Math.round(w * h * 0.00008));
  const comp = components(src, w, h);
  const labels = comp.labels;
  const st = comp.stats.slice();
  if (st.length <= 1) return { img: src.slice(), bridges: 0, components: st.length, added: [] };
  const out = src.slice();
  st.sort(function (a, b) { return b.area - a.area; });
  const mainLabel = st[0].label;
  const added = [];
  let bridges = 0;
  for (let s = 1; s < st.length; s++) {
    const c = st[s];
    if (c.area < minArea) continue;
    let best = Infinity, bp = null;
    const y0 = Math.max(0, c.miny - maxLen), y1 = Math.min(h, c.maxy + maxLen);
    const x0 = Math.max(0, c.minx - maxLen), x1 = Math.min(w, c.maxx + maxLen);
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
      const lb = labels[y * w + x];
      if (lb === 0 || lb === c.label || lb !== mainLabel) continue;
      const d = (x - c.cx) * (x - c.cx) + (y - c.cy) * (y - c.cy);
      if (d < best) { best = d; bp = [x, y]; }
    }
    if (!bp) continue;
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
    added.push({ from: [xa, ya], to: bp, len: Math.round(Math.sqrt(best)) });
    bridges++;
  }
  const comp2 = components(out, w, h);
  const st2 = comp2.stats.slice().sort(function (a, b) { return b.area - a.area; });
  if (st2.length > 1) {
    for (let s = 1; s < st2.length; s++) {
      const c = st2[s];
      if (c.area < minArea) continue;
      const dl = c.cx, dr = w - c.cx, dt = c.cy, db = h - c.cy;
      const m = Math.min(dl, dr, dt, db);
      if (m > maxLen) continue;
      const tgt = m === dl ? [0, Math.round(c.cy)] : m === dr ? [w - 1, Math.round(c.cy)]
        : m === dt ? [Math.round(c.cx), 0] : [Math.round(c.cx), h - 1];
      const xa = Math.round(c.cx), ya = Math.round(c.cy);
      const steps = Math.max(Math.abs(tgt[0] - xa), Math.abs(tgt[1] - ya)) || 1;
      const rad = Math.max(0, Math.floor(thickness / 2));
      for (let t = 0; t <= steps; t++) {
        const x = Math.round(xa + (tgt[0] - xa) * t / steps);
        const y = Math.round(ya + (tgt[1] - ya) * t / steps);
        for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) out[ny * w + nx] = 255;
        }
      }
      bridges++;
    }
  }
  return { img: out, bridges: bridges, components: st.length, added: added };
}

export function cleanMask(src, w, h, minAreaPx) {
  const minA = minAreaPx || 20;
  const comp = components(src, w, h);
  const labels = comp.labels, st = comp.stats;
  const out = new Uint8Array(w * h);
  let removed = 0, kept = 0;
  const keep = new Uint8Array(st.length + 1);
  for (let s = 0; s < st.length; s++) {
    if (st[s].area >= minA) { keep[st[s].label] = 1; kept++; } else removed++;
  }
  for (let i = 0; i < w * h; i++) { const lb = labels[i]; if (lb !== 0 && keep[lb]) out[i] = 255; }
  return { img: out, removed: removed, kept: kept };
}

export function fillHoles(src, w, h) {
  const inv = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) inv[i] = src[i] ? 0 : 255;
  const comp = components(inv, w, h);
  const border = new Uint8Array(comp.stats.length + 1);
  for (let s = 0; s < comp.stats.length; s++) {
    const st = comp.stats[s];
    if (st.minx === 0 || st.miny === 0 || st.maxx === w - 1 || st.maxy === h - 1) border[st.label] = 1;
  }
  const out = src.slice();
  let filled = 0;
  for (let i = 0; i < w * h; i++) {
    const lb = comp.labels[i];
    if (src[i] === 0 && lb !== 0 && !border[lb]) { out[i] = 255; filled++; }
  }
  return { img: out, filled: filled };
}

export function enforceStrokeWidth(mask, w, h, targetPx) {
  if (!targetPx || targetPx <= 0) return mask.slice();
  const r = Math.max(0, Math.round(targetPx * 0.5));
  if (r <= 0) return mask.slice();
  return dilateDisk(mask, w, h, r);
}

export function measure(gray, w, h) {
  const s = stats(gray);
  const otsuT = otsu(gray);
  let c = 0, n = 0;
  for (let y = 1; y < h - 1; y += 2) for (let x = 1; x < w - 1; x += 2) {
    const i = y * w + x; n++;
    if (Math.abs(gray[i + 1] - gray[i - 1]) + Math.abs(gray[i + w] - gray[i - w]) > 55) c++;
  }
  const edgeRatio = c / (n || 1);
  const verdict = s.mean < 60 ? 'nagyon sotet' : s.mean < 100 ? 'sotet' : s.mean > 200 ? 'nagyon vilagos' : 'kozepes';
  const branch = (s.mean < 115 && edgeRatio > 0.10) ? 'lineart' : 'tonal';
  return {
    mean: Math.round(s.mean * 10) / 10,
    std: Math.round(s.std * 10) / 10,
    otsu: otsuT,
    edgeRatio: Math.round(edgeRatio * 1000) / 1000,
    verdict: verdict,
    branch: branch
  };
}

export function branchLineArt(gray, w, h, gain) {
  const bg = close(gray, w, h, 4);
  const bh = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) bh[i] = Math.max(0, bg[i] - gray[i]);
  const g = gain || 1;
  for (let i = 0; i < w * h; i++) bh[i] = Math.min(255, Math.round(bh[i] * g * 2.2));
  const t = otsu(bh);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = bh[i] > t ? 255 : 0;
  return { img: out, threshold: t, branch: 'lineart' };
}

export function branchTonal(gray, w, h, gamma) {
  const gm = gamma || 1;
  const adj = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const v = gray[i] / 255;
    adj[i] = Math.min(255, Math.round(Math.pow(v, gm) * 255));
  }
  const t = otsu(adj);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = adj[i] < t ? 255 : 0;
  return { img: out, threshold: t, branch: 'tonal' };
}

export function finalPolish(mask, w, h, round) {
  const r = round === undefined ? 1 : round;
  if (r <= 0) return mask.slice();
  let m = erodeDisk(mask, w, h, r);
  m = dilateDisk(m, w, h, r);
  m = dilateDisk(m, w, h, r);
  m = erodeDisk(m, w, h, r);
  return m;
}

export function runPipeline(gray, w, h, opts) {
  const o = opts || {};
  const report = measure(gray, w, h);
  const branchWanted = o.branch && o.branch !== 'auto' ? o.branch : report.branch;
  const norm = stretch(gray, 0.01);
  const soft = blur5(norm, w, h);

  let res;
  if (branchWanted === 'lineart') res = branchLineArt(soft, w, h, o.contrast);
  else if (branchWanted === 'edge') res = { img: cannyEdges(soft, w, h, o.lowThr, o.highThr), threshold: -1, branch: 'edge' };
  else res = branchTonal(soft, w, h, o.gamma);

  let img = res.img;

  if (o.strokePx && o.strokePx > 0) img = enforceStrokeWidth(img, w, h, o.strokePx);
  else {
    const st = o.baseStroke === undefined ? 1 : o.baseStroke;
    if (st > 0) img = dilateDisk(img, w, h, st);
  }

  const opened = open(img, w, h, o.morph === undefined ? 1 : o.morph);
  const cleaned = cleanMask(opened, w, h, o.minArea || 20);

  let filledImg = cleaned.img;
  let filledCount = 0;
  if (o.fillHoles) { const f = fillHoles(cleaned.img, w, h); filledImg = f.img; filledCount = f.filled; }

  const bridged = addBridges(filledImg, w, h, {
    bridgePx: o.bridgePx || 3,
    minArea: o.minArea || 20,
    maxLen: o.maxBridgeLen
  });

  const final = finalPolish(bridged.img, w, h, o.polish === undefined ? 1 : o.polish);

  let coverage = 0;
  for (let i = 0; i < final.length; i++) if (final[i]) coverage++;
  coverage /= (w * h);

  const finalComp = components(final, w, h);
  const bigPieces = finalComp.stats.filter(function (s) { return s.area >= (o.minArea || 20); }).length;

  report.branchUsed = res.branch;
  report.threshold = res.threshold;
  report.bridges = bridged.bridges;
  report.coverage = Math.round(coverage * 10000) / 100;
  report.islands = bigPieces;
  report.holesFilled = filledCount;
  report.quality = coverage < 0.02 ? 'tul ritka' : coverage > 0.40 ? 'tul fedett' : (bigPieces > 1 ? 'hidakkal javithato' : 'hasznalhato');
  report.verdictText = coverage < 0.02 ? 'Tul keves festek jut at — noveld a kontrasztot.'
    : coverage > 0.40 ? 'Tul sok a fedett terulet — a sablon hasznalhatatlan.'
    : (bigPieces > 1 ? 'Tobb kulon darab — hidak nelkul kieshet.' : 'Nyomtatasra kesz.');

  return { mask: final, report: report, bridgeList: bridged.added || [] };
}

export function toPrintSize(mask, w, h, widthMm, dpi) {
  const d = dpi || 300;
  const pxPerMm = d / MM_PER_INCH;
  const targetW = Math.max(1, Math.round(widthMm * pxPerMm));
  const targetH = Math.max(1, Math.round(h * targetW / w));
  const out = new Uint8Array(targetW * targetH);
  const xr = w / targetW, yr = h / targetH;
  for (let y = 0; y < targetH; y++) {
    const sy = Math.min(h - 1, y * yr);
    const y0 = Math.floor(sy), y1 = Math.min(h - 1, y0 + 1), fy = sy - y0;
    for (let x = 0; x < targetW; x++) {
      const sx = Math.min(w - 1, x * xr);
      const x0 = Math.floor(sx), x1 = Math.min(w - 1, x0 + 1), fx = sx - x0;
      const v00 = mask[y0 * w + x0], v01 = mask[y0 * w + x1];
      const v10 = mask[y1 * w + x0], v11 = mask[y1 * w + x1];
      const top = v00 + (v01 - v00) * fx;
      const bot = v10 + (v11 - v10) * fx;
      const v = top + (bot - top) * fy;
      out[y * targetW + x] = v > 110 ? 255 : 0;
    }
  }
  return {
    img: out, width: targetW, height: targetH, dpi: d,
    widthMm: Math.round(targetW / pxPerMm * 100) / 100,
    heightMm: Math.round(targetH / pxPerMm * 100) / 100,
    pxPerMm: Math.round(pxPerMm * 1000) / 1000
  };
}

export function registrationMarks(w, h, size) {
  const s = size || Math.round(Math.min(w, h) * 0.03);
  const m = Math.round(s * 0.6);
  const canvas = new Uint8Array(w * h);
  function cross(cx, cy) {
    for (let i = -s; i <= s; i++) {
      const x = cx + i, y = cy;
      if (x >= 0 && x < w && y >= 0 && y < h) canvas[y * w + x] = 255;
      const x2 = cx, y2 = cy + i;
      if (x2 >= 0 && x2 < w && y2 >= 0 && y2 < h) canvas[y2 * w + x2] = 255;
    }
  }
  cross(m + s, m + s);
  cross(w - m - s, m + s);
  cross(m + s, h - m - s);
  cross(w - m - s, h - m - s);
  return canvas;
}

export function multiLayer(gray, w, h, layers, opts) {
  const n = Math.max(2, Math.min(6, layers || 2));
  const o = opts || {};
  const outs = [];
  const edges = [0];
  for (let i = 1; i < n; i++) edges.push(Math.round(255 * i / n));
  edges.push(256);
  for (let i = 0; i < n; i++) {
    const lo = edges[i], hi = edges[i + 1];
    const m = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) { const v = gray[p]; if (v >= lo && v < hi) m[p] = 255; }
    const cl = cleanMask(open(m, w, h, 1), w, h, o.minArea || 20);
    const br = o.bridges ? addBridges(cl.img, w, h, { bridgePx: o.bridgePx || 3, minArea: o.minArea || 20 }) : { img: cl.img, bridges: 0 };
    outs.push({ index: i, lo: lo, hi: hi, mask: br.img, bridges: br.bridges });
  }
  return outs;
}

export function colorLayers(rgba, w, h, maxColors) {
  const n = Math.max(2, Math.min(8, maxColors || 3));
  const px = [];
  const step = Math.max(1, Math.floor((w * h) / 20000));
  for (let i = 0; i < w * h; i += step) {
    if (rgba[i * 4 + 3] < 30) continue;
    px.push([rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]);
  }
  if (px.length < n) return [];
  const centers = [];
  for (let i = 0; i < n; i++) centers.push(px[Math.floor(px.length * (i + 0.5) / n)].slice());
  const assign = new Int32Array(px.length);
  for (let iter = 0; iter < 12; iter++) {
    let moved = 0;
    for (let i = 0; i < px.length; i++) {
      let bd = Infinity, bi = 0;
      for (let c = 0; c < n; c++) {
        const dr = px[i][0] - centers[c][0], dg = px[i][1] - centers[c][1], db = px[i][2] - centers[c][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bd) { bd = d; bi = c; }
      }
      if (assign[i] !== bi) { assign[i] = bi; moved++; }
    }
    const sums = [], counts = [];
    for (let c = 0; c < n; c++) { sums.push([0, 0, 0]); counts.push(0); }
    for (let i = 0; i < px.length; i++) {
      const c = assign[i];
      sums[c][0] += px[i][0]; sums[c][1] += px[i][1]; sums[c][2] += px[i][2];
      counts[c]++;
    }
    for (let c = 0; c < n; c++) if (counts[c]) centers[c] = [sums[c][0] / counts[c], sums[c][1] / counts[c], sums[c][2] / counts[c]];
    if (!moved) break;
  }
  const masks = [];
  for (let c = 0; c < n; c++) masks.push(new Uint8Array(w * h));
  for (let i = 0; i < w * h; i++) {
    if (rgba[i * 4 + 3] < 30) continue;
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    let bd = Infinity, bi = 0;
    for (let c = 0; c < n; c++) {
      const dr = r - centers[c][0], dg = g - centers[c][1], db = b - centers[c][2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bd) { bd = d; bi = c; }
    }
    masks[bi][i] = 255;
  }
  const out = [];
  for (let c = 0; c < n; c++) {
    let hex = '#';
    for (let k = 0; k < 3; k++) hex += Math.round(centers[c][k]).toString(16).padStart(2, '0');
    const cl = cleanMask(masks[c], w, h, 40);
    out.push({ index: c, hex: hex, mask: cl.img });
  }
  return out;
}

export function outlineOnly(mask, w, h, thickness) {
  const t = thickness === undefined ? 1 : thickness;
  if (t <= 0) return mask.slice();
  const er = erodeDisk(mask, w, h, t);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = mask[i] && !er[i] ? 255 : 0;
  return out;
}

export const ENGINE_VERSION = '2.0.0';
