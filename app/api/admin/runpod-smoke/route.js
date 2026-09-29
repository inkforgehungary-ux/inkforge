// Temporary protected RunPod SDXL Turbo smoke-test route.
// Remove this route after validation.

const ENDPOINT = process.env.RUNPOD_TEXT_URL || 'https://api.runpod.ai/v2/na66iyruhqs0wi';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function authorized(req) {
  const token = req.headers.get('x-admin-token') || '';
  return !!ADMIN_TOKEN && token === ADMIN_TOKEN;
}

function headers() {
  return {
    'Authorization': 'Bearer ' + process.env.RUNPOD_API_KEY,
    'Content-Type': 'application/json'
  };
}

function publicError(status, message) {
  return Response.json({ ok: false, status, error: message }, { status });
}

export async function POST(req) {
  if (!authorized(req)) return publicError(401, 'Unauthorized.');
  if (!process.env.RUNPOD_API_KEY) return publicError(503, 'RUNPOD_API_KEY nincs beállítva.');

  const input = {
    prompt: 'professional black and grey tattoo design of a fierce raven, clean composition, highly detailed, tattoo flash style',
    negative_prompt: 'blurry, low quality, distorted anatomy, text, watermark',
    width: 512,
    height: 512,
    num_inference_steps: 1,
    guidance_scale: 0,
    seed: null,
    num_images: 1
  };

  try {
    const res = await fetch(ENDPOINT.replace(/\\/+$/, '') + '/run', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ input }),
      signal: AbortSignal.timeout(30000)
    });

    const text = await res.text();
    let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch (_) {
      body = { raw: text.slice(0, 4000) };
    }

    return Response.json({
      ok: res.ok,
      endpoint: ENDPOINT.replace(/\\/+$/, ''),
      httpStatus: res.status,
      response: body
    }, { status: res.ok ? 200 : res.status });
  } catch (e) {
    return publicError(502, String(e && e.message ? e.message : e));
  }
}

export async function GET(req) {
  if (!authorized(req)) return publicError(401, 'Unauthorized.');
  if (!process.env.RUNPOD_API_KEY) return publicError(503, 'RUNPOD_API_KEY nincs beállítva.');

  const id = new URL(req.url).searchParams.get('id');
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    return publicError(400, 'Hiányzó vagy érvénytelen RunPod request id.');
  }

  try {
    const res = await fetch(
      ENDPOINT.replace(/\\/+$/, '') + '/status/' + encodeURIComponent(id),
      {
        headers: { 'Authorization': 'Bearer ' + process.env.RUNPOD_API_KEY },
        signal: AbortSignal.timeout(20000)
      }
    );

    const text = await res.text();
    let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch (_) {
      body = { raw: text.slice(0, 12000) };
    }

    return Response.json({
      ok: res.ok,
      endpoint: ENDPOINT.replace(/\\/+$/, ''),
      requestId: id,
      httpStatus: res.status,
      response: body
    }, { status: res.ok ? 200 : res.status });
  } catch (e) {
    return publicError(502, String(e && e.message ? e.message : e));
  }
}
