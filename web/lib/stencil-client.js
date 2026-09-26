// InkForge – a stencil motor fő szála és a Worker közötti híd
// A kép dekódolása (fájl -> szürkeárnyalatos) a fő szálon történik,
// a nehéz számítás a Workerben, külön szálon.

/**
 * @param {File} file
 * @param {object} opts { widthMm, dpi, forceBranch, lineWeight, bridgeWidth }
 * @param {(stage:string)=>void} onProgress
 */
export function runStencil(file, opts = {}, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Méretezés: a hosszabbik oldal max 1600 px, hogy a böngésző ne fagyjon le.
      const MAX = 1600;
      let w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(1, MAX / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx2d = canvas.getContext('2d', { willReadFrequently: true });
      ctx2d.drawImage(img, 0, 0, w, h);

      const rgba = ctx2d.getImageData(0, 0, w, h).data;
      const gray = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) {
        gray[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) | 0;
      }

      const worker = new Worker(new URL('./stencil.worker.js', import.meta.url));
      worker.onmessage = (e) => {
        const d = e.data;
        if (d.type === 'progress') { onProgress(d.stage); return; }
        worker.terminate();
        if (d.type === 'error') { reject(new Error(d.message)); return; }
        resolve(d);
      };
      worker.onerror = (err) => { worker.terminate(); reject(new Error(err.message || 'Worker hiba')); };

      const copy = gray.slice();
      worker.postMessage({ gray: copy.buffer, width: w, height: h, opts }, [copy.buffer]);
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('A kép nem olvasható')); };
    img.src = url;
  });
}

/** A maszk (0/255) átalakítása adat-URL-lé a megjelenítéshez. */
export function maskToDataURL(mask, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
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

/** A nyomtatási maszk mentése PNG-ként, pontos pixelmérettel. */
export function downloadMask(mask, w, h, filename = 'stencil.png') {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
  const imgData = c.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = mask[i] > 0 ? 0 : 255;
    imgData.data[i * 4] = v;
    imgData.data[i * 4 + 1] = v;
    imgData.data[i * 4 + 2] = v;
    imgData.data[i * 4 + 3] = 255;
  }
  c.putImageData(imgData, 0, 0);
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}
