// ============================================================
// INKFORGE — GENERALAS a meglevo semahoz
// POST /api/stencil/generate  -> { jobId } vagy cache-talalat
// GET  /api/stencil/generate?id=            -> allapot
// GET  /api/stencil/generate?id=&what=result -> eredmeny
//
// MENTES: stencils, stencil_layers, credit_ledger
// ============================================================

import { enqueue, jobStatus, jobResult, queueStats, cacheKey, cacheGet, cacheSet, estimateCost } from '../../../lib/queue.js';
import { runpodLineart } from '../../../lib/runpod-client.js';
import { stencilRow, creditEntry, buildNames, storagePaths, BUCKET, CREDIT_COST } from '../../../lib/save.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function runpodOk() {
  return !!(process.env.RUNPOD_STENCIL_URL && process.env.RUNPOD_API_KEY);
}

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

async function sbUpload(path, bytes, contentType) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + path, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': contentType,
        'x-upsert': 'true'
      },
      body: bytes
    });
    return r.ok ? path : null;
  } catch (e) { return null; }
}

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
    const lineWeight = parseFloat(form.get('line_weight') || '1');
    const widthMm = parseFloat(form.get('width_mm') || '100');
    const dpi = parseInt(form.get('dpi') || '300', 10);
    const title = form.get('title') || 'stencil';
    const userId = form.get('user_id') || null;
    const studioId = form.get('studio_id') || null;
    const styleId = form.get('style_id') ? parseInt(form.get('style_id'), 10) : null;
    const wantHd = form.get('hd') === 'true';

    const bytes = Buffer.from(await file.arrayBuffer());

    const key = cacheKey({ name: file.name, size: bytes.length },
      { mode, targetCoverage, widthMm, dpi, bridgePx });

    const hit = cacheGet(key);
    if (hit) {
      return Response.json({ ok: true, cached: true, result: hit, cost: 0 });
    }

    if (!runpodOk()) {
      return Response.json({
        ok: false,
        configured: false,
        error: 'A GPU motor nincs beallitva. Add meg a RUNPOD_STENCIL_URL es a RUNPOD_API_KEY valtozot.',
        queue: queueStats()
      }, { status: 503 });
    }

    const mime = file.type || 'image/png';
    const fname = file.name || 'image.png';
    const fakeFile = new File([new Blob([bytes], { type: mime })], fname, { type: mime });

    const jobId = enqueue(async function () {
      const t0 = Date.now();
      const r = await runpodLineart(fakeFile, {
        mode, maxDim, targetCoverage, bridges: true, bridgeWidth: bridgePx
      });
      const ms = Date.now() - t0;
      const heightMm = Math.round(widthMm * r.height / r.width * 100) / 100;

      const names = buildNames(title, widthMm, dpi);
      const paths = storagePaths(studioId, names);
      const pngBytes = Buffer.from(r.png_base64, 'base64');
      const pngPath = await sbUpload(paths.png, pngBytes, 'image/png');

      const row = stencilRow({
        userId: userId,
        studioId: studioId,
        title: title,
        sourceType: 'upload',
        sourcePath: null,
        styleId: styleId,
        status: 'ready',
        lineWeight: lineWeight,
        bridgeWidth: bridgePx,
        widthMm: widthMm,
        heightMm: heightMm,
        dpi: dpi,
        branchUsed: 'runpod-' + mode,
        coverage: r.coverage,
        previewPath: pngPath,
        pdfPath: null
      });

      const saved = await sbInsert('stencils', row);

      if (studioId) {
        await sbInsert('credit_ledger', creditEntry(
          studioId,
          mode === 'lineart' ? 'stencil_generate' : 'stencil_generate_' + mode,
          wantHd ? CREDIT_COST.generate_hd : CREDIT_COST.generate
        ));
      }

      const result = {
        id: saved ? saved.id : null,
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
        gpuMs: r.ms || ms,
        stored: { png: pngPath }
      };

      cacheSet(key, result);
      return result;
    }, { mode: mode, targetCoverage: targetCoverage });

    return Response.json({
      ok: true,
      cached: false,
      jobId: jobId,
      queue: queueStats(),
      estimate: estimateCost(1),
      cost: wantHd ? CREDIT_COST.generate_hd : CREDIT_COST.generate
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
      return Response.json({ ok: false, ready: false, status: jobStatus(id) }, { status: 202 });
    }
    return Response.json({ ok: true, ready: true, result: res });
  }

  const st = jobStatus(id);
  if (!st) {
    return Response.json({ ok: false, error: 'Ismeretlen munka.' }, { status: 404 });
  }
  return Response.json({ ok: true, status: st, queue: queueStats() });
}
