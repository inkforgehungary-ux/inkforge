// INKFORGE — RUNPOD KLIENS (v5)
// Serverless worker contract: POST /run -> {id,status}
// GET /status/:id -> {status, output}

import { extractImage, isCompleted, isFailed } from './comfy-workflow.js';

let WORKING_PATH = '/run';

function endpoint() {
  const url = process.env.RUNPOD_STENCIL_URL || process.env.RUNPOD_TEXT_URL;
  return url ? url.replace(/\/+$/, '') : null;
}
function textEndpoint() {
  const url = process.env.RUNPOD_TEXT_URL || process.env.RUNPOD_STENCIL_URL;
  return url ? url.replace(/\/+$/, '') : null;
}
function apiKey() { return process.env.RUNPOD_API_KEY || ''; }

export function runpodReady() { return !!(endpoint() && apiKey()); }
export function textReady() { return !!(textEndpoint() && apiKey()); }
export function workingPath() { return WORKING_PATH; }

export async function health() {
  const base = endpoint();
  if (!base) return { ok: false, error: 'RUNPOD_STENCIL_URL nincs beállítva.' };
  try {
    const r = await fetch(base + '/health', {
      headers: { 'Authorization': 'Bearer ' + apiKey() },
      signal: AbortSignal.timeout(8000)
    });
    const body = await r.text();
    return { ok: r.ok, status: r.status, body: body.slice(0, 1000) };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

export async function runpodRun(input, opts) {
  const o = opts || {};
  const base = o.text ? textEndpoint() : endpoint();
  if (!base) throw new Error('A RunPod endpoint nincs beállítva.');
  if (!apiKey()) throw new Error('A RUNPOD_API_KEY nincs beállítva.');

  const res = await fetch(base + '/run', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ input: input }),
    signal: AbortSignal.timeout(o.timeoutMs || 30000)
  });

  const out = await res.json().catch(function () { return {}; });
  if (!res.ok || !out.id) {
    const msg = out && (out.error || out.message);
    throw new Error(msg || ('RunPod indítási hiba: HTTP ' + res.status));
  }
  WORKING_PATH = '/run';
  return out;
}

export async function runpodStatus(id, opts) {
  const o = opts || {};
  const base = o.text ? textEndpoint() : endpoint();
  if (!base) throw new Error('A RunPod endpoint nincs beállítva.');
  const res = await fetch(base + '/status/' + encodeURIComponent(id), {
    headers: { 'Authorization': 'Bearer ' + apiKey() },
    signal: AbortSignal.timeout(o.timeoutMs || 20000)
  });
  const out = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    throw new Error(out && (out.error || out.message) || ('RunPod státusz hiba: HTTP ' + res.status));
  }
  return out;
}

export function extractRunpodOutput(status) {
  if (!status) return null;
  const out = status.output;
  if (out && typeof out === 'object') {
    if (out.output && typeof out.output === 'object') return out.output;
    return out;
  }
  return null;
}

export function extractRunpodBase64(status) {
  const out = extractRunpodOutput(status);
  if (!out) return null;

  const direct = [
    out.stencil_png_base64,
    out.png_base64,
    out.image_base64,
    out.generated_png_base64,
    out.image
  ];
  for (let i = 0; i < direct.length; i++) {
    if (typeof direct[i] === 'string' && direct[i].length > 100) {
      const m = direct[i].match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
      return m ? m[2] : direct[i];
    }
  }

  const img = extractImage({ output: out });
  return img ? img.base64 : null;
}

export async function waitRunpod(id, opts) {
  const o = opts || {};
  const timeout = o.timeoutMs || 300000;
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeout) {
    last = await runpodStatus(id, o);
    if (isCompleted(last)) return last;
    if (isFailed(last)) {
      const out = extractRunpodOutput(last);
      const msg = (out && (out.error || out.message)) || last.error || 'A RunPod feladat sikertelen.';
      throw new Error(String(msg).slice(0, 500));
    }
    await new Promise(function (r) { setTimeout(r, o.pollEveryMs || 2000); });
  }
  throw new Error('A RunPod feladat időkorlátja lejárt.');
}

function blobToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export async function runpodLineart(fileOrBlob, opts) {
  const o = opts || {};
  const bytes = new Uint8Array(await fileOrBlob.arrayBuffer());
  const start = await runpodRun({
    mode: o.mode || 'image_to_stencil',
    image_base64: blobToBase64(bytes),
    prompt: o.prompt || 'preserve the source subject; clean tattoo stencil line art',
    negative: o.negative,
    max_side: o.maxSide || 768,
    steps: o.steps || 20,
    guidance: o.guidance || 5.5,
    strength: o.strength || 0.38,
    return_generated: true
  });
  const done = isCompleted(start) ? start : await waitRunpod(start.id, { timeoutMs: o.timeoutMs || 300000 });
  const out = extractRunpodOutput(done);
  const b64 = extractRunpodBase64(done);
  if (!b64) throw new Error('A RunPod worker kész, de nem adott vissza képet.');
  return {
    ok: true,
    png_base64: b64,
    generated_png_base64: out && out.generated_png_base64 || null,
    width: out && out.width || null,
    height: out && out.height || null,
    coverage: out && out.coverage != null ? out.coverage : null,
    quality: out && out.quality || null,
    bridges: out && out.bridges || 0,
    islands: out && out.islands || 0,
    ms: (out && (out.gpu_ms || out.executionTime)) || 0,
    path: '/run',
    raw: { id: start.id || null, status: done.status || null }
  };
}

export async function runpodText(cfg) {
  const o = cfg || {};
  const start = await runpodRun({
    mode: o.mode || 'text_to_image',
    prompt: o.prompt || '',
    negative: o.negative || '',
    max_side: o.width || 768,
    steps: o.steps || 22,
    guidance: o.guidance || 5.5,
    seed: o.seed,
    return_generated: true
  }, { text: true });

  const done = isCompleted(start) ? start : await waitRunpod(start.id, { text: true, timeoutMs: o.timeoutMs || 300000 });
  const out = extractRunpodOutput(done);
  const b64 = extractRunpodBase64(done);
  if (!b64) throw new Error('A RunPod worker kész, de nem adott vissza képet.');
  return {
    pngBase64: b64,
    imageBase64: b64,
    generated_png_base64: out && out.generated_png_base64 || null,
    ms: (out && (out.gpu_ms || out.executionTime)) || 0,
    path: '/run',
    raw: { id: start.id || null, status: done.status || null }
  };
}

export async function runpodSVG() {
  throw new Error('Az SVG generálás a jelenlegi RunPod workerben nincs bekapcsolva.');
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

export const RUNPOD_CLIENT_VERSION = '5.0.0';
