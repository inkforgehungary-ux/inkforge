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

    requirePublicKey();

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

    // 1) PROFESSIONÁLIS SZÖVEG -> KÉP
    // RunPod Z-Image Turbo public endpoint: $0.005/kép.
    const generated = await zImageTextToImage({
      prompt: built.prompt,
      negative: built.negative,
      size: '1024*1024'
    });

    // Prompt -> AI kép: ezt külön előnézetként adjuk vissza.
    if (mode === 'text_to_image') {
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
        gpuMs: 0,
        aiCostUsd: generated.cost,
        coverage: 0,
        bridges: 0,
        islands: 1,
        quality: 'ai_kep',
        verdictText: 'RunPod Z-Image Turbo AI kép elkészült.',
        prompt: built.prompt,
        embeddedText: built.embeddedText,
        promptLanguage: normalized.source,
        translatedPrompt: normalized.translated
      });
    }

    // 2) AI KÉP -> STENCIL
    // A Z-Image által készített képet továbbadjuk a saját, többfázisú stencil workernek.
    if (!runpodReady()) {
      return Response.json({
        ok: false,
        configured: false,
        generated_png_base64: generated.base64,
        generated_image_url: generated.url,
        engine: generated.engine,
        error: 'Az AI kép elkészült, de a stencil RunPod endpoint nincs beállítva. Állítsd be a RUNPOD_STENCIL_URL-t.'
      }, { status: 503 });
    }

    const start = await runpodRun({
      mode: 'image_to_stencil',
      image_base64: generated.base64,
      prompt: [
        'Convert this reference into a professional tattoo transfer stencil.',
        'preserve the exact subject and important anatomy',
        'extract only essential contour and structural lines',
        'very thin continuous single-weight black lines',
        'remove background and tonal shading',
        'remove grey gradients and texture',
        'remove duplicate parallel edges',
        'connect small broken contour gaps',
        'clean isolated noise',
        'white background, print-ready tattoo stencil'
      ].join(', '),
      negative: 'thick outlines, heavy black fill, grey wash, gradients, background, scenery, noise, duplicate lines, fuzzy edges, photorealism',
      max_side: 1024,
      target_width_mm: widthMm,
      target_height_mm: heightMm,
      steps: 24,
      guidance: 5.5,
      return_generated: true
    }, { text: true });

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
