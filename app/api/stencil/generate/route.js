// ============================================================
// INKFORGE — GENERALAS API
// A keres bekerul a sorba, majd az allapot lekerdezheto.
//
// 1) POST /api/stencil/generate  -> { jobId }
// 2) GET  /api/stencil/status?id= -> { status, position, etaS }
// 3) GET  /api/stencil/result?id= -> { png_base64, report }
// ============================================================

import { enqueue, jobStatus, jobResult, queueStats, cacheKey, cacheGet, cacheSet, estimateCost } from '../../../lib/queue.js';
import { runpodLineart } from '../../../lib/runpod-client.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function runpodOk() {
  return !!(process.env.RUNPOD_STENCIL_URL && process.env.RUNPOD_API_KEY);
}

async function sbInsert(table, row) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(row)
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? j[0] : j;
  } catch (e) {
    return null;
  }
}

// ---------- 1. Generalas inditasa ----------

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get('image');
    if (!file || typeof file === 'string') {
      return Response.json({ ok: false, error: 'Hianyzo kep.' }, { status: 400 });
    }

    const mode = form.get('mode') || 'lineart';
    const targetCoverage = parseFloat(form.get('target_coverage') || '0.06');
    const maxDim = parseInt(form.get('max_dim') || '2000', 10);
    const bridgePx = parseInt(form.get('bridge_width') || '2', 10);
    const widthMm = parseFloat(form.get('width_mm') || '100');
    const dpi = parseInt(form.get('dpi') || '300', 10);
    const userId = form.get('user_id') || null;
    const studioId = form.get('studio_id') || null;

    const bytes = Buffer.from(await file.arrayBuffer());
    const key = cacheKey({ name: file.name, size: bytes.length }, {
      mode, targetCoverage, widthMm, dpi, bridges: true, bridgePx
    });

    // Cache-talalat: nulla GPU-ido
    const hit = cacheGet(key);
    if (hit) {
      return Response.json({ ok: true, cached: true, result: hit, cost: estimateCost(0) });
    }

    if (!runpodOk()) {
      return Response.json({
        ok: false,
        configured: false,
        error: 'A GPU motor nincs beallitva. Add meg a RUNPOD_STENCIL_URL es a RUNPOD_API_KEY kornyezeti valtozot.',
        queue: queueStats()
      }, { status: 503 });
    }

    const blob = new Blob([bytes], { type: file.type || 'image/png' });
    const fakeFile = new File([blob], file.name || 'image.png', { type: file.type || 'image/png' });

    const jobId = enqueue(async function () {
      const t0 = Date.now();
      const r = await runpodLineart(fakeFile, {
        mode, maxDim, targetCoverage, bridges: true, bridgeWidth: bridgePx
      });
      const ms = Date.now() - t0;

      const result = {
        png_base64: r.png_base64,
        width: r.width,
        height: r.height,
        coverage: r.coverage,
        threshold: r.threshold,
        bridges: r.bridges,
        islands: r.islands,
        quality: r.quality,
        engine: r.engine,
        ms: ms,
        gpuMs: r.ms || ms
      };

      cacheSet(key, result);

      // Naplozas a Supabase-ba (ha be van allitva)
      await sbInsert('stencil_usage', {
        user_id: userId,
        studio_id: studioId,
        mode: mode,
        target_coverage: targetCoverage,
        width_mm: widthMm,
        dpi: dpi,
        coverage_pct: r.coverage,
        bridges: r.bridges,
        islands: r.islands,
        quality: r.quality,
        gpu_ms: r.ms || ms,
        total_ms: ms,
        engine: r.engine,
        source: 'runpod'
      });

      return result;
    }, { mode, targetCoverage });

    return Response.json({
      ok: true,
      cached: false,
      jobId: jobId,
      queue: queueStats(),
      estimate: estimateCost(1)
    });
  } catch (e) {
    if (e && e.code === 'QUEUE_FULL') {
      return Response.json({ ok: false, error: e.message, queue: queueStats() }, { status: 429 });
    }
    return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 500 });
  }
}

export async function GET(req) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const what = url.searchParams.get('what') || 'status';

  if (!id) {
    return Response.json({ ok: false, error: 'Hianyzo id.', queue: queueStats() }, { status: 400 });
  }

  if (what === 'result') {
    const res = jobResult(id);
    if (!res) {
      const st = jobStatus(id);
      return Response.json({ ok: false, ready: false, status: st }, { status: 202 });
    }
    return Response.json({ ok: true, ready: true, result: res });
  }

  const st = jobStatus(id);
  if (!st) {
    return Response.json({ ok: false, error: 'Ismeretlen munka.' }, { status: 404 });
  }
  return Response.json({ ok: true, status: st, queue: queueStats() });
}
