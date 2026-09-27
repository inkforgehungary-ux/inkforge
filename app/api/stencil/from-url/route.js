// INKFORGE — KEP LINKBOL
// POST /api/stencil/from-url
// Utvonal: app/api/stencil/from-url/route.js -> ../../../../lib/

import { enqueue, jobStatus, jobResult, queueStats } from '../../../../lib/queue.js';
import { fetchImage, checkUrl } from '../../../../lib/image-url.js';
import { runpodLineart, runpodReady } from '../../../../lib/runpod-client.js';
import {
  stencilInsertRow, stencilUpdateRow, creditEntry,
  buildNames, storagePaths, BUCKET, CREDIT_COST, STATUS, costUsd
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
    const body = await req.json();
    const userId = body.user_id || null;
    const studioId = body.studio_id || null;
    const url = String(body.url || '').trim();
    const widthMm = parseFloat(body.width_mm || '100');
    const dpi = parseInt(body.dpi || '300', 10);
    const bridgePx = parseFloat(body.bridge_width || '1.2');
    const lineWeight = parseFloat(body.line_weight || '1.5');
    const targetCoverage = parseFloat(body.target_coverage || '0.06');
    const title = String(body.title || 'link-minta').slice(0, 80);

    const check = checkUrl(url);
    if (!check.ok) return Response.json({ ok: false, error: check.error }, { status: 400 });

    if (!runpodReady()) {
      return Response.json({
        ok: false, configured: false,
        error: 'A GPU motor nincs beallitva. Add meg a RUNPOD_STENCIL_URL es a RUNPOD_API_KEY valtozot.',
        queue: queueStats()
      }, { status: 503 });
    }

    const created = await sbInsert('stencils', stencilInsertRow({
      userId: userId, studioId: studioId,
      title: title, sourceType: 'url', sourcePath: check.url,
      widthMm: widthMm, heightMm: null, dpi: dpi,
      lineWeight: lineWeight, bridgeWidth: bridgePx
    }));
    const stencilId = created ? created.id : null;

    const jobId = enqueue(async function () {
      if (stencilId) await sbPatch('stencils', stencilId, { status: STATUS.processing });
      const t0 = Date.now();
      try {
        const got = await fetchImage(check.url);
        const blob = new Blob([got.bytes], { type: got.contentType });
        const conv = await runpodLineart(blob, {
          mode: 'lineart', maxDim: 2000,
          targetCoverage: targetCoverage,
          bridges: true, bridgeWidth: Math.round(bridgePx)
        });
        const totalMs = Date.now() - t0;
        const gpuMs = conv.ms || totalMs;
        const heightMm = Math.round(widthMm * conv.height / conv.width * 100) / 100;

        const names = buildNames(title, widthMm, dpi);
        const paths = storagePaths(studioId, names);
        const pngPath = await sbUpload(paths.png, Buffer.from(conv.png_base64, 'base64'), 'image/png');
        const srcPath = await sbUpload(paths.base + '-eredeti.' + got.kind, got.bytes, got.contentType);

        if (stencilId) {
          await sbPatch('stencils', stencilId, stencilUpdateRow({
            status: STATUS.ready, branchUsed: 'runpod-url',
            coverage: conv.coverage, previewPath: pngPath, gpuMs: gpuMs
          }));
        }
        if (studioId) {
          await sbInsert('credit_ledger', creditEntry(studioId, 'stencil_generate_url', CREDIT_COST.generate));
        }

        return {
          id: stencilId, source_url: check.url,
          png_base64: conv.png_base64,
          width: conv.width, height: conv.height, height_mm: heightMm,
          coverage: conv.coverage, quality: conv.quality,
          bridges: conv.bridges, islands: conv.islands,
          ms: totalMs, gpuMs: gpuMs, aiCostUsd: costUsd(gpuMs),
          stored: { png: pngPath, source: srcPath }
        };
      } catch (e) {
        const msg = String(e && e.message ? e.message : e);
        if (stencilId) await sbPatch('stencils', stencilId, stencilUpdateRow({ status: STATUS.failed, error: msg }));
        throw e;
      }
    }, { mode: 'url', url: check.url });

    return Response.json({
      ok: true, jobId: jobId, stencilId: stencilId,
      sourceUrl: check.url, queue: queueStats()
    });
  } catch (e) {
    if (e && e.code === 'QUEUE_FULL') {
      return Response.json({ ok: false, error: e.message, queue: queueStats() }, { status: 429 });
    }
    return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 500 });
  }
}

export async function GET(req) {
  const u = new URL(req.url);
  const id = u.searchParams.get('id');
  const what = u.searchParams.get('what') || 'status';
  if (!id) return Response.json({ ok: false, error: 'Hianyzo id.' }, { status: 400 });
  if (what === 'result') {
    const res = jobResult(id);
    if (!res) return Response.json({ ok: false, ready: false, status: jobStatus(id) }, { status: 202 });
    return Response.json({ ok: true, ready: true, result: res });
  }
  const st = jobStatus(id);
  if (!st) return Response.json({ ok: false, error: 'Ismeretlen munka.' }, { status: 404 });
  return Response.json({ ok: true, status: st, queue: queueStats() });
}
