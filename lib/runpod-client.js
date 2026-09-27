// InkForge — Runpod GPU motor hivo
// A fotot a Runpod vegennyel vonalas stencilla alakitjuk,
// majd a bongeszo-motor adja a mm-pontos geometriat.

function endpoint() {
  const url = process.env.RUNPOD_STENCIL_URL;
  if (!url) return null;
  return url.replace(/\/+$/, '');
}

function key() {
  return process.env.RUNPOD_API_KEY || '';
}

export function runpodReady() {
  return !!(endpoint() && key());
}

export async function health() {
  const base = endpoint();
  if (!base) return { ok: false, error: 'RUNPOD_STENCIL_URL nincs beallitva.' };
  try {
    const r = await fetch(base + '/health', { headers: { 'Authorization': 'Bearer ' + key() } });
    return await r.json();
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

// Kliens oldalrol: fajl -> vonalas stencil (base64 PNG)
export async function runpodLineart(file, opts) {
  const o = opts || {};
  const base = endpoint();
  if (!base) throw new Error('A Runpod motor nincs beallitva. Add meg a RUNPOD_STENCIL_URL kornyezeti valtozot.');

  const fd = new FormData();
  fd.append('image', file);
  fd.append('mode', o.mode || 'lineart');
  fd.append('max_dim', String(o.maxDim || 2000));
  fd.append('target_coverage', String(o.targetCoverage || 0.06));
  fd.append('bridges', String(o.bridges !== false));
  fd.append('bridge_width', String(o.bridgeWidth || 2));
  fd.append('transparency', 'true');

  const r = await fetch(base + '/stencil', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key() },
    body: fd
  });
  const out = await r.json().catch(function () { return {}; });
  if (!r.ok || !out.ok) throw new Error(out.error || ('Runpod hiba: ' + r.status));
  return out;
}

export async function runpodSVG(file, opts) {
  const o = opts || {};
  const base = endpoint();
  if (!base) throw new Error('A Runpod motor nincs beallitva.');
  const fd = new FormData();
  fd.append('image', file);
  fd.append('mode', o.mode || 'lineart');
  fd.append('width_mm', String(o.widthMm || 100));
  fd.append('target_coverage', String(o.targetCoverage || 0.06));
  const r = await fetch(base + '/stencil/svg', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key() },
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

export const RUNPOD_CLIENT_VERSION = '1.0.0';
