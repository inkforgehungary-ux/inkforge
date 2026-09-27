// ============================================================
// INKFORGE — SZOVEGBOL KEP ES STENCIL
// POST /api/stencil/from-text          -> Runpod inditas, runpodId
// GET  /api/stencil/from-text?id=<RP>  -> a RUNPOD statusza (nem memoria!)
//
// HIBA JAVITAS (2026-09-27):
//   A regi kod a MEMORIABAN kereste a munkat (queue.js), de a Vercel
//   tobb peldanyt futtat es ujraindul -> "Ismeretlen munka".
//   Most a GET KOZVETLENUL a Runpodot kerdezi a runpodId-val.
//   A Runpod maga tarolja a munka allapotat -> nem veszik el.
// ============================================================

import { runpodReady } from '../../../../lib/runpod-client.js';
import { buildPromptFromDescription, styleTail } from '../../../../lib/prompt.js';
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

function buildWorkflow(prompt, negative, o) {
  const width = o.width || 1024;
  const height = o.height || 1024;
  const seed = Math.floor(Math.random() * 9007199254740991);
  return {
    '6':  { inputs: { text: prompt || '', clip: ['30', 1] }, class_type: 'CLIPTextEncode' },
    '8':  { inputs: { samples: ['31', 0], vae: ['30', 2] }, class_type: 'VAEDecode' },
    '9':  { inputs: { filename_prefix: 'inkforge', images: ['8', 0] }, class_type: 'SaveImage' },
    '27': { inputs: { width: width, height: height, batch_size: 1 }, class_type: 'EmptySD3LatentImage' },
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
    '35': { inputs: { guidance: o.guidance != null ? o.guidance : 3.5, conditioning: ['6', 0] }, class_type: 'FluxGuidance' }
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

export async function POST(req) {
  try {
    const body = await req.json();
    const userId = body.user_id || null;
    const studioId = body.studio_id || null;
    const description = String(body.description || '').trim();
    const styleSlug = body.style_slug || 'linework';
    const widthMm = parseFloat(body.width_mm || '100');
    const dpi = parseInt(body.dpi || '300', 10);
    const bodyPart = body.body_part || null;
    const title = String(body.title || description || 'ai-minta').slice(0, 80);

    if (description.length < 4) {
      return Response.json({ ok: false, error: 'Irj le, mit abrazoljon (par szo eleg).' }, { status: 400 });
    }
    if (!runpodReady()) {
      return Response.json({ ok: false, configured: false, error: 'A GPU motor nincs beallitva.' }, { status: 503 });
    }

    const built = buildPromptFromDescription(description, {
      bodyPart: bodyPart, styleTail: styleTail(styleSlug)
    });

    const created = await sbInsert('stencils', stencilInsertRow({
      userId: userId, studioId: studioId, title: title,
      sourceType: 'ai', sourcePrompt: built.prompt,
      widthMm: widthMm, heightMm: null, dpi: dpi
    }));
    const stencilId = created ? created.id : null;

    const base = (process.env.RUNPOD_TEXT_URL || process.env.RUNPOD_STENCIL_URL || '').replace(/\/+$/, '');
    const payload = {
      input: { workflow: buildWorkflow(built.prompt, built.negative, { width: 1024, height: 1024, steps: 20 }) }
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
      widthMm: widthMm,
      dpi: dpi,
      title: title,
      prompt: built.prompt,
      embeddedText: built.embeddedText,
      style: styleSlug
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 500 });
  }
}

// STATUSZ — kozvetlenul a Runpodot kerdezi a runpodId-val
export async function GET(req) {
  const u = new URL(req.url);
  const runpodId = u.searchParams.get('id');
  const stencilId = u.searchParams.get('stencil');
  const studioId = u.searchParams.get('studio');
  const widthMm = parseFloat(u.searchParams.get('mm') || '100');
  const dpi = parseInt(u.searchParams.get('dpi') || '300', 10);

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
    if (stencilId) {
      await sbPatch('stencils', stencilId, stencilUpdateRow({ status: STATUS.failed, error: String(msg).slice(0, 400) }));
    }
    return Response.json({ ok: true, ready: true, failed: true, error: String(msg).slice(0, 400), status: status });
  }

  const b64 = extractB64(st);
  if (!b64) {
    if (stencilId) {
      await sbPatch('stencils', stencilId, stencilUpdateRow({ status: STATUS.failed, error: 'A worker kesz, de nem adott kepet.' }));
    }
    return Response.json({ ok: true, ready: true, failed: true, error: 'A worker kesz, de nem adott kepet vissza.' });
  }

  const gpuMs = st.executionTime || 0;
  if (stencilId) {
    await sbPatch('stencils', stencilId, stencilUpdateRow({
      status: STATUS.ready,
      branchUsed: 'runpod-flux',
      gpuMs: gpuMs
    }));
  }
  if (studioId) {
    await sbInsert('credit_ledger', creditEntry(studioId, 'stencil_generate_ai', CREDIT_COST.generate_hd));
  }

  return Response.json({
    ok: true, ready: true, failed: false,
    png_base64: b64,
    executionMs: gpuMs || null,
    aiCostUsd: costUsd(gpuMs),
    runpodId: runpodId,
    widthMm: widthMm, dpi: dpi
  });
}
