// InkForge - stencil motor
function histOf(a) { const h = new Uint32Array(256); for (let i = 0; i < a.length; i++) h[a[i]]++; return h; }
function statsOf(a) { let s = 0, s2 = 0; for (let i = 0; i < a.length; i++) { s += a[i]; s2 += a[i] * a[i]; } const m = s / a.length; return { mean: m, std: Math.sqrt(s2 / a.length - m * m) }; }
function otsuOf(a) {
  const h = histOf(a), n = a.length; let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * h[t];
  let wB = 0, sumB = 0, maxV = -1, best = 128;
  for (let t = 0; t < 256; t++) { wB += h[t]; if (!wB) continue; const wF = n - wB; if (!wF) break; sumB += t * h[t]; const mB = sumB / wB, mF = (sumAll - sumB) / wF; const v = wB * wF * (mB - mF) * (mB - mF); if (v > maxV) { maxV = v; best = t; } }
  return best;
}
function edgeRatioOf(a, w, h) { let c = 0, n = 0; for (let y = 1; y < h - 1; y += 2) for (let x = 1; x < w - 1; x += 2) { const i = y * w + x; n++; if (Math.abs(a[i + 1] - a[i - 1]) + Math.abs(a[i + w] - a[i - w]) > 55) c++; } return c / n; }

function measure(gray, w, h) {
  const s = statsOf(gray), otsu = otsuOf(gray), edgeRatio = edgeRatioOf(gray, w, h);
  const verdict = s.mean < 60 ? 'nagyon sotet' : s.mean < 100 ? 'sotet' : s.mean > 200 ? 'nagyon vilagos' : 'kozepes';
  const branch = (s.mean < 110 && edgeRatio > 0.12) ? 'tophat' : 'otsu';
  return { mean: s.mean, std: s.std, otsu: otsu, edgeRatio: edgeRatio, verdict: verdict, branch: branch };
}

function stretch(a) {
  const h = histOf(a), n = a.length; let acc = 0, lo = 0, hi = 255;
  for (let i = 0; i < 256; i++) { acc += h[i]; if (acc > n * 0.01) { lo = i; break; } }
  acc = 0; for (let i = 255; i >= 0; i--) { acc += h[i]; if (acc > n * 0.01) { hi = i; break; } }
  const range = Math.max(1, hi - lo), out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.min(255, Math.max(0, Math.round((a[i] - lo) * 255 / range)));
  return out;
}

function blur5(src, w, h) {
  const k = [1, 4, 6, 4, 1], tmp = new Float32Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let i = -2; i <= 2; i++) s += src[y * w + Math.min(w - 1, Math.max(0, x + i))] * k[i + 2]; tmp[y * w + x] = s / 16; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let i = -2; i <= 2; i++) s += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * k[i + 2]; out[y * w + x] = s / 16; }
  return out;
}

function morph(src, w, h, k, mode) {
  const r = Math.floor(k / 2), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = mode === 'dilate' ? 0 : 255;
    for (let dy = -r; dy <= r; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue; for (let dx = -r; dx <= r; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; const p = src[yy * w + xx]; if (mode === 'dilate') { if (p > v) v = p; } else { if (p < v) v = p; } } }
    out[y * w + x] = v;
  }
  return out;
}

function branchOtsu(gray, w, h, offset) {
  const t = otsuOf(gray) + (offset || 0), out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = gray[i] < t ? 255 : 0;
  return { img: out, threshold: t };
}

function branchTopHat(gray, w, h, k) {
  const kk = k || 5;
  const kernel = kk % 2 === 0 ? kk + 1 : kk;
  const closed = morph(morph(gray, w, h, kernel, 'dilate'), w, h, kernel, 'erode');
  const bh = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) bh[i] = Math.max(0, closed[i] - gray[i]);
  const t = otsuOf(bh), out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = bh[i] > t ? 255 : 0;
  return { img: out, threshold: t };
}

function components(src, w, h) {
  const labels = new Int32Array(w * h), statsArr = [], q = new Int32Array(w * h);
  let next = 1;
  for (let i = 0; i < w * h; i++) {
    if (src[i] === 0 || labels[i] !== 0) continue;
    const lbl = next++; let qh = 0, qt = 0; q[qt++] = i; labels[i] = lbl;
    let area = 0, sx = 0, sy = 0, minx = w, maxx = 0, miny = h, maxy = 0;
    while (qh < qt) {
      const p = q[qh++], py = (p / w) | 0, px = p % w;
      area++; sx += px; sy += py;
      if (px < minx) minx = px; if (px > maxx) maxx = px; if (py < miny) miny = py; if (py > maxy) maxy = py;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = px + dx, ny = py + dy; if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue; const np = ny * w + nx; if (src[np] !== 0 && labels[np] === 0) { labels[np] = lbl; q[qt++] = np; } }
    }
    statsArr.push({ label: lbl, area: area, cx: sx / area, cy: sy / area, minx: minx, maxx: maxx, miny: miny, maxy: maxy });
  }
  return { labels: labels, stats: statsArr };
}

function addBridges(src, w, h, opts) {
  const o = opts || {};
  const thickness = o.thickness || 3, radius = o.searchRadius || 70, minArea = o.minArea || 40;
  const comp = components(src, w, h);
  const labels = comp.labels, st = comp.stats;
  if (st.length <= 1) return { img: src, bridges: 0, components: st.length };
  const out = src.slice();
  st.sort(function (a, b) { return b.area - a.area; });
  const mainLabel = st[0].label; let bridges = 0;
  for (let s = 1; s < st.length; s++) {
    const c = st[s]; if (c.area < minArea) continue;
    let best = Infinity, bp = null;
    for (let y = Math.max(0, c.miny - radius); y < Math.min(h, c.maxy + radius); y += 2)
      for (let x = Math.max(0, c.minx - radius); x < Math.min(w, c.maxx + radius); x += 2) {
        if (labels[y * w + x] !== mainLabel) continue;
        const d = (x - c.cx) * (x - c.cx) + (y - c.cy) * (y - c.cy);
        if (d < best) { best = d; bp = [x, y]; }
      }
    if (!bp) {
      const dl = c.cx, dr = w - c.cx, dt = c.cy, db = h - c.cy, m = Math.min(dl, dr, dt, db);
      bp = m === dl ? [0, Math.round(c.cy)] : m === dr ? [w - 1, Math.round(c.cy)] : m === dt ? [Math.round(c.cx), 0] : [Math.round(c.cx), h - 1];
    }
    const x0 = Math.round(c.cx), y0 = Math.round(c.cy), x1 = bp[0], y1 = bp[1];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1, rad = Math.floor(thickness / 2);
    for (let t = 0; t <= steps; t++) {
      const x = Math.round(x0 + (x1 - x0) * t / steps), y = Math.round(y0 + (y1 - y0) * t / steps);
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < w && ny >= 0 && ny < h) out[ny * w + nx] = 255; }
    }
    bridges++;
  }
  return { img: out, bridges: bridges, components: st.length };
}

function cleanMask(src, w, h, minArea) {
  const comp = components(src, w, h), labels = comp.labels, st = comp.stats;
  const out = new Uint8Array(w * h);
  let removed = 0, kept = 0;
  for (let s = 0; s < st.length; s++) {
    const stt = st[s];
    if (stt.area >= (minArea || 20)) { kept++; for (let i = 0; i < w * h; i++) if (labels[i] === stt.label) out[i] = 255; } else removed++;
  }
  return { img: out, removed: removed, kept: kept };
}

export function runPipeline(gray, w, h, opts) {
  const o = opts || {};
  const report = measure(gray, w, h);
  const branch = o.forceBranch || report.branch;
  const norm = stretch(gray);
  const blurred = blur5(norm, w, h);
  const res = branch === 'tophat' ? branchTopHat(blurred, w, h, o.topHatKernel) : branchOtsu(blurred, w, h, o.otsuOffset);
  const opened = morph(morph(res.img, w, h, 2, 'erode'), w, h, 2, 'dilate');
  const br = addBridges(opened, w, h, { thickness: o.bridgeWidth ? Math.round(o.bridgeWidth * 3) : 3, searchRadius: o.bridgeSearchRadius || 70, minArea: o.bridgeMinArea || 40 });
  const cl = cleanMask(br.img, w, h, o.minArea || 20);
  let coverage = 0;
  for (let i = 0; i < cl.img.length; i++) if (cl.img[i]) coverage++;
  coverage /= (w * h);
  report.branchUsed = branch;
  report.bridges = br.bridges;
  report.componentsKept = cl.kept;
  report.noiseRemoved = cl.removed;
  report.coverage = coverage;
  report.quality = coverage < 0.05 ? 'tul ritka' : coverage > 0.35 ? 'tul fedett' : 'hasznalhato';
  return { mask: cl.img, report: report };
}

export function toPrintSize(mask, w, h, widthMm, dpi) {
  const d = dpi || 300;
  const pxPerMm = d / 25.4;
  const targetW = Math.round(widthMm * pxPerMm), targetH = Math.round(h * targetW / w);
  const out = new Uint8Array(targetW * targetH);
  for (let y = 0; y < targetH; y++) {
    const sy = Math.min(h - 1, Math.floor(y * h / targetH));
    for (let x = 0; x < targetW; x++) {
      const sx = Math.min(w - 1, Math.floor(x * w / targetW));
      out[y * targetW + x] = mask[sy * w + sx];
    }
  }
  return {
    img: out, width: targetW, height: targetH, dpi: d,
    widthMm: Math.round(targetW / pxPerMm * 100) / 100,
    heightMm: Math.round(targetH / pxPerMm * 100) / 100,
    pxPerMm: Math.round(pxPerMm * 1000) / 1000,
  };
}

export default { runPipeline: runPipeline, toPrintSize: toPrintSize };
