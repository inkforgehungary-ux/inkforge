'use strict';

// Node/CommonJS adapter a pipeline tesztekhez.
// Az algoritmus szandekosan a kliensoldali motorral azonos logikat hasznal.

function histOf(a) {
  const h = new Uint32Array(256);
  for (let i = 0; i < a.length; i++) h[a[i]]++;
  return h;
}

function statsOf(a) {
  if (!a.length) return { mean: 0, std: 0 };
  let s = 0, s2 = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i];
    s2 += a[i] * a[i];
  }
  const m = s / a.length;
  return { mean: m, std: Math.sqrt(Math.max(0, s2 / a.length - m * m)) };
}

function otsuOf(a) {
  if (!a.length) return 128;
  const h = histOf(a), n = a.length;
  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * h[t];
  let wB = 0, sumB = 0, maxV = -1, best = 128;

  for (let t = 0; t < 256; t++) {
    wB += h[t];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += t * h[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxV) {
      maxV = v;
      best = t;
    }
  }
  return best;
}

function edgeRatioOf(a, w, h) {
  let c = 0, n = 0;
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const i = y * w + x;
      n++;
      if (Math.abs(a[i + 1] - a[i - 1]) + Math.abs(a[i + w] - a[i - w]) > 55) c++;
    }
  }
  return n ? c / n : 0;
}

function measure(a, w, h) {
  const s = statsOf(a);
  const o = otsuOf(a);
  const e = edgeRatioOf(a, w, h);
  const branch = s.mean < 110 && e > 0.12 ? 'tophat' : 'otsu';
  return {
    mean: s.mean,
    std: s.std,
    otsu: o,
    edgeRatio: e,
    verdict: s.mean < 60 ? 'nagyon sotet' : s.mean < 100 ? 'sotet' : s.mean > 200 ? 'nagyon vilagos' : 'kozepes',
    branch,
  };
}

function stretch(a) {
  if (!a.length) return new Uint8Array(0);
  const h = histOf(a), n = a.length;
  let acc = 0, lo = 0, hi = 255;

  for (let i = 0; i < 256; i++) {
    acc += h[i];
    if (acc > n * 0.01) { lo = i; break; }
  }
  acc = 0;
  for (let i = 255; i >= 0; i--) {
    acc += h[i];
    if (acc > n * 0.01) { hi = i; break; }
  }

  const range = Math.max(1, hi - lo);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.min(255, Math.max(0, Math.round((a[i] - lo) * 255 / range)));
  return out;
}

function blur5(src, w, h) {
  const k = [1, 4, 6, 4, 1];
  const tmp = new Float32Array(w * h);
  const out = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let i = -2; i <= 2; i++) s += src[y * w + Math.min(w - 1, Math.max(0, x + i))] * k[i + 2];
      tmp[y * w + x] = s / 16;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let i = -2; i <= 2; i++) s += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * k[i + 2];
      out[y * w + x] = s / 16;
    }
  }
  return out;
}

function morph(src, w, h, k, mode) {
  const r = Math.floor(k / 2);
  const out = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = mode === 'dilate' ? 0 : 255;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const p = src[yy * w + xx];
          if (mode === 'dilate') {
            if (p > v) v = p;
          } else if (p < v) {
            v = p;
          }
        }
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

function components(src, w, h) {
  const labels = new Int32Array(w * h);
  const stats = [];
  const q = new Int32Array(w * h);
  let next = 1;

  for (let i = 0; i < w * h; i++) {
    if (src[i] === 0 || labels[i]) continue;

    const lbl = next++;
    let qh = 0, qt = 0;
    q[qt++] = i;
    labels[i] = lbl;

    let area = 0, sx = 0, sy = 0;
    let minx = w, maxx = 0, miny = h, maxy = 0;

    while (qh < qt) {
      const p = q[qh++];
      const py = (p / w) | 0;
      const px = p % w;

      area++;
      sx += px;
      sy += py;
      if (px < minx) minx = px;
      if (px > maxx) maxx = px;
      if (py < miny) miny = py;
      if (py > maxy) maxy = py;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = px + dx, ny = py + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const np = ny * w + nx;
          if (src[np] !== 0 && !labels[np]) {
            labels[np] = lbl;
            q[qt++] = np;
          }
        }
      }
    }

    stats.push({ label: lbl, area, cx: sx / area, cy: sy / area, minx, maxx, miny, maxy });
  }

  return { labels, stats };
}

function cleanMask(src, w, h, minArea) {
  const comp = components(src, w, h);
  const keep = new Uint8Array(comp.stats.length + 1);
  let removed = 0, kept = 0;
  const threshold = minArea || 20;

  for (const s of comp.stats) {
    if (s.area >= threshold) {
      keep[s.label] = 1;
      kept++;
    } else {
      removed++;
    }
  }

  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const label = comp.labels[i];
    if (label && keep[label]) out[i] = 255;
  }

  return { img: out, removed, kept };
}

function branchOtsu(gray, w, h) {
  const t = otsuOf(gray);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = gray[i] < t ? 255 : 0;
  return { img: out, threshold: t };
}

function branchTopHat(gray, w, h) {
  const closed = morph(morph(gray, w, h, 5, 'dilate'), w, h, 5, 'erode');
  const bh = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) bh[i] = Math.max(0, closed[i] - gray[i]);
  const t = otsuOf(bh);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = bh[i] > t ? 255 : 0;
  return { img: out, threshold: t };
}

function runPipeline(gray, w, h) {
  if (!(gray instanceof Uint8Array) || !Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0 || gray.length !== w * h) {
    throw new Error('Ervenytelen kepmeret.');
  }

  const report = measure(gray, w, h);
  const norm = stretch(gray);
  const blurred = blur5(norm, w, h);
  const res = report.branch === 'tophat'
    ? branchTopHat(blurred, w, h)
    : branchOtsu(blurred, w, h);

  const opened = morph(morph(res.img, w, h, 2, 'erode'), w, h, 2, 'dilate');
  const cl = cleanMask(opened, w, h, 20);

  let coverage = 0;
  for (let i = 0; i < cl.img.length; i++) if (cl.img[i]) coverage++;
  coverage /= w * h;

  report.branchUsed = report.branch;
  report.bridges = 0;
  report.coverage = coverage;
  report.quality = coverage < 0.05 ? 'tul ritka' : coverage > 0.35 ? 'tul fedett' : 'hasznalhato';
  report.componentsKept = cl.kept;
  report.noiseRemoved = cl.removed;

  return { mask: cl.img, report };
}

function toPrintSize(mask, w, h, widthMm, dpi) {
  const d = dpi || 300;
  const pxPerMm = d / 25.4;
  const targetW = Math.max(1, Math.round(widthMm * pxPerMm));
  const targetH = Math.max(1, Math.round(h * targetW / w));
  const out = new Uint8Array(targetW * targetH);

  for (let y = 0; y < targetH; y++) {
    const sy = Math.min(h - 1, Math.floor(y * h / targetH));
    for (let x = 0; x < targetW; x++) {
      const sx = Math.min(w - 1, Math.floor(x * w / targetW));
      out[y * targetW + x] = mask[sy * w + sx];
    }
  }

  return {
    img: out,
    width: targetW,
    height: targetH,
    dpi: d,
    widthMm: Math.round(targetW / pxPerMm * 100) / 100,
    heightMm: Math.round(targetH / pxPerMm * 100) / 100,
    pxPerMm: Math.round(pxPerMm * 1000) / 1000,
  };
}

module.exports = { runPipeline, measure, toPrintSize };
