// INKFORGE — TEXT -> RUNPOD AI KÉP -> RUNPOD STENCIL
// Nincs Wantera, Runware vagy más kép-provider: minden AI feldolgozás RunPodon fut.

import { runpodText, runpodRun, runpodStatus, extractRunpodOutput, extractRunpodBase64 } from '../../../../lib/runpod-client.js';
import { buildPromptFromDescription, styleTail } from '../../../../lib/prompt.js';
import { translatePromptToEnglish } from '../../../../lib/prompt-translate.js';
import { stencilInsertRow, stencilUpdateRow, creditEntry, CREDIT_COST, STATUS, costUsd } from '../../../../lib/save.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const maxDuration = 300;

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
      method: 'POST', headers: sbHeaders({ Prefer: 'return=representation' }), body: JSON.stringify(row)
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? j[0] : j;
  } catch (_) { return null; }
}
async function sbPatch(table, id, patch, extra) {
  if (!SUPABASE_URL || !SERVICE_KEY || !id) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id) + (extra || ''), {
      method: 'PATCH', headers: sbHeaders({ Prefer: 'return=representation' }), body: JSON.stringify(patch)
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? (j[0] || null) : j;
  } catch (_) { return null; }
}

export async function POST(req) {
  try {
    if (!process.env.RUNPOD_API_KEY) {
      return Response.json({ ok: false, error: 'A RUNPOD_API_KEY nincs beállítva.' }, { status: 503 });
    }
    if (!process.env.RUNPOD_TEXT_URL) {
      return Response.json({ ok: false, error: 'A RUNPOD_TEXT_URL nincs beállítva.' }, { status: 503 });
    }
    if (!process.env.RUNPOD_STENCIL_URL) {
      return Response.json({ ok: false, error: 'A RUNPOD_STENCIL_URL nincs beállítva.' }, { status: 503 });
    }

    const body = await req.json();
    const description = String(body.description || '').trim();
    if (description.length < 4) {
      return Response.json({ ok: false, error: 'Írd le, mit ábrázoljon.' }, { status: 400 });
    }

    const widthMm = Math.max(20, Math.min(700, parseFloat(body.width_mm || '100')));
    const heightMm = Math.max(20, Math.min(1000, parseFloat(body.height_mm || widthMm)));
    const dpi = [150, 300, 600].includes(parseInt(body.dpi || '300', 10)) ? parseInt(body.dpi || '300', 10) : 300;
    const bodyPart = body.body_part || null;
    const styleSlug = body.style_slug || 'linework';
    const title = String(body.title || description).slice(0, 80);
    const mode = body.mode === 'text_to_image' ? 'text_to_image' : 'text_to_stencil';

    const normalized = await translatePromptToEnglish(description);
    const built = buildPromptFromDescription(normalized.text, { bodyPart, styleTail: styleTail(styleSlug) });

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

    const ratio = widthMm / Math.max(1, heightMm);
    const size = ratio >= 1.6 ? 1024 : ratio <= 0.7 ? 1024 : 1024;
    const generated = await runpodText({
      mode: 'text_to_image',
      prompt: built.prompt,
      width: size,
      steps: Number(process.env.RUNPOD_TEXT_STEPS || 22),
      guidance: Number(process.env.RUNPOD_TEXT_GUIDANCE || 5.5),
      timeoutMs: 290000
    });

    const generatedB64 = generated.pngBase64 || generated.imageBase64;
    if (!generatedB64) throw new Error('A RunPod text worker nem adott vissza képet.');

    if (mode === 'text_to_image') {
      if (stencilId) await sbPatch('stencils', stencilId, {
        status: STATUS.ready,
        branchUsed: 'runpod-text',
        coverage: 0,
        gpuMs: Number(generated.ms || 0),
        error: null
      });
      return Response.json({
        ok: true, ready: true, failed: false,
        png_base64: generatedB64,
        generated_png_base64: generatedB64,
        width: 1024, height: 1024,
        widthMm, heightMm, dpi, mode,
        engine: 'InkForge RunPod text worker',
        provider: 'RunPod',
        gpuMs: Number(generated.ms || 0),
        aiCostUsd: costUsd(Number(generated.ms || 0)),
        coverage: 0, bridges: 0, islands: 1,
        quality: 'ai_kep',
        verdictText: 'RunPod AI kép elkészült.',
        prompt: built.prompt,
        embeddedText: built.embeddedText,
        promptLanguage: normalized.source,
        translatedPrompt: normalized.translated,
        stencilId
      });
    }

    // Második RunPod lépés: a generált képet ugyanazon RunPod stencil worker dolgozza fel.
    const start = await runpodRun({
      mode: 'image_to_stencil',
      image_base64: generatedB64,
      prompt: [
        'professional tattoo transfer stencil',
        'preserve the exact generated subject and anatomy',
        'clean continuous black linework',
        'remove background, shading, gradients and texture',
        'print-ready stencil on white background'
      ].join(', '),
      max_side: Number(process.env.RUNPOD_STENCIL_MAX_SIDE || 2048),
      steps: Number(process.env.RUNPOD_STENCIL_STEPS || 25),
      guidance: Number(process.env.RUNPOD_STENCIL_GUIDANCE || 5.5),
      return_generated: false
    }, { text: false, timeoutMs: 30000 });

    if (stencilId) await sbPatch('stencils', stencilId, {
      status: STATUS.processing,
      branchUsed: 'runpod-text-to-stencil',
      gpuMs: Number(generated.ms || 0),
      error: null
    });

    return Response.json({
      ok: true,
      ready: false,
      failed: false,
      runpodId: start.id,
      runpodStatus: start.status || 'IN_QUEUE',
      generated_png_base64: generatedB64,
      stencilId,
      studioId: body.studio_id || null,
      userId: body.user_id || null,
      widthMm, heightMm, dpi, title, mode,
      prompt: built.prompt,
      embeddedText: built.embeddedText,
      promptLanguage: normalized.source,
      translatedPrompt: normalized.translated
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
    const st = await runpodStatus(id, { text: false, timeoutMs: 20000 });
    const status = String(st.status || '').toUpperCase();
    const failed = ['FAILED', 'ERROR', 'CANCELLED', 'TIMED_OUT'].includes(status);
    if (!['COMPLETED', 'SUCCESS'].includes(status) && !failed) {
      return Response.json({ ok: true, ready: false, status, runpodId: id });
    }

    const out = extractRunpodOutput(st) || {};
    if (failed) {
      const msg = out.error || out.message || st.error || 'A RunPod stencil worker sikertelen.';
      if (stencilId) await sbPatch('stencils', stencilId, stencilUpdateRow({ status: STATUS.failed, error: msg }), '&status=eq.' + encodeURIComponent(STATUS.processing));
      return Response.json({ ok: true, ready: true, failed: true, error: String(msg), status });
    }

    const b64 = extractRunpodBase64(st);
    if (!b64) return Response.json({ ok: true, ready: true, failed: true, error: 'A RunPod worker kész, de nem adott vissza képet.' });

    const width = Number(out.width || 768);
    const height = Number(out.height || 768);
    const heightMm = Number.isFinite(requestedHeightMm) && requestedHeightMm > 0
      ? Math.round(requestedHeightMm * 100) / 100
      : Math.round(widthMm * height / Math.max(1, width) * 100) / 100;
    const gpuMs = Number(out.gpu_ms || out.executionTime || 0);

    let transitioned = null;
    if (stencilId) transitioned = await sbPatch('stencils', stencilId, stencilUpdateRow({
      status: STATUS.ready,
      branchUsed: 'runpod-text-to-stencil',
      coverage: out.coverage,
      heightMm,
      gpuMs,
      error: null
    }), '&status=eq.' + encodeURIComponent(STATUS.processing));

    if (transitioned && studioId) {
      await sbInsert('credit_ledger', creditEntry(studioId, 'stencil_runpod_text_to_stencil', CREDIT_COST.generate_hd));
    }

    return Response.json({
      ok: true, ready: true, failed: false,
      png_base64: b64,
      generated_png_base64: out.generated_png_base64 || null,
      width, height, widthMm, heightMm, dpi,
      coverage: out.coverage,
      bridges: out.bridges || 0,
      islands: out.islands || 0,
      quality: out.quality || 'hasznalhato',
      verdictText: out.verdictText || 'RunPod stencil elkészült.',
      gpuMs,
      aiCostUsd: costUsd(gpuMs),
      runpodId: id,
      mode: out.mode || 'image_to_stencil',
      engine: out.engine || 'InkForge RunPod stencil worker'
    });
  } catch (e) {
    return Response.json({ ok: true, ready: false, status: 'RETRY', note: String(e && e.message ? e.message : e) }, { status: 202 });
  }
}
