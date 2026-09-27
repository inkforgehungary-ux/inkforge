// ============================================================
// INKFORGE — Runpod hivo: kep es szoveg is
// A nano-banana endpoint mindkettot tudja.
// ============================================================

function endpoint() {
  const url = process.env.RUNPOD_STENCIL_URL;
  if (!url) return null;
  return url.replace(/\/+$/, '');
}

function apiKey() {
  return process.env.RUNPOD_API_KEY || '';
}

export function runpodReady() {
  return !!(endpoint() && apiKey());
}

export async function health() {
  const base = endpoint();
  if (!base) return { ok: false, error: 'RUNPOD_STENCIL_URL nincs beallitva.' };
  try {
    const r = await fetch(base + '/health', {
      headers: { 'Authorization': 'Bearer ' + apiKey() },
      timeout: 15000
    });
    return await r.json();
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

// ---------- KEP -> VONALAS STENCIL ----------
export async function runpodLineart(fileOrBlob, opts) {
  const o = opts || {};
  const base = endpoint();
  if (!base) throw new Error('A Runpod motor nincs beallitva.');

  const fd = new FormData();
  fd.append('image', fileOrBlob);
  fd.append('mode', o.mode || 'lineart');
  fd.append('max_dim', String(o.maxDim || 2000));
  fd.append('target_coverage', String(o.targetCoverage || 0.06));
  fd.append('bridges', String(o.bridges !== false));
  fd.append('bridge_width', String(o.bridgeWidth || 2));
  fd.append('transparency', 'true');

  const r = await fetch(base + '/stencil', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey() },
    body: fd
  });
  const out = await r.json().catch(function () { return {}; });
  if (!r.ok || !out.ok) throw new Error(out.error || ('Runpod hiba: ' + r.status));
  return out;
}

// ---------- SZOVEG -> MINTA ----------
export async function runpodText(cfg) {
  const o = cfg || {};
  const base = endpoint();
  if (!base) throw new Error('A Runpod motor nincs beallitva.');

  const t0 = Date.now();
  const r = await fetch(base + '/generate', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: o.prompt,
      negative_prompt: o.negative || '',
      count: o.count || 1
    })
  });
  const out = await r.json().catch(function () { return {}; });
  if (!r.ok || !out.ok) throw new Error(out.error || ('Runpod hiba: ' + r.status));

  return {
    imageUrl: out.image_url || null,
    imageBlob: out.image_base64 ? base64ToBlob(out.image_base64, 'image/png') : null,
    pngBase64: out.image_base64 || null,
    ms: out.ms || (Date.now() - t0)
  };
}

export async function runpodSVG(fileOrBlob, opts) {
  const o = opts || {};
  const base = endpoint();
  if (!base) throw new Error('A Runpod motor nincs beallitva.');
  const fd = new FormData();
  fd.append('image', fileOrBlob);
  fd.append('mode', o.mode || 'lineart');
  fd.append('width_mm', String(o.widthMm || 100));
  fd.append('target_coverage', String(o.targetCoverage || 0.06));
  const r = await fetch(base + '/stencil/svg', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey() },
    body: fd
  });
  const out = await r.json().catch(function () { return {}; });
  if (!r.ok || !out.ok) throw new Error(out.error || ('Runpod hiba: ' + r.status));
  return out;
}

export function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function base64ToBlob(b64, mime) {
  return new Blob([base64ToBytes(b64)], { type: mime || 'image/png' });
}

export const RUNPOD_CLIENT_VERSION = '2.0.0';
