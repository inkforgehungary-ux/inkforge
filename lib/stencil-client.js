// InkForge - kliensoldali stencil feldolgozas

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export function runStencil(file, opts) {
  return new Promise(function (resolve, reject) {
    if (typeof window === 'undefined') {
      reject(new Error('A feldolgozas csak bongeszoben fut.'));
      return;
    }
    if (!file || !file.type || !file.type.startsWith('image/')) {
      reject(new Error('Csak kepfajl toltheto fel.'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error('A kep merete legfeljebb 20 MB lehet.'));
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = function () {
      URL.revokeObjectURL(url);

      const MAX = 1600;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const scale = Math.min(1, MAX / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;

      const c = canvas.getContext('2d', { willReadFrequently: true });
      if (!c) {
        reject(new Error('A bongeszo nem tudta letrehozni a rajzfeluletet.'));
        return;
      }

      // Atlatszo PNG-knel is feher hatterrel szamoljunk, ne feketekent.
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.drawImage(img, 0, 0, w, h);

      const rgba = c.getImageData(0, 0, w, h).data;
      const gray = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) {
        gray[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) | 0;
      }

      import('./stencil-engine.js').then(function (mod) {
        try {
          const engine = mod.default || mod;
          const o = opts || {};
          const res = engine.runPipeline(gray, w, h, o.mainOpts || {});
          const print = engine.toPrintSize(
            res.mask,
            w,
            h,
            o.widthMm || 100,
            o.dpi || 300
          );

          resolve({
            mask: print.img,
            width: print.width,
            height: print.height,
            report: res.report,
            print: {
              widthMm: print.widthMm,
              heightMm: print.heightMm,
              pxPerMm: print.pxPerMm,
              dpi: print.dpi,
              px: print.width + ' x ' + print.height,
            },
          });
        } catch (e) {
          reject(e);
        }
      }).catch(reject);
    };

    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error('A kep nem olvashato.'));
    };

    img.src = url;
  });
}

export function maskToDataURL(mask, w, h) {
  if (typeof window === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
  if (!c) return '';

  const imgData = c.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = mask[i] > 0 ? 0 : 255;
    imgData.data[i * 4] = v;
    imgData.data[i * 4 + 1] = v;
    imgData.data[i * 4 + 2] = v;
    imgData.data[i * 4 + 3] = 255;
  }
  c.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

export function downloadMask(mask, w, h, filename) {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
  if (!c) return;

  const imgData = c.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = mask[i] > 0 ? 0 : 255;
    imgData.data[i * 4] = v;
    imgData.data[i * 4 + 1] = v;
    imgData.data[i * 4 + 2] = v;
    imgData.data[i * 4 + 3] = 255;
  }
  c.putImageData(imgData, 0, 0);

  canvas.toBlob(function (blob) {
    if (!blob) return;
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename || 'stencil.png';
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(href);
    }, 1000);
  }, 'image/png');
}
