// INKFORGE — KÉP -> VONALAS RAJZ
// POST /api/convert-to-drawing -> RunPod image_to_image
// GET  /api/convert-to-drawing?id=... -> RunPod status + generated PNG

import { runpodReady, runpodRun, runpodStatus, extractRunpodOutput } from '../../../../lib/runpod-client.js';

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

const DRAWING_PROMPT =
  'convert the source image into a clean tattoo line drawing, ' +
  'very thin uniform black lines, simple elegant contour line art, ' +
  'preserve the main subject and recognizable shape, minimal interior lines, ' +
  'white background, isolated subject, no shading, no grey, no color, ' +
  'no black fills, no thick outlines, no background, no texture, no sketch scribbles, ' +
  'single subject, clean printable line drawing';

const DRAWING_NEGATIVE =
  'photo, photorealistic, shading, grey, grayscale, gradients, color, ' +
  'black fill, thick lines, heavy outlines, background, scenery, multiple subjects, ' +
  'collage, frame, border, texture, noise, blur, sketch scribbles, watermark, text';

export async function POST(req) {
  try {
    if (!runpodReady()) {
      return Response.json({
        ok: false,
        error: 'A RunPod GPU motor nincs beállítva.'
      }, { status: 503 });
    }

    const ct = req.headers.get('content-type') || '';
    let imageB64 = null;
    let prompt = DRAWING_PROMPT;

    if (ct.includes('application/json')) {
      const body = await req.json();
      imageB64 = body.image_base64 || null;
      if (body.prompt) prompt = String(body.prompt);
    } else {
      const form = await req.formData();
      const f = form.get('image');
      if (f && typeof f !== 'string') {
        imageB64 = toBase64(new Uint8Array(await f.arrayBuffer()));
      }
      if (form.get('prompt')) {
        prompt = String(form.get('prompt'));
      }
    }

    if (!imageB64) {
      return Response.json({ ok: false, error: 'Hiányzik a feltöltött kép.' }, { status: 400 });
    }

    const start = await runpodRun({
      mode: 'image_to_image',
      image_base64: imageB64,
      prompt,
      negative: DRAWING_NEGATIVE,
      max_side: 1024,
      steps: 28,
      guidance: 5.8,
      strength: 0.55,
      return_generated: true
    });

    return Response.json({
      ok: true,
      runpodId: start.id,
      runpodStatus: start.status || 'IN_QUEUE'
    });
  } catch (e) {
    return Response.json({
      ok: false,
      error: String(e && e.message ? e.message : e)
    }, { status: 500 });
  }
}

export async function GET(req) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) {
    return Response.json({ ok: false, error: 'Hiányzó RunPod id.' }, { status: 400 });
  }

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

    if (!out.generated_png_base64) {
      return Response.json({
        ok: true, ready: true, failed: true,
        error: 'A RunPod worker nem adott vissza generált képet.'
      });
    }

    return Response.json({
      ok: true,
      ready: true,
      failed: false,
      image_base64: out.generated_png_base64,
      width: out.width || null,
      height: out.height || null,
      gpuMs: Number(out.gpu_ms || out.executionTime || 0),
      engine: out.engine || 'InkForge RunPod'
    });
  } catch (e) {
    return Response.json({ ok: true, ready: false, status: 'RETRY' }, { status: 202 });
  }
}
