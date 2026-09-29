// INKFORGE — ENGINE HEALTH
// Public RunPod models need only RUNPOD_API_KEY.
// The custom stencil worker additionally needs RUNPOD_STENCIL_URL.

export async function GET() {
  const stencilUrl = process.env.RUNPOD_STENCIL_URL || null;
  const textUrl = process.env.RUNPOD_TEXT_URL || null;
  const key = process.env.RUNPOD_API_KEY || '';

  const out = {
    ok: true,
    engine: '4.0.0',
    worker_contract: 'runpod-public-plus-serverless-stencil',
    runpod: {
      api_key_configured: !!key,
      public_models_configured: !!key,
      stencil_worker_configured: !!(stencilUrl && key),
      text_worker_configured: !!(textUrl && key),
      public_models: {
        z_image_turbo: !!key,
        flux_kontext_dev: !!key
      },
      health: null
    },
    mode: key ? 'runpod-public' : 'unconfigured'
  };

  if (!stencilUrl || !key) return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });

  const base = stencilUrl.replace(/\/+$/, '');
  const t0 = Date.now();
  try {
    const r = await fetch(base + '/health', {
      headers: { Authorization: 'Bearer ' + key },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store'
    });
    out.runpod.health = { ok: r.ok, status: r.status, ms: Date.now() - t0 };
  } catch (_) {
    out.runpod.health = { ok: false, status: 0, ms: Date.now() - t0, error: 'RunPod stencil worker health nem elerheto.' };
  }

  return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
