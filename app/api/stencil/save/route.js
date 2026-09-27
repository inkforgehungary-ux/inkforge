// INKFORGE — STENCIL MENTES
// Utvonal: app/api/stencil/save/route.js -> ../../../../lib/

export async function POST(req) {
  try {
    const body = await req.json();
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return Response.json({
        ok: false, configured: false,
        error: 'A mentes meg nincs bekapcsolva. Add meg a SUPABASE_URL es a SUPABASE_SERVICE_ROLE_KEY kornyezeti valtozot a Vercelen.'
      }, { status: 503 });
    }
    return Response.json({ ok: true, saved: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 500 });
  }
}
