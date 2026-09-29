// INKFORGE — ENGINE HEALTH (v5)
// Public health endpoint: configuration presence + upstream health only.
// Never exposes URLs, key prefixes, Supabase service-key state, or upstream response bodies.

export async function GET() {
  const stencilUrl = process.env.RUNPOD_STENCIL_URL || null;
  const textUrl = process.env.RUNPOD_TEXT_URL || null;
  const key = process.env.RUNPOD_API_KEY || '';

  const out = {
    ok: true,
    engine: '3.4.2',
    worker_contract: 'runpod-serverless',
    runpod: {
      configured: !!(stencilUrl && key),
      text_configured: !!(textUrl && key),
      health: null
    },
    mode: (stencilUrl && key) ? 'runpod' : 'unconfigured'
  };

  if (!stencilUrl || !key) return Response.json(out);

  const base = stencilUrl.replace(/\/+$/, '');
  const t0 = Date.now();
  try {
    const r = await fetch(base + '/health', {
      headers: { Authorization: 'Bearer ' + key },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store'
    });
    out.runpod.health = {
      ok: r.ok,
      status: r.status,
      ms: Date.now() - t0
    };
  } catch (e) {
    out.runpod.health = {
      ok: false,
      status: 0,
      ms: Date.now() - t0,
      error: 'RunPod health nem elerheto.'
    };
  }

  return Response.json(out, {
    headers: { 'Cache-Control': 'no-store' }
  });
}
