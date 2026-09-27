// InkForge - motor hid
export function runStencil(file, opts) {
  return new Promise(function (resolve, reject) {
    if (typeof window === 'undefined') { reject(new Error('Csak bongeszoben fut.')); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      const MAX = 1600;
      let w = img.naturalWidth, h = img.naturalHeight;
      const sc = Math.min(1, MAX / Math.max(w, h));
      w = Math.max(1, Math.round(w * sc)); h = Math.max(1, Math.round(h * sc));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const c = cv.getContext('2d', { willReadFrequently: true });
      c.drawImage(img, 0, 0, w, h);
      const rgba = c.getImageData(0, 0, w, h).data;
      const gray = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) gray[i] = (0.299 * rgba[i*4] + 0.587 * rgba[i*4+1] + 0.114 * rgba[i*4+2]) | 0;
      import('./stencil-engine.js').then(function (mod) {
        try {
          const e = mod.default || mod;
          const res = e.runPipeline(gray, w, h, (opts && opts.mainOpts) || {});
          const print = e.toPrintSize(res.mask, w, h, (opts && opts.widthMm) || 100, (opts && opts.dpi) || 300);
          resolve({ mask: print.img, width: print.width, height: print.height, report: res.report, print: { widthMm: print.widthMm, heightMm: print.heightMm, pxPerMm: print.pxPerMm, dpi: print.dpi, px: print.width + ' x ' + print.height } });
        } catch (err) { reject(err); }
      }).catch(reject);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Nem olvashato')); };
    img.src = url;
  });
}

export function maskToDataURL(mask, w, h) {
  if (typeof window === 'undefined') return '';
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const d = c.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = mask[i] > 0 ? 0 : 255; d.data[i*4]=v; d.data[i*4+1]=v; d.data[i*4+2]=v; d.data[i*4+3]=255; }
  c.putImageData(d, 0, 0);
  return cv.toDataURL('image/png');
}

export function downloadMask(mask, w, h, name) {
  if (typeof window === 'undefined') return;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const d = c.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = mask[i] > 0 ? 0 : 255; d.data[i*4]=v; d.data[i*4+1]=v; d.data[i*4+2]=v; d.data[i*4+3]=255; }
  c.putImageData(d, 0, 0);
  cv.toBlob(function (b) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name || 'stencil.png'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }, 'image/png');
}
