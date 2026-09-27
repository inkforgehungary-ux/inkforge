// INKFORGE — STENCIL KLIENS
// A motor bongeszo oldali hidja. Az engine.js tiszta fuggvenyekbol all.

import {
  toGray, runPipeline, toPrintSize,
  registrationMarks, multiLayer, ENGINE_VERSION
} from './engine.js';

export { ENGINE_VERSION };

// A motor plafonja: A2-es laphoz is elegendo felbontas.
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
      w = Math.max(1, Math.round(w * sc));
      h = Math.max(1, Math.round(h * sc));
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

export async function runStencil(file, opts, onStage) {
  const o = opts || {};
  const say = function (s) { if (onStage) onStage(s); };

  say('decode');
  const dec = await decodeFile(file, o.maxDim);

  say('measure');
  await tick();

  say('process');
  const res = runPipeline(dec.gray, dec.w, dec.h, {
    branch: o.branch || 'auto',
    gamma: o.gamma, contrast: o.contrast,
    lowThr: o.lowThr, highThr: o.highThr,
    strokePx: o.strokePx, baseStroke: o.baseStroke,
    morph: o.morph, polish: o.polish, minArea: o.minArea,
    bridgePx: o.bridgePx, fillHoles: o.fillHoles
  });

  say('print');
  await tick();

  const print = toPrintSize(res.mask, dec.w, dec.h, o.widthMm || 100, o.dpi || 300);

  let layers = null;
  if (o.layers && o.layers > 1) {
    layers = multiLayer(dec.gray, dec.w, dec.h, o.layers, {
      minArea: o.minArea || 20,
      bridges: o.addLayerBridges !== false,
      bridgePx: o.bridgePx || 3
    });
  }

  let regMarks = null;
  if (o.registration) regMarks = registrationMarks(print.width, print.height, Math.round(print.pxPerMm * 5));

  say('done');
  return {
    dec: dec,
    mask: print.img,
    baseMask: res.mask,
    width: print.width,
    height: print.height,
    report: res.report,
    bridgeList: res.bridgeList,
    print: {
      widthMm: print.widthMm, heightMm: print.heightMm,
      pxPerMm: print.pxPerMm, dpi: print.dpi,
      px: print.width + ' x ' + print.height
    },
    layers: layers,
    regMarks: regMarks
  };
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
