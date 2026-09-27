// ============================================================
// INKFORGE — GENERALAS SZOVEGBOL
// POST /api/stencil/from-text
//
// 1) prompt osszeallitasa (targy + stilus)
// 2) Runpod: text-to-image -> minta
// 3) opcionalis: image-to-image -> stencil
// 4) mentes: stencils (source_type='ai', source_prompt), credit_ledger
// ============================================================

import { runpodText, runpodLineart, runpodReady } from '../../../lib/runpod-client.js';
import { enqueue, jobStatus, jobResult, queueStats } from '../../../lib/queue.js';
import { buildPrompt, runpodPayload, buildConvertPrompt, presetBySlug } from '../../../lib/template.js';
import {
  stencilInsertRow, stencilUpdateRow, creditEntry,
  buildNames, storagePaths, BUCKET, CREDIT_COST, STATUS, costUsd
} from '../../../lib/save.js';

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
    const userId = body.user_id;
    const studioId = body.studio_id || null;
    const subject = String(body.subject || '').trim();
    const styleSlug = body.style_slug || 'linework';
    const widthMm = parseFloat(body.width_mm || '100');
    const dpi = parseInt(body.dpi || '300', 10);
    const count = Math.max(1, Math.min(4, parseInt(body.count || '1', 10)));
    const lang = body.lang || 'hu';
    const title = String(body.title || subject || 'ai-minta').slice(0, 80);

    if (!userId) {
      return Response.json({ ok: false, error: 'Hianyzo user_id.' }, { status: 400 });
    }
    if (!subject && !body.prompt) {
      return Response.json({ ok: false, error: 'Irj be egy targyat (pl. rozsa, farkas, hullam).' }, { status: 400 });
    }
    if (!runpodReady()) {
      return Response.json({
        ok: false, configured: false,
        error: 'A GPU motor nincs beallitva. Add meg a RUNPOD_STENCIL_URL es a RUNPOD_API_KEY valtozot.',
        queue: queueStats()
      }, { status: 503 });
    }

    const built = buildPrompt(subject, styleSlug, { lang: lang });
    const preset = presetBySlug(styleSlug);

    // Kezdo sor: queued, source_type = 'ai'
    const created = await sbInsert('stencils', stencilInsertRow({
      userId: userId, studioId: studioId,
      title: title,
      sourceType: 'ai',
      sourcePrompt: built.prompt,
      widthMm: widthMm, heightMm: null, dpi: dpi
    }));
    const stencilId = created ? created.id : null;

    const jobId = enqueue(async function () {
      if (stencilId) await sbPatch('stencils', stencilId, { status: STATUS.processing });

      const t0 = Date.now();
      let gen;
      try {
        // 1) Minta generalasa szovegbol
        gen = await runpodText({ prompt: built.prompt, negative: built.negative, count: count });

        // 2) Stencil-konverzio a generalt képbol
        const conv = await runpodLineart(gen.imageUrl || gen.imageBlob, {
          mode: 'lineart', maxDim: 2000,
          targetCoverage: 0.06, bridges: true, bridgeWidth: 2
        });

        const totalMs = Date.now() - t0;
        const gpuMs = (gen.ms || 0) + (conv.ms || 0);

        const names = buildNames(title, widthMm, dpi);
        const paths = storagePaths(studioId, names);
        const pngBytes = Buffer.from(conv.png_base64, 'base64');

        const pngPath = await sbUpload(paths.png, pngBytes, 'image/png');
        const srcPath = gen.pngBase64
          ? await sbUpload(paths.base + '-eredeti.png', Buffer.from(gen.pngBase64, 'base64'), 'image/png')
          : null;

        const heightMm = Math.round(widthMm * conv.height / conv.width * 100) / 100;

        if (stencilId) {
          await sbPatch('stencils', stencilId, stencilUpdateRow({
            status: STATUS.ready,
            branchUsed: 'runpod-ai-' + (preset ? preset.slug : 'lineart'),
            coverage: conv.coverage,
            previewPath: pngPath,
            gpuMs: gpuMs
          }));
        }

        if (studioId) {
          await sbInsert('credit_ledger', creditEntry(
            studioId, 'stencil_generate_ai', CREDIT_COST.generate_hd
          ));
        }

        return {
          id: stencilId,
          prompt: built.prompt,
          style: preset ? preset.slug : null,
          png_base64: conv.png_base64,
          source_png_base64: gen.pngBase64 || null,
          width: conv.width, height: conv.height,
          height_mm: heightMm,
          coverage: conv.coverage,
          quality: conv.quality,
          ms: totalMs, gpuMs: gpuMs,
          aiCostUsd: costUsd(gpuMs),
          stored: { png: pngPath, source: srcPath }
        };
      } catch (e) {
        const msg = String(e && e.message ? e.message : e);
        if (stencilId) await sbPatch('stencils', stencilId, stencilUpdateRow({ status: STATUS.failed, error: msg }));
        throw e;
      }
    }, { mode: 'ai-text', subject: subject });

    return Response.json({
      ok: true,
      jobId: jobId,
      stencilId: stencilId,
      prompt: built.prompt,
      style: preset ? { slug: preset.slug, hu: preset.hu, en: preset.en } : null,
      queue: queueStats()
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 500 });
  }
}

export async function GET(req) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const what = url.searchParams.get('what') || 'status';
  if (!id) return Response.json({ ok: false, error: 'Hianyzo id.' }, { status: 400 });
  if (what === 'result') {
    const res = jobResult(id);
    if (!res) return Response.json({ ok: false, ready: false, status: jobStatus(id) }, { status: 202 });
    return Response.json({ ok: true, ready: true, result: res });
  }
  const st = jobStatus(id);
  if (!st) return Response.json({ ok: false, error: 'Ismeretlen munka.' }, { status: 404 });
  return Response.json({ ok: true, status: st });
}
