// INKFORGE — ENGINE HEALTH (v3)
// GET /api/stencil/health — MINDEN Runpod utvonalat kiprobal.

export async function GET() {
  const stencilUrl = process.env.RUNPOD_STENCIL_URL || null;
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

  async function probe(path, method, body) {
    const t0 = Date.now();
    try {
      const opts = { method: method, headers: { 'Authorization': 'Bearer ' + key }, signal: AbortSignal.timeout(12000) };
      if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
      const r = await fetch(base + path, opts);
      const txt = await r.text();
      return { path: path, method: method, status: r.status, ms: Date.now() - t0, body: txt.slice(0, 240) };
    } catch (e) {
      return { path: path, method: method, error: String(e && e.message ? e.message : e).slice(0, 150) };
    }
  }

  out.runpod.probes.push(await probe('/health', 'GET'));
  out.runpod.probes.push(await probe('/', 'GET'));
  out.runpod.probes.push(await probe('/runsync', 'POST', { input: {} }));
  out.runpod.probes.push(await probe('/run', 'POST', { input: {} }));
  out.runpod.probes.push(await probe('/v1/runsync', 'POST', { input: {} }));
  out.runpod.probes.push(await probe('/v1/run', 'POST', { input: {} }));

  out.runpod.working_paths = out.runpod.probes
    .filter(function (p) { return p.status && p.status !== 404 && p.status !== 403; })
    .map(function (p) { return p.method + ' ' + p.path + ' -> ' + p.status; });

  return Response.json(out);
}
