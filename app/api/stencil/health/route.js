// INKFORGE — ENGINE HEALTH
// Utvonal: app/api/stencil/health/route.js -> ../../../../lib/
// GET /api/stencil/health — melyik motor el?

export async function GET() {
  const stencilUrl = process.env.RUNPOD_STENCIL_URL || null;
  const textUrl = process.env.RUNPOD_TEXT_URL || process.env.RUNPOD_STENCIL_URL || null;
  const hasKey = !!process.env.RUNPOD_API_KEY;
  const sbUrl = process.env.SUPABASE_URL || null;
  const sbKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  let runpod = null;
  if (stencilUrl && hasKey) {
    try {
      const r = await fetch(stencilUrl.replace(/\/+$/, '') + '/health', {
        headers: { 'Authorization': 'Bearer ' + process.env.RUNPOD_API_KEY },
        signal: AbortSignal.timeout(8000)
      });
      runpod = await r.json().catch(function () { return { ok: false, error: 'JSON hiba' }; });
    } catch (e) {
      runpod = { ok: false, error: String(e && e.message ? e.message : e) };
    }
  }

  return Response.json({
    ok: true,
    engine: '2.1.0',
    runpod: {
      configured: !!(stencilUrl && hasKey),
      stencil_url: stencilUrl,
      text_url: textUrl,
      has_api_key: hasKey,
      live: runpod
    },
    supabase: {
      configured: !!(sbUrl && sbKey),
      url: sbUrl,
      has_service_key: sbKey
    },
    mode: (stencilUrl && hasKey) ? 'runpod' : 'browser'
  });
}
