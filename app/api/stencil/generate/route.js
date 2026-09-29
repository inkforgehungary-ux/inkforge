// INKFORGE — KÉP -> STENCIL / KÉP -> KÉP -> STENCIL
// POST /api/stencil/generate -> RunPod Serverless job
// GET  /api/stencil/generate?id=... -> RunPod status + eredmény

import {
  runpodReady, runpodRun, runpodStatus,
  extractRunpodOutput, extractRunpodBase64
} from '../../../../lib/runpod-client.js';
import {
  stencilInsertRow, stencilUpdateRow, creditEntry,
  CREDIT_COST, STATUS, costUsd
} from '../../../../lib/save.js';

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
      method: 'POST',
      headers: sbHeaders({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(row)
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? j[0] : j;
  } catch (e) { return null; }
}
async function sbPatch(table, id, patch, extraQuery) {
  if (!SUPABASE_URL || !SERVICE_KEY || !id) return null;
  try {
    const q = '?id=eq.' + encodeURIComponent(id) + (extraQuery || '');
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table + q, {
      method: 'PATCH',
      headers: sbHeaders({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(patch)
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? (j[0] || null) : j;
  } catch (e) { return null; }
}
function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

const WANTERA_IMAGE_URL = (process.env.INKFORGE_IMAGE_FUNCTION_URL || 'https://mxrgdcvmxzhocbdhtlhg.supabase.co/functions/v1/inkforge-image').replace(/\/$/, '');
export const maxDuration = 300;

function asDataUri(value, mime) {
  const s = String(value || '');
  return s.startsWith('data:') ? s : ('data:' + (mime || 'image/jpeg') + ';base64,' + s);
}

async function callWanteraImage(payload, req) {
  const headers = { 'Content-Type': 'application/json' };
  const auth = req.headers.get('authorization');
  if (auth) headers.Authorization = auth;
  const r = await fetch(WANTERA_IMAGE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(240000),
    cache: 'no-store'
  });
  const raw = await r.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
  if (!r.ok || !data.url) {
    throw new Error(data.message || data.error || ('Wantera AI HTTP ' + r.status));
  }
  return data;
}

async function imageUrlToBase64(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(60000), cache: 'no-store' });
  if (!r.ok) throw new Error('A Wantera AI kép nem tölthető le (HTTP ' + r.status + ').');
  return Buffer.from(await r.arrayBuffer()).toString('base64');
}

export async function POST(req) {
  try {
    const ct = req.headers.get('content-type') || '';
    let body = {};
    let imageB64 = null;

    if (ct.includes('application/json')) {
      body = await req.json();
      imageB64 = body.image_base64 || null;
    } else {
      const form = await req.formData();
      const f = form.get('image');
      if (f && typeof f !== 'string') {
        imageB64 = toBase64(new Uint8Array(await f.arrayBuffer()));
      }
      body = {
        mode: form.get('mode'),
        prompt: form.get('prompt'),
        title: form.get('title'),
        width_mm: form.get('width_mm'),
        height_mm: form.get('height_mm'),
        dpi: form.get('dpi'),
        user_id: form.get('user_id'),
        studio_id: form.get('studio_id'),
        max_side: form.get('max_side'),
        steps: form.get('steps'),
        strength: form.get('strength')
      };
    }

    const mode = String(body.mode || 'image_to_image_stencil');
    if (!['image_to_stencil', 'image_to_image_stencil', 'image_to_image'].includes(mode)) {
      return Response.json({ ok: false, error: 'Érvénytelen kép mód.' }, { status: 400 });
    }
    if (!imageB64) return Response.json({ ok: false, error: 'Hiányzik a feltöltött kép.' }, { status: 400 });

    const widthMm = Math.max(20, Math.min(700, parseFloat(body.width_mm || '100')));
    const heightMm = Math.max(20, Math.min(1000, parseFloat(body.height_mm || widthMm)));
    const dpi = [150, 300, 600].includes(parseInt(body.dpi || '300', 10))
      ? parseInt(body.dpi || '300', 10) : 300;
    const title = String(body.title || 'stencil').slice(0, 80);
    const userId = body.user_id || null;
    const studioId = body.studio_id || null;

    const created = await sbInsert('stencils', stencilInsertRow({
      userId, studioId, title, sourceType: 'upload',
      widthMm, heightMm, dpi
    }));
    const stencilId = created ? created.id : null;

    const sourceDataUri = asDataUri(imageB64, 'image/jpeg');
    const ai = await callWanteraImage({
      mode: 'linetrace',
      image: sourceDataUri,
      aspectRatio: '1:1',
      prompt: body.prompt || [
        'professional tattoo transfer stencil',
        'preserve the exact subject and anatomy',
        'extract essential outer contour and structural interior lines',
        'very thin continuous black linework',
        'clean negative space',
        'remove background, scenery, grey shading, gradients and texture',
        'print-ready tattoo stencil on white background'
      ].join(', ')
    }, req);

    const finalBase64 = await imageUrlToBase64(ai.url);
    if (stencilId) {
      await sbPatch('stencils', stencilId, {
        status: STATUS.ready,
        branchUsed: ai.model || 'Wantera RunPod + Runware Lineart',
        coverage: 0,
        gpuMs: 0,
        error: null
      });
      if (studioId) await sbInsert('credit_ledger', creditEntry(
        studioId, 'stencil_wantera_lineart', CREDIT_COST.generate
      ));
    }

    return Response.json({
      ok: true,
      ready: true,
      failed: false,
      png_base64: finalBase64,
      generated_png_base64: null,
      width: 1024,
      height: 1024,
      stencilId, studioId, userId, title, widthMm, heightMm, dpi, mode,
      engine: ai.model || 'Wantera RunPod + Runware Lineart',
      provider: ai.provider || 'Wantera',
      quality: 'ai_lineart',
      verdictText: 'Professzionális AI vonalrajz elkészült.'
    });
  } catch (e) {
    return Response.json({
      ok: false,
      error: String(e && e.message ? e.message : e)
    }, { status: 500 });
  }
}

export async function GET(req) {
  const u = new URL(req.url);
  const id = u.searchParams.get('id');
  const stencilId = u.searchParams.get('stencil');
  const studioId = u.searchParams.get('studio');
  const widthMm = Math.max(20, parseFloat(u.searchParams.get('mm') || '100'));
  const requestedHeightMm = parseFloat(u.searchParams.get('hmm') || '');
  const dpi = parseInt(u.searchParams.get('dpi') || '300', 10);

  if (!id) return Response.json({ ok: false, error: 'Hiányzó RunPod id.' }, { status: 400 });

  try {
    const st = await runpodStatus(id);
    const status = String(st.status || '').toUpperCase();
    const failed = ['FAILED', 'ERROR', 'CANCELLED', 'TIMED_OUT'].includes(status);

    if (!['COMPLETED', 'SUCCESS'].includes(status) && !failed) {
      return Response.json({ ok: true, ready: false, status, runpodId: id });
    }

    const output = extractRunpodOutput(st) || {};
    if (failed) {
      const msg = output.error || output.message || st.error || 'A RunPod feladat sikertelen.';
      if (stencilId) await sbPatch(
        'stencils', stencilId,
        stencilUpdateRow({ status: STATUS.failed, error: msg }),
        '&status=eq.' + encodeURIComponent(STATUS.processing)
      );
      return Response.json({ ok: true, ready: true, failed: true, error: String(msg), status });
    }

    const b64 = extractRunpodBase64(st);
    if (!b64) {
      const msg = 'A RunPod worker kész, de nem adott vissza stencil képet.';
      if (stencilId) await sbPatch(
        'stencils', stencilId,
        stencilUpdateRow({ status: STATUS.failed, error: msg }),
        '&status=eq.' + encodeURIComponent(STATUS.processing)
      );
      return Response.json({ ok: true, ready: true, failed: true, error: msg });
    }

    const width = Number(output.width || 768);
    const height = Number(output.height || 768);
    const heightMm = Number.isFinite(requestedHeightMm) && requestedHeightMm > 0
      ? Math.round(requestedHeightMm * 100) / 100
      : Math.round(widthMm * height / Math.max(1, width) * 100) / 100;
    const gpuMs = Number(output.gpu_ms || output.executionTime || 0);

    let transitioned = null;
    if (stencilId) {
      transitioned = await sbPatch(
        'stencils', stencilId,
        stencilUpdateRow({
          status: STATUS.ready,
          branchUsed: output.mode || 'runpod',
          coverage: output.coverage,
          heightMm,
          gpuMs,
          error: null
        }),
        '&status=eq.' + encodeURIComponent(STATUS.processing)
      );
    }

    // Csak az első processing -> ready átmenet ír kreditet.
    if (transitioned && studioId) {
      await sbInsert(
        'credit_ledger',
        creditEntry(
          studioId,
          'stencil_' + (output.mode || 'runpod'),
          output.mode === 'image_to_image' ? CREDIT_COST.generate_hd : CREDIT_COST.generate
        )
      );
    }

    return Response.json({
      ok: true, ready: true, failed: false,
      png_base64: b64,
      generated_png_base64: output.generated_png_base64 || null,
      width, height, widthMm, heightMm, dpi,
      coverage: output.coverage,
      bridges: output.bridges || 0,
      islands: output.islands || 0,
      quality: output.quality || 'hasznalhato',
      verdictText: output.verdictText || 'Éles, nyomtatható stencil-vonalrajz.',
      gpuMs,
      aiCostUsd: costUsd(gpuMs),
      runpodId: id,
      mode: output.mode || null,
      engine: output.engine || null
    });
  } catch (e) {
    return Response.json({
      ok: true, ready: false, status: 'RETRY',
      note: String(e && e.message ? e.message : e)
    }, { status: 202 });
  }
}
