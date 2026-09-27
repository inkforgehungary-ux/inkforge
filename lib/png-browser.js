// INKFORGE — PNG IRO (bongeszo)
// A stencil maszkbol atlatszo hatterű PNG. Beepitett CompressionStream,
// nincs kulső konyvtar. A zlib kontenert (0x78 0x01 + Adler32) itt rakjuk ossze.

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const l = data.length;
  const len = new Uint8Array(4);
  len[0] = (l >>> 24) & 255; len[1] = (l >>> 16) & 255; len[2] = (l >>> 8) & 255; len[3] = l & 255;
  const t = new TextEncoder().encode(type);
  const cb = new Uint8Array(4 + l);
  cb.set(t); cb.set(data, 4);
  const c = crc32(cb);
  const crc = new Uint8Array(4);
  crc[0] = (c >>> 24) & 255; crc[1] = (c >>> 16) & 255; crc[2] = (c >>> 8) & 255; crc[3] = c & 255;
  return [len, t, data, crc];
}

function adler32(bytes) {
  let a = 1, b = 0;
  for (let i = 0; i < bytes.length; i++) { a = (a + bytes[i]) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}

// RGBA nyers sorok: 0 = atlatszo (festek atmegy), 255 = tinta
function buildRaw(mask, w, h, transparent) {
  const raw = new Uint8Array(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    const rs = y * (w * 4 + 1);
    raw[rs] = 0;
    for (let x = 0; x < w; x++) {
      const p = rs + 1 + x * 4;
      if (mask[y * w + x]) {
        raw[p] = 0; raw[p + 1] = 0; raw[p + 2] = 0; raw[p + 3] = 255;
      } else if (transparent !== false) {
        raw[p] = 255; raw[p + 1] = 255; raw[p + 2] = 255; raw[p + 3] = 0;
      } else {
        raw[p] = 255; raw[p + 1] = 255; raw[p + 2] = 255; raw[p + 3] = 255;
      }
    }
  }
  return raw;
}

async function deflate(raw) {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('A bongeszo nem tamogatja a PNG-tomoritest (CompressionStream).');
  }
  const cs = new CompressionStream('deflate');
  const w = cs.writable.getWriter();
  w.write(raw); w.close();
  const reader = cs.readable.getReader();
  const parts = []; let total = 0;
  for (;;) {
    const r = await reader.read();
    if (r.done) break;
    parts.push(r.value); total += r.value.length;
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (let i = 0; i < parts.length; i++) { out.set(parts[i], off); off += parts[i].length; }
  return out;
}

function zlibWrap(compressed, raw) {
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

// Maszk -> kesz PNG bajtok (atlatszo hatter)
export async function maskToPNGBytes(mask, w, h, opts) {
  const raw = buildRaw(mask, w, h, opts && opts.transparent);
  const comp = await deflate(raw);
  const idat = zlibWrap(comp, raw);

  const ihdr = new Uint8Array(13);
  ihdr[0] = (w >>> 24) & 255; ihdr[1] = (w >>> 16) & 255; ihdr[2] = (w >>> 8) & 255; ihdr[3] = w & 255;
  ihdr[4] = (h >>> 24) & 255; ihdr[5] = (h >>> 16) & 255; ihdr[6] = (h >>> 8) & 255; ihdr[7] = h & 255;
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])];
  chunk('IHDR', ihdr).forEach(function (p) { parts.push(p); });
  const dpi = opts && Number(opts.dpi);
  if (Number.isFinite(dpi) && dpi > 0) {
    const ppm = Math.max(1, Math.round(dpi / 0.0254));
    const phys = new Uint8Array(9);
    phys[0] = (ppm >>> 24) & 255; phys[1] = (ppm >>> 16) & 255; phys[2] = (ppm >>> 8) & 255; phys[3] = ppm & 255;
    phys[4] = phys[0]; phys[5] = phys[1]; phys[6] = phys[2]; phys[7] = phys[3];
    phys[8] = 1;
    chunk('pHYs', phys).forEach(function (p) { parts.push(p); });
  }
  chunk('IDAT', idat).forEach(function (p) { parts.push(p); });
  chunk('IEND', new Uint8Array(0)).forEach(function (p) { parts.push(p); });

  let tot = 0;
  parts.forEach(function (p) { tot += p.length; });
  const out = new Uint8Array(tot);
  let off = 0;
  parts.forEach(function (p) { out.set(p, off); off += p.length; });
  return out;
}

// Kis elonezet
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

// Canvas PNG + exact physical DPI metadata.
export async function canvasToPNGBytes(canvas, dpi) {
  if (!canvas) throw new Error('Hiányzik a nyomtatási vászon.');
  const blob = await new Promise(function (resolve, reject) {
    canvas.toBlob(function (b) { if (b) resolve(b); else reject(new Error('PNG export sikertelen.')); }, 'image/png');
  });
  const ab = new Uint8Array(await blob.arrayBuffer());
  if (!Number.isFinite(Number(dpi)) || Number(dpi) <= 0) return ab;
  // Insert pHYs after IHDR so print software sees the requested DPI.
  if (ab.length < 33 || ab[0] !== 137 || ab[1] !== 80 || ab[2] !== 78 || ab[3] !== 71) return ab;
  const ppm = Math.max(1, Math.round(Number(dpi) / 0.0254));
  const phys = new Uint8Array(9);
  phys[0] = (ppm >>> 24) & 255; phys[1] = (ppm >>> 16) & 255; phys[2] = (ppm >>> 8) & 255; phys[3] = ppm & 255;
  phys[4] = phys[0]; phys[5] = phys[1]; phys[6] = phys[2]; phys[7] = phys[3]; phys[8] = 1;
  const physParts = chunk('pHYs', phys);
  let chunkLen = 0; physParts.forEach(function (p) { chunkLen += p.length; });
  const out = new Uint8Array(ab.length + chunkLen);
  out.set(ab.subarray(0, 33), 0);
  let off = 33;
  physParts.forEach(function (p) { out.set(p, off); off += p.length; });
  out.set(ab.subarray(33), off);
  return out;
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
