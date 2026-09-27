// INKFORGE — ENGINE HEALTH (diagnosztika)
// GET /api/stencil/health — reszletes allapot, hogy latszik-e, hol akad el

export async function GET() {
  const stencilUrl = process.env.RUNPOD_STENCIL_URL || null;
  const textUrl = process.env.RUNPOD_TEXT_URL || process.env.RUNPOD_STENCIL_URL || null;
  const key = process.env.RUNPOD_API_KEY || '';
  const hasKey = !!key;
  const sbUrl = process.env.SUPABASE_URL || null;
  const sbKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const out = {
    ok: true,
    engine: '2.2.0',
    runpod: {
      configured: !!(stencilUrl && hasKey),
      stencil_url: stencilUrl,
      text_url: textUrl,
      has_api_key: hasKey,
      key_prefix: key ? key.slice(0, 6) + '...' : null,
      checks: {}
    },
    supabase: {
      configured: !!(sbUrl && sbKey),
      url: sbUrl,
      has_service_key: sbKey
    },
    mode: (stencilUrl && hasKey) ? 'runpod' : 'browser'
  };

  if (!stencilUrl || !hasKey) return Response.json(out);

  const base = stencilUrl.replace(/\/+$/, '');
  const H = { 'Authorization': 'Bearer ' + key };

  try {
    const r = await fetch(base + '/health', { headers: H, signal: AbortSignal.timeout(10000) });
    const t = await r.text();
    out.runpod.checks.health = { status: r.status, ok: r.ok, body: t.slice(0, 300) };
  } catch (e) {
    out.runpod.checks.health = { ok: false, error: String(e && e.message ? e.message : e) };
  }

  try {
    const r = await fetch(base + '/runsync', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, H),
      body: JSON.stringify({ input: {} }),
      signal: AbortSignal.timeout(15000)
    });
    const t = await r.text();
    out.runpod.checks.runsync = { status: r.status, ok: r.ok, body: t.slice(0, 400) };
  } catch (e) {
    out.runpod.checks.runsync = { ok: false, error: String(e && e.message ? e.message : e) };
  }

  return Response.json(out);
}
