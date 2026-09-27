// InkForge - a motor hidja a bongeszo fele

export function runStencil(file, opts, onProgress) {
  return new Promise(function (resolve, reject) {
    if (typeof window === 'undefined') {
      reject(new Error('A feldolgozas csak bongeszoben fut.'));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = function () {
      URL.revokeObjectURL(url);
      const MAX = 1600;
      let w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(1, MAX / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const c = canvas.getContext('2d', { willReadFrequently: true });
      c.drawImage(img, 0, 0, w, h);
      const rgba = c.getImageData(0, 0, w, h).data;
      const gray = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) {
        gray[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) | 0;
      }

      import('./stencil-engine.js').then(function (mod) {
        try {
          const engine = mod.default || mod;
          const res = engine.runPipeline(gray, w, h, (opts && opts.mainOpts) || {});
          const print = engine.toPrintSize(res.mask, w, h, (opts && opts.widthMm) || 100, (opts && opts.dpi) || 300);
          resolve({
            mask: print.img, width: print.width, height: print.height,
            report: res.report,
            print: {
              widthMm: print.widthMm, heightMm: print.heightMm, pxPerMm: print.pxPerMm,
              dpi: print.dpi, px: print.width + ' x ' + print.height,
            },
          });
        } catch (e) { reject(e); }
      }).catch(reject);
    };

    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('A kep nem olvashato')); };
    img.src = url;
  });
}

export function maskToDataURL(mask, w, h) {
  if (typeof window === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const c = canvas.getContext('2d');
  const imgData = c.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = mask[i] > 0 ? 0 : 255;
    imgData.data[i * 4] = v; imgData.data[i * 4 + 1] = v; imgData.data[i * 4 + 2] = v; imgData.data[i * 4 + 3] = 255;
  }
  c.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

export function downloadMask(mask, w, h, filename) {
  if (typeof window === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const c = canvas.getContext('2d');
  const imgData = c.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = mask[i] > 0 ? 0 : 255;
    imgData.data[i * 4] = v; imgData.data[i * 4 + 1] = v; imgData.data[i * 4 + 2] = v; imgData.data[i * 4 + 3] = 255;
  }
  c.putImageData(imgData, 0, 0);
  canvas.toBlob(function (blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'stencil.png';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }, 'image/png');
}
