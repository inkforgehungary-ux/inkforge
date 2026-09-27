// INKFORGE — API: STENCIL MENTES
// A PDF es a PNG a bongeszoben keszul; itt csak taroljuk.
// Amig nincs Supabase kulcs, tisztan jelzi, nem hasal el.

export async function POST(req) {
  try {
    const body = await req.json();
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return Response.json({
        ok: false,
        configured: false,
        error: 'A mentes meg nincs bekapcsolva. Add meg a SUPABASE_URL es a SUPABASE_SERVICE_ROLE_KEY kornyezeti valtozot a Vercelen.'
      }, { status: 503 });
    }

    const { userId, studioId, name, widthMm, heightMm, dpi, report, layerCount, pdfBase64, pngBase64, thumbBase64, isPublic } = body || {};
    if (!name || !widthMm || !pngBase64) {
      return Response.json({ ok: false, error: 'Hianyzo adat: nev, meret vagy PNG.' }, { status: 400 });
    }

    const base = String(name).replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase() || 'stencil';
    const slug = base + '-' + widthMm + 'mm-' + dpi + 'dpi';
    const dir = (userId || 'anon') + '/' + slug;

    async function put(path, bytes, ct) {
      const r = await fetch(SUPABASE_URL + '/storage/v1/object/stencils/' + path, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Type': ct, 'x-upsert': 'true' },
        body: bytes
      });
      if (!r.ok) throw new Error('Storage ' + path + ': ' + r.status + ' ' + (await r.text()));
      return path;
    }

    const pngPath = await put(dir + '/' + slug + '-atlatszo.png', Buffer.from(pngBase64, 'base64'), 'image/png');
    let pdfPath = null;
    if (pdfBase64) pdfPath = await put(dir + '/' + slug + '-nyomtatasi-lap.pdf', Buffer.from(pdfBase64, 'base64'), 'application/pdf');
    let thumbPath = null;
    if (thumbBase64) thumbPath = await put(dir + '/' + slug + '-elonezet.png', Buffer.from(thumbBase64, 'base64'), 'image/png');

    const row = {
      owner_id: userId || null, studio_id: studioId || null,
      name: name, slug: slug,
      width_mm: widthMm, height_mm: heightMm, dpi: dpi || 300,
      engine_branch: (report && report.branchUsed) || 'auto',
      coverage_pct: report ? report.coverage : null,
      bridges: report ? report.bridges : null,
      islands: report ? report.islands : null,
      quality: report ? report.quality : null,
      layer_count: layerCount || 1,
      pdf_path: pdfPath, png_path: pngPath, thumb_path: thumbPath,
      report: report || null, is_public: !!isPublic
    };

    const ins = await fetch(SUPABASE_URL + '/rest/v1/stencils', {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(row)
    });
    if (!ins.ok) {
      return Response.json({ ok: false, error: 'Adatbazis: ' + (await ins.text()) }, { status: 500 });
    }
    const saved = await ins.json();
    return Response.json({ ok: true, stencil: saved[0] });
  } catch (e) {
    return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 500 });
  }
}
