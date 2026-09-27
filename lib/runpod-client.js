// INKFORGE — Runpod hivo (v4)
//
// MERES BIZONYITEK (2026-09-27, /api/stencil/health):
//   GET  /health     -> 200
//   POST /run        -> 200  { "id": "...", "status": "IN_QUEUE" }   <-- EZ EL
//   GET  /status/<id>-> 200  (IN_QUEUE / IN_PROGRESS / COMPLETED)
//   POST /runsync    -> TIMEOUT
//   POST /stencil    -> 404   <-- NEM LETEZIK
//   POST /v1/*       -> 404
//
// HIBA JAVITAS (2026-09-27):
//   A runpodLineart a /stencil-t hivta -> 404. MOSTANTOL a runpodLineart
//   UGYANAZT a /run + poll utat hasznalja, mint a runpodText, csak kep->kep
//   modban. Igy MINDHAROM ag (feltoltes, leiras, link) egy uton megy.

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

// A /run az ELSO — a health bizonyitotta, hogy el. A /stencil NEM letezik.
const RUN_PATHS = ['/run', '/runsync', '/v1/run', '/v1/runsync'];

// A stencil lineart prompt — a GPU ezt rajzolja
const LINEART_PROMPT = 'clean tattoo stencil line drawing, bold even black outlines on pure white background, no shading, no grey tones, no background, isolated subject, print-ready transfer sheet';
const LINEART_NEGATIVE = 'grey, gray, shading, gradient, photorealistic, background, texture, noise, blurry, color';

// A VEGSO feldolgozas: ha kesz a GPU kep, a bongeszo/route vonalas stencilt csinal belole.
// Ez a fuggveny a GPU-tol kapott PNG-t adja vissza base64-ben + metaadatot.

export async function runpodLineart(fileOrBlob, opts) {
  const o = opts || {};
  const base = endpoint();
  if (!base) throw new Error('A Runpod motor nincs beallitva.');

  // A forraskept fajlja base64-be (a workflow-ba megy)
  const bytes = new Uint8Array(await fileOrBlob.arrayBuffer());
  const srcB64 = bytesToBase64(bytes);

  const input = buildRunpodInput({
    prompt: o.prompt || LINEART_PROMPT,
    negative: o.negative || LINEART_NEGATIVE,
    width: o.width || 1024,
    height: o.height || 1024,
    steps: o.steps || 20,
    guidance: o.guidance,
    seed: o.seed,
    ckpt: o.ckpt
  });

  // Kep->kep: a forras kepet bevisszuk
  if (input.input) input.input.images = [{ name: 'source.png', image: 'data:image/png;base64,' + srcB64 }];
  else input.images = [{ name: 'source.png', image: 'data:image/png;base64,' + srcB64 }];

  const t0 = Date.now();
  const totalMs = o.timeoutMs || 280000;
  const errors = [];

  const cands = WORKING_PATH
    ? [WORKING_PATH].concat(RUN_PATHS.filter(function (p) { return p !== WORKING_PATH; }))
    : RUN_PATHS.slice();

  for (let i = 0; i < cands.length; i++) {
    const path = cands[i];

    let out;
    try {
      const res = await fetch(base + path, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey(), 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(o.startTimeoutMs || 30000)
      });

      if (res.status === 404) { errors.push(path + ' 404'); continue; }

      out = await res.json().catch(function () { return {}; });
      if (!res.ok) { errors.push(path + ' ' + res.status); continue; }
    } catch (e) {
      errors.push(path + ' inditas: ' + String(e && e.message ? e.message : e).slice(0, 80));
      continue;
    }

    WORKING_PATH = path;

    // Ha azonnal kesz
    if (isCompleted(out)) {
      const img = extractImage(out);
      if (img) return packLineart(img, out, t0, path);
      errors.push(path + ' kesz-nincs-kep'); continue;
    }

    // Ha id-t adott -> POLLOZAS
    if (out.id) {
      const remaining = totalMs - (Date.now() - t0);
      const done = await pollUntilDone(base, out.id, Math.max(10000, remaining), 2000);
      if (isCompleted(done)) {
        const img = extractImage(done);
        if (img) return packLineart(img, done, t0, path);
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

// A lineart valasz csomagolasa — a route ezt varja (png_base64, width, height, ...)
function packLineart(img, out, t0, path) {
  return {
    ok: true,
    png_base64: img.base64,
    image_base64: img.base64,
    mime: img.mime || 'image/png',
    // A GPU kep merete; a mm-pontos atmeretezes a route/lib dolga
    width: out.width || null,
    height: out.height || null,
    coverage: null,
    quality: null,
    bridges: null,
    islands: null,
    ms: out.executionTime || (Date.now() - t0),
    gpuMs: out.executionTime || 0,
    path: path,
    raw: { id: out.id || null, status: out.status || null }
  };
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

function __old_pack() { return null; }

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

// SZOVEG -> KEP: /run + polling. Ez a bizonyitottan mukodo ut.
export async function runpodText(cfg) {
  const o = cfg || {};
  const base = textEndpoint();
  if (!base) throw new Error('A szoveg-generalo motor nincs beallitva.');

  const input = buildRunpodInput({
    prompt: o.prompt, negative: o.negative || '',
    width: o.width || 1024, height: o.height || 1024,
    steps: o.steps || 20, guidance: o.guidance,
    seed: o.seed, ckpt: o.ckpt
  });

  const t0 = Date.now();
  const totalMs = o.timeoutMs || 280000;
  const errors = [];

  const cands = WORKING_PATH
    ? [WORKING_PATH].concat(RUN_PATHS.filter(function (p) { return p !== WORKING_PATH; }))
    : RUN_PATHS.slice();

  for (let i = 0; i < cands.length; i++) {
    const path = cands[i];

    let out;
    try {
      const res = await fetch(base + path, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey(), 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(o.startTimeoutMs || 30000)
      });

      if (res.status === 404) { errors.push(path + ' 404'); continue; }

      out = await res.json().catch(function () { return {}; });
      if (!res.ok) { errors.push(path + ' ' + res.status); continue; }
    } catch (e) {
      errors.push(path + ' inditas: ' + String(e && e.message ? e.message : e).slice(0, 80));
      continue;
    }

    WORKING_PATH = path;

    if (isCompleted(out)) {
      const img = extractImage(out);
      if (img) return pack(img, out, t0, path);
      errors.push(path + ' kesz-nincs-kep'); continue;
    }

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

export async function runpodSVG(fileOrBlob, opts) {
  const o = opts || {};
  const base = endpoint();
  if (!base) throw new Error('A Runpod motor nincs beallitva.');
  const bytes = new Uint8Array(await fileOrBlob.arrayBuffer());
  const input = buildRunpodInput({
    prompt: o.prompt || LINEART_PROMPT,
    negative: o.negative || LINEART_NEGATIVE,
    width: o.width || 1024, height: o.height || 1024,
    steps: o.steps || 20
  });
  if (input.input) input.input.images = [{ name: 'source.png', image: 'data:image/png;base64,' + bytesToBase64(bytes) }];
  else input.images = [{ name: 'source.png', image: 'data:image/png;base64,' + bytesToBase64(bytes) }];

  const res = await fetch(base + '/run', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  const out = await res.json().catch(function () { return {}; });
  if (!res.ok || !out.id) throw new Error(out.error || ('Runpod hiba: ' + res.status));
  const done = await pollUntilDone(base, out.id, o.timeoutMs || 280000, 2000);
  const img = extractImage(done);
  if (!img) throw new Error('A worker kesz, de nem adott kepet vissza.');
  return { ok: true, png_base64: img.base64, mime: img.mime };
}

function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
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

export const RUNPOD_CLIENT_VERSION = '4.0.0';
