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

export async function POST(req) {
  try {
    if (!runpodReady()) {
      return Response.json({
        ok: false, configured: false,
        error: 'A RunPod GPU motor nincs beállítva. Ellenőrizd a RUNPOD_STENCIL_URL és RUNPOD_API_KEY értékeket.'
      }, { status: 503 });
    }

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

    const start = await runpodRun({
      mode,
      image_base64: imageB64,
      prompt: body.prompt || 'preserve the source subject; clean tattoo stencil line art',
      max_side: Math.max(512, Math.min(1024, parseInt(body.max_side || '1024', 10))),
      target_width_mm: widthMm,
      target_height_mm: heightMm,
      steps: Math.max(8, Math.min(40, parseInt(body.steps || '22', 10))),
      strength: Math.max(0.15, Math.min(0.85, parseFloat(body.strength || '0.38'))),
      return_generated: true
    });

    if (stencilId) {
      await sbPatch('stencils', stencilId, { status: STATUS.processing });
    }

    return Response.json({
      ok: true,
      runpodId: start.id,
      runpodStatus: start.status || 'IN_QUEUE',
      stencilId, studioId, userId, title, widthMm, heightMm, dpi, mode
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
