// INKFORGE — RUNPOD ENGINE HEALTH
// A stencil motor kizárólag RunPodot használ.

export async function GET() {
  const stencilUrl = process.env.RUNPOD_STENCIL_URL || null;
  const textUrl = process.env.RUNPOD_TEXT_URL || null;
  const key = process.env.RUNPOD_API_KEY || '';

  const out = {
    ok: true,
    engine: 'RunPod-only',
    worker_contract: 'runpod-serverless',
    runpod: {
      api_key_configured: !!key,
      stencil_worker_configured: !!(stencilUrl && key),
      text_worker_configured: !!(textUrl && key),
      health: null
    }
  };

  if (!key || !stencilUrl) {
    return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
  }

  const base = stencilUrl.replace(/\/+$/, '');
  const t0 = Date.now();

  try {
    const r = await fetch(base + '/health', {
      headers: { Authorization: 'Bearer ' + key },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store'
    });
    const body = await r.text();

    out.runpod.health = {
      ok: r.ok,
      status: r.status,
      ms: Date.now() - t0,
      body: body ? body.slice(0, 500) : null
    };
  } catch (e) {
    out.runpod.health = {
      ok: false,
      status: 0,
      ms: Date.now() - t0,
      error: String(e && e.message ? e.message : e)
    };
  }

  return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
