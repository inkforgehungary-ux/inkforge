// ============================================================
// INKFORGE — Runpod hivo (v3.1)
// A ComfyUI worker /run + polling, NEM /runsync.
//
// MERES TANULSAG (valodi Runpod log, 2026-09-27):
//   - worker inditas: ~3 mp
//   - GPU benchmark: 2845 ms  (RTX A4500, 20 GB VRAM)
//   - A FLUX.1-dev fp8 BETOLTESE: 60-180 mp  <-- EZ A SZUK KERESZTMETSZET
//   - generalas: 15-25 mp
//   => az ELSO futas 2-4 perc. A /runsync 120 mp-je keves volt.
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

// ---------- SZOVEG -> KEP (ComfyUI) ----------
// /run + polling: a hosszu betoltesi ido nem szakitja meg a kapcsolatot.
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

  const res = await fetch(base + '/run', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const out = await res.json().catch(function () { return {}; });

  if (!res.ok) {
    const msg = (out && out.error) || ('Runpod hiba: ' + res.status);
    throw new Error(String(msg).slice(0, 400));
  }

  if (isCompleted(out)) {
    const img0 = extractImage(out);
    if (img0) return packResult(img0, out, t0);
  }

  if (!out.id) {
    const img1 = extractImage(out);
    if (img1) return packResult(img1, out, t0);
    throw new Error('A worker nem adott vissza azonositot. ' + JSON.stringify(out).slice(0, 200));
  }

  const timeoutMs = o.timeoutMs || 300000;
  const pollEvery = o.pollMs || 2000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    await sleep(pollEvery);

    let st;
    try {
      const r = await fetch(base + '/status/' + encodeURIComponent(out.id), {
        headers: { 'Authorization': 'Bearer ' + apiKey() }
      });
      st = await r.json().catch(function () { return {}; });
    } catch (e) {
      continue;
    }

    if (isCompleted(st)) {
      const img = extractImage(st);
      if (img) return packResult(img, st, t0);
      throw new Error('A worker kesz, de nem adott kepet vissza.');
    }

    if (isFailed(st)) {
      const msg = (st.output && st.output.error) || st.error || 'A generalas nem sikerult.';
      throw new Error(String(msg).slice(0, 400));
    }
  }

  throw new Error('A generalas ' + Math.round(timeoutMs / 1000) + ' mp alatt nem fejezodott be. ' +
    'Az elso futasnal a modell betoltese 2-4 percet vesz igenybe, probald ujra (a masodik mar gyorsabb).');
}

function packResult(img, out, t0) {
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

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

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

export const RUNPOD_CLIENT_VERSION = '3.1.0';
