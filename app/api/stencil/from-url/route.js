// INKFORGE — KÉP LINKBŐL -> AI KÉP -> STENCIL
// image_to_image: RunPod FLUX.1 Kontext dev
// image_to_image_stencil: Kontext -> saját stencil worker
// image_to_stencil: közvetlen saját stencil worker

import { fetchImage, checkUrl } from '../../../../lib/image-url.js';
import { runpodReady, runpodRun, runpodStatus, extractRunpodOutput, extractRunpodBase64 } from '../../../../lib/runpod-client.js';
import { zImageImageToImage, fluxKontextImageToImage } from '../../../../lib/runpod-public.js';
import { stencilInsertRow, stencilUpdateRow, creditEntry, CREDIT_COST, STATUS, costUsd } from '../../../../lib/save.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const WANTERA_IMAGE_URL = (process.env.INKFORGE_IMAGE_FUNCTION_URL || 'https://mxrgdcvmxzhocbdhtlhg.supabase.co/functions/v1/inkforge-image').replace(/\/$/, '');
export const maxDuration = 300;

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
  if (!r.ok || !data.url) throw new Error(data.message || data.error || ('Wantera AI HTTP ' + r.status));
  return data;
}

function sbHeaders(extra) {
  return Object.assign({
    apikey: SERVICE_KEY,
    Authorization: 'Bearer ' + SERVICE_KEY,
    'Content-Type': 'application/json'
  }, extra || {});
}
async function sbInsert(table, row) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(row)
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? j[0] : j;
  } catch (_) { return null; }
}
async function sbPatch(table, id, patch, extra) {
  if (!SUPABASE_URL || !SERVICE_KEY || !id) return null;
  try {
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id) + (extra || ''),
      {
        method: 'PATCH',
        headers: sbHeaders({ Prefer: 'return=representation' }),
        body: JSON.stringify(patch)
      }
    );
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? (j[0] || null) : j;
  } catch (_) { return null; }
}

export async function POST(req) {
  try {
    if (!process.env.RUNPOD_API_KEY) {
      return Response.json({ ok: false, configured: false, error: 'A RUNPOD_API_KEY nincs beállítva.' }, { status: 503 });
    }

    const body = await req.json();
    const check = checkUrl(String(body.url || '').trim());
    if (!check.ok) return Response.json({ ok: false, error: check.error }, { status: 400 });

    const widthMm = Math.max(20, Math.min(700, parseFloat(body.width_mm || '100')));
    const heightMm = Math.max(20, Math.min(1000, parseFloat(body.height_mm || body.width_mm || '100')));
    const dpi = [150, 300, 600].includes(parseInt(body.dpi || '300', 10))
      ? parseInt(body.dpi || '300', 10) : 300;
    const mode = ['image_to_stencil', 'image_to_image_stencil', 'image_to_image'].includes(String(body.mode || 'image_to_image_stencil'))
      ? String(body.mode || 'image_to_image_stencil') : 'image_to_image_stencil';
    const title = String(body.title || 'link-minta').slice(0, 80);

    // Biztonságos szerveroldali letöltés + méret/formátum ellenőrzés.
    const got = await fetchImage(check.url);

    const created = await sbInsert('stencils', stencilInsertRow({
      userId: body.user_id || null,
      studioId: body.studio_id || null,
      title,
      sourceType: 'url',
      sourcePath: check.url,
      widthMm,
      heightMm,
      dpi
    }));
    const stencilId = created ? created.id : null;

    // A public RunPod image-to-image modellek URL-t kapnak.
    // Az eredeti URL közvetlenül továbbítható; a fetchImage fent a saját biztonsági ellenőrzésünket végzi.
    const referenceUrl = check.url;

    if (mode === 'image_to_image') {
      // Profi kép -> kép: FLUX.1 Kontext dev.
      const generated = await fluxKontextImageToImage({
        imageUrl: referenceUrl,
        prompt: body.prompt || 'refine this tattoo reference, preserve the exact subject and composition, clean professional tattoo artwork, isolated white background',
        size: '1024*1024'
      });

      return Response.json({
        ok: true,
        ready: true,
        failed: false,
        png_base64: generated.base64,
        generated_png_base64: generated.base64,
        generated_image_url: generated.url,
        width: 1024,
        height: 1024,
        widthMm,
        heightMm,
        dpi,
        mode,
        engine: generated.engine,
        aiCostUsd: generated.cost,
        coverage: 0,
        bridges: 0,
        islands: 1,
        quality: 'ai_kep',
        verdictText: 'RunPod FLUX.1 Kontext dev kép-kép átalakítás elkészült.',
        prompt: body.prompt || null
      });
    }

    // A profi stencil ág közvetlenül a Wantera projekt meglévő AI láncát használja:
    // RunPod Qwen Image (ha promptból kell kép) + Runware Lineart.
    const sourceData = check.url;
    const ai = await callWanteraImage({
      mode: 'linetrace',
      image: sourceData,
      aspectRatio: '1:1',
      prompt: body.prompt || [
        'professional tattoo transfer stencil',
        'preserve the exact subject and important anatomy',
        'extract essential outer contour and structural interior lines',
        'very thin continuous black linework',
        'clean negative space',
        'remove background, scenery, grey shading, gradients and texture',
        'print-ready tattoo stencil on white background'
      ].join(', ')
    }, req);

    const aiBytes = await (async () => {
      const r = await fetch(ai.url, { signal: AbortSignal.timeout(60000), cache: 'no-store' });
      if (!r.ok) throw new Error('A Wantera AI kép nem tölthető le (HTTP ' + r.status + ').');
      return new Uint8Array(await r.arrayBuffer());
    })();
    const finalBase64 = Buffer.from(aiBytes).toString('base64');

    if (stencilId) await sbPatch('stencils', stencilId, {
      status: STATUS.ready,
      branchUsed: ai.model || 'Wantera RunPod + Runware Lineart',
      coverage: 0,
      gpuMs: 0,
      error: null
    });
    if (stencilId && studioId) {
      await sbInsert('credit_ledger', creditEntry(
        studioId, 'stencil_url_wantera_lineart', CREDIT_COST.generate
      ));
    }

    return Response.json({
      ok: true,
      ready: true,
      failed: false,
      png_base64: finalBase64,
      generated_png_base64: null,
      generated_image_url: null,
      width: Number(ai.width || 1024),
      height: Number(ai.height || 1024),
      widthMm,
      heightMm,
      dpi,
      title,
      mode,
      stencilId,
      studioId: body.studio_id || null,
      userId: body.user_id || null,
      sourceUrl: check.url,
      engine: ai.model || 'Wantera RunPod + Runware Lineart',
      provider: ai.provider || 'Wantera',
      quality: 'ai_lineart',
      verdictText: 'Professzionális AI vonalrajz elkészült.'
    });

    if (stencilId) await sbPatch('stencils', stencilId, { status: STATUS.processing });

    return Response.json({
      ok: true,
      runpodId: start.id,
      runpodStatus: start.status || 'IN_QUEUE',
      stencilId,
      studioId: body.studio_id || null,
      userId: body.user_id || null,
      sourceUrl: check.url,
      widthMm,
      heightMm,
      dpi,
      title,
      mode,
      generated_png_base64: generated ? generated.base64 : null,
      generated_image_url: generated ? generated.url : null,
      generated_engine: generated ? generated.engine : null
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 500 });
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

    const out = extractRunpodOutput(st) || {};
    if (failed) {
      const msg = out.error || out.message || st.error || 'A RunPod feladat sikertelen.';
      if (stencilId) await sbPatch('stencils', stencilId, stencilUpdateRow({ status: STATUS.failed, error: msg }), '&status=eq.' + encodeURIComponent(STATUS.processing));
      return Response.json({ ok: true, ready: true, failed: true, error: String(msg), status });
    }

    const b64 = extractRunpodBase64(st);
    if (!b64) return Response.json({ ok: true, ready: true, failed: true, error: 'A worker kész, de nem adott képet.' });

    const width = Number(out.width || 768);
    const height = Number(out.height || 768);
    const heightMm = Number.isFinite(requestedHeightMm) && requestedHeightMm > 0
      ? Math.round(requestedHeightMm * 100) / 100
      : Math.round(widthMm * height / Math.max(1, width) * 100) / 100;
    const gpuMs = Number(out.gpu_ms || out.executionTime || 0);

    let transitioned = null;
    if (stencilId) transitioned = await sbPatch(
      'stencils',
      stencilId,
      stencilUpdateRow({
        status: STATUS.ready,
        branchUsed: 'runpod-image-pipeline',
        coverage: out.coverage,
        heightMm,
        gpuMs,
        error: null
      }),
      '&status=eq.' + encodeURIComponent(STATUS.processing)
    );
    if (transitioned && studioId) {
      await sbInsert('credit_ledger', creditEntry(
        studioId,
        'stencil_url_' + (out.mode || 'runpod'),
        CREDIT_COST.generate
      ));
    }

    return Response.json({
      ok: true,
      ready: true,
      failed: false,
      png_base64: b64,
      generated_png_base64: out.generated_png_base64 || null,
      width,
      height,
      widthMm,
      heightMm,
      dpi,
      coverage: out.coverage,
      bridges: out.bridges || 0,
      islands: out.islands || 0,
      quality: out.quality || 'hasznalhato',
      verdictText: out.verdictText || 'Éles, nyomtatható stencil-vonalrajz.',
      gpuMs,
      aiCostUsd: costUsd(gpuMs),
      runpodId: id,
      mode: out.mode || null,
      engine: out.engine || null
    });
  } catch (e) {
    return Response.json({ ok: true, ready: false, status: 'RETRY', note: String(e && e.message ? e.message : e) }, { status: 202 });
  }
}
