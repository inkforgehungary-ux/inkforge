// ============================================================
// INKFORGE — GENERALAS (generate route, v3)
// POST /api/stencil/generate        -> Runpod /run inditas
// GET  /api/stencil/generate?id=<RP> -> a RUNPOD statusza
//
// HIBA JAVITAS (2026-09-27):
//   A /health bizonyitotta: CSAK a /health es a /run el.
//   A /runsync timeoutol, a /stencil nem letezik.
//   Ezert MOST a /run-t hasznaljuk, es a GET a Runpodot kerdezi.
// ============================================================

import { runpodReady } from '../../../../lib/runpod-client.js';
import { stencilInsertRow, stencilUpdateRow, creditEntry, CREDIT_COST, STATUS, costUsd } from '../../../../lib/save.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders(extra) {
  return Object.assign({
    'apikey': SERVICE_KEY,
    'Authorization': 'Bearer ' + SERVICE_KEY,
    'Content-Type': 'application/json'
  }, extra || {});
}

async function sbInsert(table, row) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
      method: 'POST', headers: sbHeaders({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(row)
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? j[0] : j;
  } catch (e) { return null; }
}

async function sbPatch(table, id, patch) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH', headers: sbHeaders({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(patch)
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? j[0] : j;
  } catch (e) { return null; }
}

async function sbUpload(path, bytes, contentType) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/storage/v1/object/stencils/' + path, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Type': contentType, 'x-upsert': 'true' },
      body: bytes
    });
    return r.ok ? path : null;
  } catch (e) { return null; }
}

// Egyszeru FLUX workflow (szoveg -> kep), a bizonyitott node-strukturaval
function buildWorkflow(prompt, negative, o) {
  const seed = Math.floor(Math.random() * 9007199254740991);
  return {
    '6':  { inputs: { text: prompt || '', clip: ['30', 1] }, class_type: 'CLIPTextEncode' },
    '8':  { inputs: { samples: ['31', 0], vae: ['30', 2] }, class_type: 'VAEDecode' },
    '9':  { inputs: { filename_prefix: 'inkforge', images: ['8', 0] }, class_type: 'SaveImage' },
    '27': { inputs: { width: o.width || 1024, height: o.height || 1024, batch_size: 1 }, class_type: 'EmptySD3LatentImage' },
    '30': { inputs: { ckpt_name: o.ckpt || 'flux1-dev-fp8.safetensors' }, class_type: 'CheckpointLoaderSimple' },
    '31': {
      inputs: {
        seed: seed, steps: o.steps || 20, cfg: 1,
        sampler_name: 'euler', scheduler: 'simple', denoise: 1,
        model: ['30', 0], positive: ['35', 0], negative: ['33', 0], latent_image: ['27', 0]
      },
      class_type: 'KSampler'
    },
    '33': { inputs: { text: negative || '', clip: ['30', 1] }, class_type: 'CLIPTextEncode' },
    '35': { inputs: { guidance: o.guidance != null ? o.guidance : 3.5, conditioning: ['6', 0] }, class_type: 'FluxGraph' }
  };
}

function extractB64(st) {
  const msg = st && st.output && st.output.message;
  if (typeof msg === 'string') {
    const m = msg.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (m) return m[2];
    if (msg.length > 200 && /^[A-Za-z0-9+/=]+$/.test(msg.slice(0, 80))) return msg;
  }
  const imgs = st && st.output && st.output.images;
  if (Array.isArray(imgs) && imgs.length) {
    const f = imgs[0];
    if (typeof f === 'string') {
      const m = f.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
      return m ? m[2] : f;
    }
    if (f && f.data) return f.data;
  }
  return null;
}

// ---------- POST: feltoltes -> Runpod FLUX lineart prompttal ----------
export async function POST(req) {
  try {
    const base = (process.env.RUNPOD_TEXT_URL || process.env.RUNPOD_STENCIL_URL || '').replace(/\/+$/, '');
    if (!base || !process.env.RUNPOD_API_KEY) {
      return Response.json({ ok: false, configured: false, error: 'A GPU motor nincs beallitva.' }, { status: 503 });
    }

    // A feltoltes multipart lehet VAGY JSON
    const ct = req.headers.get('content-type') || '';
    let title = 'stencil';
    let widthMm = 100;
    let dpi = 300;
    let userId = null;
    let studioId = null;
    let imageB64 = null;

    if (ct.indexOf('application/json') !== -1) {
      const body = await req.json();
      title = body.title || 'stencil';
      widthMm = parseFloat(body.width_mm || '100');
      dpi = parseInt(body.dpi || '300', 10);
      userId = body.user_id || null;
      studioId = body.studio_id || null;
      imageB64 = body.image_base64 || null;
    } else {
      const form = await req.formData();
      const f = form.get('image');
      title = form.get('title') || 'stencil';
      widthMm = parseFloat(form.get('width_mm') || '100');
      dpi = parseInt(form.get('dpi') || '300', 10);
      userId = form.get('user_id') || null;
      studioId = form.get('studio_id') || null;
      if (f && typeof f !== 'string') {
        const buf = Buffer.from(await f.arrayBuffer());
        imageB64 = buf.toString('base64');
      }
    }

    const created = await sbInsert('stencils', stencilInsertRow({
      userId: userId, studioId: studioId, title: title,
      sourceType: 'upload', widthMm: widthMm, heightMm: null, dpi: dpi
    }));
    const stencilId = created ? created.id : null;

    // A kep->stencil atalakitas a FLUX kep->kep generalassal
    const prompt = 'clean tattoo stencil line drawing, bold even black outlines on pure white background, no shading, no grey tones, print-ready transfer sheet';
    const payload = {
      input: {
        workflow: buildWorkflow(prompt, '', { width: 1024, height: 1024, steps: 20 }),
        images: imageB64 ? [{ name: 'source.png', image: 'data:image/png;base64,' + imageB64 }] : undefined
      }
    };

    const res = await fetch(base + '/run', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.RUNPOD_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000)
    });

    const out = await res.json().catch(function () { return {}; });
    if (!res.ok || !out.id) {
      return Response.json({
        ok: false,
        error: (out && out.error) || ('Runpod inditas hiba: ' + res.status)
      }, { status: 502 });
    }

    if (stencilId) await sbPatch('stencils', stencilId, { status: STATUS.processing });

    return Response.json({
      ok: true,
      runpodId: out.id,
      runpodStatus: out.status || 'IN_QUEUE',
      stencilId: stencilId,
      studioId: studioId,
      userId: userId,
      widthMm: widthMm, dpi: dpi, title: title
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 500 });
  }
}

// ---------- GET: a Runpod statusz ----------
export async function GET(req) {
  const u = new URL(req.url);
  const runpodId = u.searchParams.get('id');
  const stencilId = u.searchParams.get('stencil');
  const studioId = u.searchParams.get('studio');

  if (!runpodId) return Response.json({ ok: false, error: 'Hianyzo id.' }, { status: 400 });

  const base = (process.env.RUNPOD_TEXT_URL || process.env.RUNPOD_STENCIL_URL || '').replace(/\/+$/, '');
  if (!base) return Response.json({ ok: false, error: 'A GPU motor nincs beallitva.' }, { status: 503 });

  let st;
  try {
    const r = await fetch(base + '/status/' + encodeURIComponent(runpodId), {
      headers: { 'Authorization': 'Bearer ' + process.env.RUNPOD_API_KEY },
      signal: AbortSignal.timeout(20000)
    });
    st = await r.json().catch(function () { return {}; });
  } catch (e) {
    return Response.json({ ok: true, ready: false, status: 'IN_QUEUE', note: 'A Runpod statusz nem erheto el.' });
  }

  const status = String(st.status || '').toUpperCase();
  const done = status === 'COMPLETED' || status === 'SUCCESS';
  const failed = status === 'FAILED' || status === 'ERROR' || status === 'CANCELLED' || status === 'TIMED_OUT';

  if (!done && !failed) {
    return Response.json({ ok: true, ready: false, status: status || 'IN_QUEUE', runpodId: runpodId });
  }

  if (failed) {
    const msg = (st.output && st.output.error) || st.error || 'A generalas nem sikerult.';
    if (stencilId) await sbPatch('stencils', stencilId, stencilUpdateRow({ status: STATUS.failed, error: String(msg).slice(0, 400) }));
    return Response.json({ ok: true, ready: true, failed: true, error: String(msg).slice(0, 400), status: status });
  }

  const b64 = extractB64(st);
  if (!b64) {
    if (stencilId) await sbPatch('stencils', stencilId, stencilUpdateRow({ status: STATUS.failed, error: 'Nincs kep a valaszban.' }));
    return Response.json({ ok: true, ready: true, failed: true, error: 'A worker kesz, de nem adott kepet vissza.' });
  }

  const gpuMs = st.executionTime || 0;
  if (stencilId) {
    await sbPatch('stencils', stencilId, stencilUpdateRow({
      status: STATUS.ready, branchUsed: 'runpod-flux-lineart', gpuMs: gpuMs
    }));
  }
  if (studioId) {
    await sbInsert('credit_ledger', creditEntry(studioId, 'stencil_generate', CREDIT_COST.generate));
  }

  return Response.json({
    ok: true, ready: true, failed: false,
    png_base64: b64,
    executionMs: gpuMs || null,
    aiCostUsd: costUsd(gpuMs),
    runpodId: runpodId
  });
}
