// INKFORGE — ENGINE HEALTH (v4)
// Egyetlen olcso health-check: /health. Nem inditunk /run vagy /runsync tesztjobot.

export async function GET() {
  const stencilUrl = process.env.RUNPOD_STENCIL_URL || process.env.RUNPOD_TEXT_URL || null;
  const textUrl = process.env.RUNPOD_TEXT_URL || process.env.RUNPOD_STENCIL_URL || null;
  const key = process.env.RUNPOD_API_KEY || '';
  const hasKey = !!key;
  const sbUrl = process.env.SUPABASE_URL || null;
  const sbKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const out = {
    ok: true,
    engine: '2.3.0',
    runpod: {
      configured: !!(stencilUrl && hasKey),
      stencil_url: stencilUrl,
      text_url: textUrl,
      has_api_key: hasKey,
      key_prefix: key ? key.slice(0, 6) + '...' : null,
      probes: []
    },
    supabase: { configured: !!(sbUrl && sbKey), url: sbUrl, has_service_key: sbKey },
    mode: (stencilUrl && hasKey) ? 'runpod' : 'browser'
  };

  if (!stencilUrl || !hasKey) return Response.json(out);

  const base = stencilUrl.replace(/\/+$/, '');
  const t0 = Date.now();
  try {
    const r = await fetch(base + '/health', {
      headers: { 'Authorization': 'Bearer ' + key },
      signal: AbortSignal.timeout(8000)
    });
    const body = await r.text();
    out.runpod.health = {
      status: r.status,
      ok: r.ok,
      ms: Date.now() - t0,
      body: body.slice(0, 500)
    };
  } catch (e) {
    out.runpod.health = {
      ok: false,
      ms: Date.now() - t0,
      error: String(e && e.message ? e.message : e).slice(0, 200)
    };
  }

  return Response.json(out);
}
