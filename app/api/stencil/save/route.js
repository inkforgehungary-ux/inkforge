// INKFORGE — API: STENCIL MENTES
// Node runtime. A PDF/PNG a bongeszoben keszul, itt csak tarolunk.

import { buildNames, storagePaths, BUCKET } from '../../../lib/save.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, init) {
  const opts = init || {};
  opts.headers = Object.assign({
    'apikey': SERVICE_KEY,
    'Authorization': 'Bearer ' + SERVICE_KEY,
    'Content-Type': 'application/json'
  }, opts.headers || {});
  return fetch(SUPABASE_URL + '/rest/v1/' + path, opts);
}

async function uploadObject(path, bytes, contentType) {
  const res = await fetch(SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + path, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Type': contentType, 'x-upsert': 'true' },
    body: bytes
  });
  if (!res.ok) throw new Error('Storage: ' + res.status + ' ' + (await res.text()));
  return path;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, studioId, name, widthMm, heightMm, dpi, report, layerCount, pdfBase64, pngBase64, thumbBase64, isPublic } = body;
    if (!name || !widthMm || !pdfBase64) {
      return Response.json({ ok: false, error: 'Hianyzo adat.' }, { status: 400 });
    }
    const names = buildNames(name, widthMm, dpi);
    const paths = storagePaths(userId || 'anon', names);
    await uploadObject(paths.pdf, Buffer.from(pdfBase64, 'base64'), 'application/pdf');
    await uploadObject(paths.png, Buffer.from(pngBase64, 'base64'), 'image/png');
    if (thumbBase64) await uploadObject(paths.thumb, Buffer.from(thumbBase64, 'base64'), 'image/png');

    const row = {
      owner_id: userId || null, studio_id: studioId || null, name: name, slug: names.slug,
      width_mm: widthMm, height_mm: heightMm, dpi: dpi || 300,
      engine_branch: (report && report.branchUsed) || 'auto',
      coverage_pct: report ? report.coverage : null,
      bridges: report ? report.bridges : null,
      islands: report ? report.islands : null,
      quality: report ? report.quality : null,
      layer_count: layerCount || 1,
      pdf_path: paths.pdf, png_path: paths.png, thumb_path: thumbBase64 ? paths.thumb : null,
      report: report || null, is_public: !!isPublic
    };
    const ins = await sb('stencils', { method: 'POST', body: JSON.stringify(row), headers: { 'Prefer': 'return=representation' } });
    if (!ins.ok) return Response.json({ ok: false, error: 'Adatbazis: ' + (await ins.text()) }, { status: 500 });
    const saved = await ins.json();
    return Response.json({ ok: true, stencil: saved[0], paths: paths });
  } catch (e) {
    return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 500 });
  }
}
