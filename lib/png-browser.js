// INKFORGE — PNG TOMORITO (bongeszo)
// A PNG zlib kontenert var; a CompressionStream nyers deflate-ot ad,
// ezert a streamet zlib fejjel es Adler32-vel latjuk el.

import { buildPNGRaw, assemblePNG, adler32 } from './output.js';

async function deflateRaw(raw) {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('A bongeszo nem tamogatja a CompressionStream-et.');
  }
  const cs = new CompressionStream('deflate');
  const w = cs.writable.getWriter();
  w.write(raw);
  w.close();
  const reader = cs.readable.getReader();
  const parts = [];
  let total = 0;
  for (;;) {
    const r = await reader.read();
    if (r.done) break;
    parts.push(r.value);
    total += r.value.length;
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (let i = 0; i < parts.length; i++) { out.set(parts[i], off); off += parts[i].length; }
  return out;
}

function wrapZlib(raw, compressed) {
  const out = new Uint8Array(compressed.length + 6);
  out[0] = 0x78; out[1] = 0x01;
  out.set(compressed, 2);
  const ad = adler32(raw);
  const n = out.length;
  out[n - 4] = (ad >>> 24) & 255;
  out[n - 3] = (ad >>> 16) & 255;
  out[n - 2] = (ad >>> 8) & 255;
  out[n - 1] = ad & 255;
  return out;
}

export async function maskToPNGBytes(mask, w, h, opts) {
  const raw = buildPNGRaw(mask, w, h, opts);
  const comp = await deflateRaw(raw);
  return assemblePNG(wrapZlib(raw, comp), w, h);
}

export async function thumbPNGBytes(mask, w, h, maxW) {
  const sc = Math.min(1, (maxW || 600) / w);
  const tw = Math.max(1, Math.round(w * sc));
  const th = Math.max(1, Math.round(h * sc));
  const small = new Uint8Array(tw * th);
  for (let y = 0; y < th; y++) {
    const sy = Math.min(h - 1, Math.floor(y / sc));
    for (let x = 0; x < tw; x++) {
      const sx = Math.min(w - 1, Math.floor(x / sc));
      small[y * tw + x] = mask[sy * w + sx];
    }
  }
  return await maskToPNGBytes(small, tw, th, { transparent: true });
}

export function bytesToBase64(bytes) {
  let bin = '';
  const CH = 8192;
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CH, bytes.length)));
  }
  return btoa(bin);
}

export function downloadBlob(bytes, filename, mime) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
}
