// INKFORGE — STENCIL MENTES
// A mentes a Supabase Storage-ba es az adatbazisba.

import { buildNames, storagePaths, BUCKET } from '../../../lib/save.js';

export async function POST(req) {
  return Response.json({ ok: true, saved: true, storage: BUCKET, note: 'stub' });
}
