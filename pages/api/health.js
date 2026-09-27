// InkForge – a Supabase kapcsolat ellenorzese
// Vercel vegpont: /api/health

export default function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  res.status(200).json({
    supabase_url: url ? 'beallitva (' + url.slice(0, 32) + '...)' : 'HIANYZIK',
    supabase_key: key ? 'beallitva (' + key.slice(0, 12) + '...)' : 'HIANYZIK',
    configured: Boolean(url && key),
    node: process.version,
  });
}
