// INKFORGE — Runpod hivo (v3.5)
//
// MERES BIZONYITEK (2026-09-27, /api/stencil/health):
//   GET  /health     -> 200
//   POST /run        -> 200  { "id": "...", "status": "IN_QUEUE" }   <-- EZ EL
//   POST /runsync    -> TIMEOUT
//   POST /v1/*       -> 404
//
// => A /run az ELSO utvonal. Nem varunk feleslegesen a /runsync timeoutjara.

import { buildRunpodInput, extractImage, isCompleted, isFailed } from './comfy-workflow.js';

let WORKING_PATH = null;

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

function apiKey() { return process.env.RUNPOD_API_KEY || ''; }

export function runpodReady() { return !!(endpoint() && apiKey()); }
export function textReady() { return !!(textEndpoint() && apiKey()); }
export function workingPath() { return WORKING_PATH; }

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

// A /run az ELSO — a health bizonyitotta, hogy el.
// A /runsync csak tartalek, rovid timeoutsal.
const TEXT_PATHS = ['/run', '/runsync', '/v1/run', '/v1/runsync'];

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

// SZOVEG -> KEP: /run + polling. Ez a bizonyitottan mukodo ut.
export async function runpodText(cfg) {
  const o = cfg || {};
  const base = textEndpoint();
  if (!base) throw new Error('A szoveg-generalo motor nincs beallitva.');

  const body = buildRunpodInput({
    prompt: o.prompt, negative: o.negative || '',
    width: o.width || 1024, height: o.height || 1024,
    steps: o.steps || 20, guidance: o.guidance,
    seed: o.seed, ckpt: o.ckpt
  });

  const t0 = Date.now();
  const totalMs = o.timeoutMs || 280000;
  const errors = [];

  const cands = WORKING_PATH
    ? [WORKING_PATH].concat(TEXT_PATHS.filter(function (p) { return p !== WORKING_PATH; }))
    : TEXT_PATHS.slice();

  for (let i = 0; i < cands.length; i++) {
    const path = cands[i];

    // INDITAS — rovid timeout. A /run azonnal id-t ad vissza.
    let out;
    try {
      const res = await fetch(base + path, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(o.startTimeoutMs || 30000)
      });

      if (res.status === 404) { errors.push(path + ' 404'); continue; }

      out = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        errors.push(path + ' ' + res.status);
        continue;
      }
    } catch (e) {
      errors.push(path + ' inditas: ' + String(e && e.message ? e.message : e).slice(0, 80));
      continue;
    }

    WORKING_PATH = path;

    // Ha azonnal kesz (a /runsync igy ad valaszt)
    if (isCompleted(out)) {
      const img = extractImage(out);
      if (img) return pack(img, out, t0, path);
      errors.push(path + ' kesz-nincs-kep'); continue;
    }

    // Ha id-t adott (a /run igy ad valaszt) -> POLLOZAS
    if (out.id) {
      const remaining = totalMs - (Date.now() - t0);
      const done = await pollUntilDone(base, out.id, Math.max(10000, remaining), 2000);
      if (isCompleted(done)) {
        const img = extractImage(done);
        if (img) return pack(img, done, t0, path);
        errors.push(path + ' kesz-nincs-kep'); continue;
      }
      if (isFailed(done)) {
        const msg = (done.output && done.output.error) || done.error || 'A generalas nem sikerult.';
        throw new Error(String(msg).slice(0, 300));
      }
      errors.push(path + ' polling-timeout');
      continue;
    }

    errors.push(path + ' ismeretlen-valasz');
  }

  throw new Error('Egyik Runpod utvonal sem mukodott: ' + errors.join(' | '));
}

async function pollUntilDone(base, id, timeoutMs, pollEvery) {
  const started = Date.now();
  let last = null;
  let notFound = 0;
  while (Date.now() - started < timeoutMs) {
    await sleep(pollEvery);
    try {
      const r = await fetch(base + '/status/' + encodeURIComponent(id), {
        headers: { 'Authorization': 'Bearer ' + apiKey() }
      });
      if (r.status === 404) {
        notFound++;
        if (notFound > 5) return { status: 'FAILED', output: { error: 'A /status vegpont nem talalhato (404).' } };
        continue;
      }
      last = await r.json().catch(function () { return {}; });
      if (isCompleted(last) || isFailed(last)) return last;
    } catch (e) { /* ujraprobalunk */ }
  }
  return last || { status: 'TIMED_OUT' };
}

function pack(img, out, t0, path) {
  return {
    pngBase64: img.base64,
    imageBase64: img.base64,
    mime: img.mime,
    imageBlob: base64ToBlob(img.base64, img.mime),
    imageUrl: null,
    ms: out.executionTime || (Date.now() - t0),
    delayMs: out.delayTime || 0,
    path: path,
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

export const RUNPOD_CLIENT_VERSION = '3.5.0';
