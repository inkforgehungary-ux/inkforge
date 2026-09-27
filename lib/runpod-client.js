// ============================================================
// INKFORGE — Runpod hivo
//   kep -> stencil:  a sajat motorunk (/stencil)
//   szoveg -> kép:   a ComfyUI worker (/runsync)
//
// A ComfyUI a runpod-workers/worker-comfyui formatumat hasznalja:
//   { "input": { "workflow": {...} } }
//   valasz: { "output": { "message": "data:image/png;base64,..." } }
// ============================================================

import { buildRunpodInput, extractImage, isCompleted, isFailed } from './comfy-workflow.js';

function endpoint() {
  const url = process.env.RUNPOD_STENCIL_URL;
  if (!url) return null;
  return url.replace(/\/+$/, '');
}

function textEndpoint() {
  const url = process.env.RUNPOD_TEXT_URL || process.env.RUNPOD_STENCIL_URL;
  if (!url) return null;
  return url.replace(/\/+$/, '');
}

function apiKey() {
  return process.env.RUNPOD_API_KEY || '';
}

export function runpodReady() {
  return !!(endpoint() && apiKey());
}

export function textReady() {
  return !!(textEndpoint() && apiKey());
}

export async function health() {
  const base = endpoint();
  if (!base) return { ok: false, error: 'RUNPOD_STENCIL_URL nincs beallitva.' };
  try {
    const r = await fetch(base + '/health', { headers: { 'Authorization': 'Bearer ' + apiKey() } });
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

// ---------- SZOVEG -> KEP (ComfyUI /runsync) ----------
export async function runpodText(cfg) {
  const o = cfg || {};
  const base = textEndpoint();
  if (!base) throw new Error('A szoveg-generalo motor nincs beallitva.');

  const body = buildRunpodInput({
    prompt: o.prompt,
    negative: o.negative || '',
    width: o.width || 1024,
    height: o.height || 1024,
    steps: o.steps || 20,
    guidance: o.guidance,
    seed: o.seed,
    ckpt: o.ckpt
  });

  const t0 = Date.now();

  const res = await fetch(base + '/runsync', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  let out = await res.json().catch(function () { return {}; });

  // Ha aszinkronba tette (van id, de meg nem kesz), pollozunk
  if (!isCompleted(out) && !isFailed(out) && out.id) {
    out = await pollUntilDone(base, out.id, o.timeoutMs || 180000);
  }

  if (isFailed(out)) {
    const msg = (out.output && out.output.error) || out.error || 'A generalas nem sikerult.';
    throw new Error(String(msg).slice(0, 400));
  }

  const img = extractImage(out);
  if (!img) throw new Error('A worker nem adott kepet vissza.');

  return {
    pngBase64: img.base64,
    imageBase64: img.base64,
    mime: img.mime,
    imageBlob: base64ToBlob(img.base64, img.mime),
    imageUrl: null,
    ms: out.executionTime || (Date.now() - t0),
    delayMs: out.delayTime || 0,
    raw: { id: out.id || null, status: out.status || null }
  };
}

async function pollUntilDone(base, id, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await new Promise(function (r) { setTimeout(r, 1500); });
    const r = await fetch(base + '/status/' + encodeURIComponent(id), {
      headers: { 'Authorization': 'Bearer ' + apiKey() }
    });
    const out = await r.json().catch(function () { return {}; });
    if (isCompleted(out) || isFailed(out)) return out;
  }
  return { status: 'TIMED_OUT', output: { error: 'A generalas 180 mp alatt nem fejezodott be.' } };
}

// ---------- SVG a stencil-agbol ----------
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

export const RUNPOD_CLIENT_VERSION = '3.0.0';
