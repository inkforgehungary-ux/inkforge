// INKFORGE — TEXT -> AI KÉP -> STENCIL
// POST /api/stencil/from-text
// text_to_image: RunPod Z-Image Turbo public endpoint
// text_to_stencil: Z-Image Turbo -> RunPod stencil worker
// GET: csak a saját stencil workeres text_to_stencil régi jobok státuszához.

import { runpodReady, runpodRun, runpodStatus, extractRunpodOutput, extractRunpodBase64 } from '../../../../lib/runpod-client.js';
import { zImageTextToImage } from '../../../../lib/runpod-public.js';
import { buildPromptFromDescription, styleTail } from '../../../../lib/prompt.js';
import { translatePromptToEnglish } from '../../../../lib/prompt-translate.js';
import { stencilInsertRow, stencilUpdateRow, creditEntry, CREDIT_COST, STATUS, costUsd } from '../../../../lib/save.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WANTERA_IMAGE_URL = (process.env.INKFORGE_IMAGE_FUNCTION_URL || 'https://mxrgdcvmxzhocbdhtlhg.supabase.co/functions/v1/inkforge-image').replace(/\/$/, '');
export const maxDuration = 300;

async function imageUrlToBase64(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(60000), cache: 'no-store' });
  if (!r.ok) throw new Error('A Wantera AI kép nem tölthető le (HTTP ' + r.status + ').');
  const buf = Buffer.from(await r.arrayBuffer());
  if (!buf.length) throw new Error('A Wantera AI üres képet adott vissza.');
  return buf.toString('base64');
}

function aspectRatioFor(w, h) {
  const ratio = w / Math.max(1, h);
  const choices = [['1:1',1],['4:3',4/3],['3:4',3/4],['16:9',16/9],['9:16',9/16],['3:2',3/2],['2:3',2/3],['4:5',4/5]];
  return choices.reduce((best, item) => Math.abs(item[1] - ratio) < Math.abs(best[1] - ratio) ? item : best)[0];
}

async function callWanteraImage(payload, req) {
  const headers = { 'Content-Type': 'application/json' };
  const auth = req.headers.get('authorization');
  if (auth) headers.Authorization = auth;
  const r = await fetch(WANTERA_IMAGE_URL, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(240000), cache: 'no-store' });
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

function requirePublicKey() {
  if (!process.env.RUNPOD_API_KEY) throw new Error('A RUNPOD_API_KEY nincs beállítva.');
}

export async function POST(req) {
  try {
    const body = await req.json();
    const description = String(body.description || '').trim();
    if (description.length < 4) {
      return Response.json({ ok: false, error: 'Írd le, mit ábrázoljon.' }, { status: 400 });
    }


    const widthMm = Math.max(20, Math.min(700, parseFloat(body.width_mm || '100')));
    const heightMm = Math.max(20, Math.min(1000, parseFloat(body.height_mm || widthMm)));
    const dpi = [150, 300, 600].includes(parseInt(body.dpi || '300', 10))
      ? parseInt(body.dpi || '300', 10) : 300;
    const bodyPart = body.body_part || null;
    const styleSlug = body.style_slug || 'linework';
    const title = String(body.title || description).slice(0, 80);
    const mode = body.mode === 'text_to_image' ? 'text_to_image' : 'text_to_stencil';

    const normalized = await translatePromptToEnglish(description);
    const built = buildPromptFromDescription(normalized.text, {
      bodyPart,
      styleTail: styleTail(styleSlug)
    });

    const created = await sbInsert('stencils', stencilInsertRow({
      userId: body.user_id || null,
      studioId: body.studio_id || null,
      title,
      sourceType: 'ai',
      sourcePrompt: built.prompt,
      widthMm,
      heightMm,
      dpi
    }));
    const stencilId = created ? created.id : null;

    // Wantera projekt meglévő professzionális AI lánca.
    // text_to_image: RunPod Qwen Image.
    // text_to_stencil: RunPod Qwen Image -> Runware Lineart.
    const aspectRatio = aspectRatioFor(widthMm, heightMm);
    const generated = await callWanteraImage(
      mode === 'text_to_image'
        ? { mode: 'generate', prompt: built.prompt, aspectRatio }
        : { mode: 'linetrace', prompt: built.prompt, aspectRatio },
      req
    );
    const finalBase64 = await imageUrlToBase64(generated.url);

    if (stencilId) await sbPatch('stencils', stencilId, {
      status: STATUS.ready,
      branchUsed: generated.model || (mode === 'text_to_image' ? 'Wantera RunPod Qwen' : 'Wantera RunPod Qwen + Runware Lineart'),
      coverage: 0,
      heightMm,
      gpuMs: 0,
      error: null
    });

    return Response.json({
      ok: true,
      ready: true,
      failed: false,
      png_base64: finalBase64,
      generated_png_base64: mode === 'text_to_image' ? finalBase64 : null,
      generated_image_url: mode === 'text_to_image' ? generated.url : null,
      width: Number(generated.width || 1024),
      height: Number(generated.height || 1024),
      widthMm, heightMm, dpi, mode,
      engine: generated.model || 'Wantera InkForge AI',
      provider: generated.provider || 'Wantera / RunPod',
      gpuMs: 0,
      aiCostUsd: Number(generated.providerCostUsd || 0),
      coverage: 0, bridges: 0, islands: 1,
      quality: mode === 'text_to_stencil' ? 'ai_lineart' : 'ai_kep',
      verdictText: mode === 'text_to_stencil'
        ? 'RunPod Qwen Image + Runware Lineart professzionális tetováló vonalrajz elkészült.'
        : 'RunPod Qwen Image AI kép elkészült.',
      prompt: built.prompt,
      embeddedText: built.embeddedText,
      promptLanguage: normalized.source,
      translatedPrompt: normalized.translated,
      stencilId
    });

    if (stencilId) await sbPatch('stencils', stencilId, { status: STATUS.processing });

    return Response.json({
      ok: true,
      runpodId: start.id,
      runpodStatus: start.status || 'IN_QUEUE',
      stencilId,
      studioId: body.studio_id || null,
      userId: body.user_id || null,
      widthMm,
      heightMm,
      dpi,
      title,
      mode,
      generated_png_base64: generated.base64,
      generated_image_url: generated.url,
      generated_engine: generated.engine,
      prompt: built.prompt,
      embeddedText: built.embeddedText,
      style: styleSlug,
      promptLanguage: normalized.source,
      translatedPrompt: normalized.translated
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
    const st = await runpodStatus(id, { text: true });
    const status = String(st.status || '').toUpperCase();
    const failed = ['FAILED', 'ERROR', 'CANCELLED', 'TIMED_OUT'].includes(status);

    if (!['COMPLETED', 'SUCCESS'].includes(status) && !failed) {
      return Response.json({ ok: true, ready: false, status, runpodId: id });
    }

    const out = extractRunpodOutput(st) || {};
    if (failed) {
      const msg = out.error || out.message || st.error || 'A RunPod feladat sikertelen.';
      if (stencilId) await sbPatch(
        'stencils', stencilId,
        stencilUpdateRow({ status: STATUS.failed, error: msg }),
        '&status=eq.' + encodeURIComponent(STATUS.processing)
      );
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
        branchUsed: 'z-image-to-runpod-stencil',
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
        'stencil_text_to_stencil',
        CREDIT_COST.generate_hd
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
      mode: out.mode || 'image_to_stencil',
      engine: out.engine || 'InkForge RunPod stencil worker',
      prompt: out.prompt || null
    });
  } catch (e) {
    return Response.json({ ok: true, ready: false, status: 'RETRY', note: String(e && e.message ? e.message : e) }, { status: 202 });
  }
}
