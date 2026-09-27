// INKFORGE — QUEUE STATE (diagnosztika)
// GET /api/stencil/queue

import { queueStats, cacheStats, jobStatus } from '../../../../lib/queue.js';

export async function GET(req) {
  const u = new URL(req.url);
  const id = u.searchParams.get('id');
  if (id) {
    const st = jobStatus(id);
    return Response.json({ ok: true, job: st, queue: queueStats() });
  }
  return Response.json({ ok: true, queue: queueStats(), cache: cacheStats() });
}
