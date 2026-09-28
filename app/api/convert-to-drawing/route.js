// INKFORGE — KÉP -> VONALAS RAJZ
// POST /api/convert-to-drawing -> RunPod image_to_drawing
// GET  /api/convert-to-drawing?id=... -> RunPod status + generated PNG

import { runpodReady, runpodRun, runpodStatus, extractRunpodOutput } from '../../../lib/runpod-client.js';

const ALLOWED_STYLES = new Set(['line', 'stencil', 'hatching', 'bold', 'soft', 'silhouette']);

function toBase64(bytes) { return Buffer.from(bytes).toString('base64'); }

function normalizeStyle(value) {
  const style = String(value || 'line').trim().toLowerCase();
  return ALLOWED_STYLES.has(style) ? style : 'line';
}

const DRAWING_PROMPT =
  'convert the source image into clean professional tattoo artwork, ' +
  'preserve the main subject and recognizable shape, isolated on white, ' +
  'crisp controlled black ink lines, no photo background, no text, no watermark';

const DRAWING_NEGATIVE =
  'photorealistic, photograph, grey shading, gradients, color, background, scenery, ' +
  'multiple subjects, collage, frame, border, texture, noise, blur, thick random lines, watermark, text';

export async function POST(req) {
  try {
    if (!runpodReady()) {
      return Response.json({ ok: false, error: 'A RunPod GPU motor nincs beállítva.' }, { status: 503 });
    }

    const ct = req.headers.get('content-type') || '';
    let imageB64 = null;
    let prompt = DRAWING_PROMPT;
    let style = 'line';
    let outputMaxSide = 2048;

    if (ct.includes('application/json')) {
      const body = await req.json();
      imageB64 = body.image_base64 || body.imageBase64 || null;
      if (body.prompt) prompt = String(body.prompt);
      style = normalizeStyle(body.style);
      outputMaxSide = Number(body.output_max_side || body.outputMaxSide || 2048);
    } else {
      const form = await req.formData();
      const f = form.get('image');
      if (f && typeof f !== 'string') imageB64 = toBase64(new Uint8Array(await f.arrayBuffer()));
      if (form.get('prompt')) prompt = String(form.get('prompt'));
      style = normalizeStyle(form.get('style'));
      outputMaxSide = Number(form.get('output_max_side') || 2048);
    }

    if (!imageB64) {
      return Response.json({ ok: false, error: 'Hiányzik a feltöltött kép.' }, { status: 400 });
    }

    outputMaxSide = Math.max(512, Math.min(4096, Math.round(outputMaxSide)));

    const start = await runpodRun({
      mode: 'image_to_drawing',
      image_base64: imageB64,
      prompt,
      style,
      negative: DRAWING_NEGATIVE,
      max_side: 1024,
      output_max_side: outputMaxSide,
      steps: 1,
      guidance: 1,
      return_generated: true
    });

    return Response.json({ ok: true, runpodId: start.id, runpodStatus: start.status || 'IN_QUEUE', style, outputMaxSide });
  } catch (e) {
    return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 500 });
  }
}

export async function GET(req) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return Response.json({ ok: false, error: 'Hiányzó RunPod id.' }, { status: 400 });

  try {
    const st = await runpodStatus(id, { text: true });
    const status = String(st.status || '').toUpperCase();
    const failed = ['FAILED', 'ERROR', 'CANCELLED', 'TIMED_OUT'].includes(status);

    if (!['COMPLETED', 'SUCCESS'].includes(status) && !failed) {
      return Response.json({ ok: true, ready: false, status });
    }

    const out = extractRunpodOutput(st) || {};
    if (failed) {
      return Response.json({
        ok: true, ready: true, failed: true,
        error: String(out.error || out.message || st.error || 'A rajz generálása sikertelen.')
      });
    }

    const image = out.generated_png_base64 || out.png_base64 || out.stencil_png_base64;
    if (!image) {
      return Response.json({ ok: true, ready: true, failed: true, error: 'A RunPod worker nem adott vissza generált képet.' });
    }

    return Response.json({
      ok: true, ready: true, failed: false,
      image_base64: image,
      generated_png_base64: image,
      width: out.width || null,
      height: out.height || null,
      gpuMs: Number(out.gpu_ms || out.executionTime || 0),
      engine: out.engine || 'InkForge RunPod',
      style: out.style || 'line',
      model: out.model || 'DexiNed + HED',
      coverage: Number(out.coverage || 0),
      islands: Number(out.islands || 0),
      quality: out.quality || null,
      verdictText: out.verdictText || null
    });
  } catch (e) {
    return Response.json({ ok: true, ready: false, status: 'RETRY' }, { status: 202 });
  }
}
