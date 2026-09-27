// INKFORGE — GENERALAS SOR ES CACHE
// 100+ egyideju keres kezelese: sor, allapot, cache.

const QUEUE = [];
const JOBS = new Map();
let RUNNING = 0;

const MAX_CONCURRENT = 10;
const RESULT_TTL = 1000 * 60 * 30;
const MAX_QUEUE = 300;

let seq = 0;
function now() { return Date.now(); }

export function queueStats() {
  return {
    queued: QUEUE.length,
    running: RUNNING,
    maxConcurrent: MAX_CONCURRENT,
    maxQueue: MAX_QUEUE
  };
}

export function enqueue(fn, meta) {
  if (QUEUE.length >= MAX_QUEUE) {
    const e = new Error('A sor megtelt — probald ujra par perc mulva.');
    e.code = 'QUEUE_FULL';
    throw e;
  }
  const id = 'j' + (++seq) + '-' + now().toString(36);
  const job = {
    id: id, status: 'queued', meta: meta || {},
    createdAt: now(), startedAt: null, finishedAt: null,
    result: null, error: null
  };
  JOBS.set(id, job);
  QUEUE.push({ id: id, fn: fn });
  pump();
  return id;
}

export function jobStatus(id) {
  const j = JOBS.get(id);
  if (!j) return null;
  const avgMs = 12000;
  const ahead = j.status === 'queued'
    ? Math.max(0, QUEUE.findIndex(function (q) { return q.id === id; }))
    : 0;
  const eta = (j.status === 'done' || j.status === 'error') ? 0
    : Math.round((ahead * avgMs) / MAX_CONCURRENT + (j.status === 'running' ? 6000 : 0));
  return {
    id: j.id, status: j.status, position: ahead,
    etaMs: eta, etaS: Math.round(eta / 1000),
    createdAt: j.createdAt, startedAt: j.startedAt, finishedAt: j.finishedAt,
    error: j.error, hasResult: !!j.result
  };
}

export function jobResult(id) {
  const j = JOBS.get(id);
  if (!j || j.status !== 'done') return null;
  return j.result;
}

async function pump() {
  while (RUNNING < MAX_CONCURRENT && QUEUE.length > 0) {
    const item = QUEUE.shift();
    const j = JOBS.get(item.id);
    if (!j) continue;
    RUNNING++;
    j.status = 'running';
    j.startedAt = now();
    (async function () {
      try {
        const res = await item.fn();
        j.result = res;
        j.status = 'done';
      } catch (e) {
        j.error = String(e && e.message ? e.message : e);
        j.status = 'error';
      } finally {
        j.finishedAt = now();
        RUNNING--;
        cleanup();
        pump();
      }
    })();
  }
}

function cleanup() {
  const cutoff = now() - RESULT_TTL;
  JOBS.forEach(function (j, id) {
    if (j.finishedAt && j.finishedAt < cutoff) JOBS.delete(id);
  });
}

export function cacheKey(fileInfo, opts) {
  const o = opts || {};
  return [
    fileInfo.name || '', fileInfo.size || 0,
    o.mode || 'lineart', o.targetCoverage || 0.06,
    o.widthMm || 100, o.dpi || 300,
    o.bridges !== false ? 'b1' : 'b0', o.bridgePx || 2
  ].join('|');
}

const CACHE = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 2;

export function cacheGet(key) {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (now() - hit.at > CACHE_TTL) { CACHE.delete(key); return null; }
  return hit.value;
}

export function cacheSet(key, value) {
  CACHE.set(key, { value: value, at: now() });
  if (CACHE.size > 500) {
    const entries = Array.from(CACHE.entries()).sort(function (a, b) { return a[1].at - b[1].at; });
    entries.slice(0, entries.length - 400).forEach(function (e) { CACHE.delete(e[0]); });
  }
}

export function cacheStats() { return { size: CACHE.size, ttlMs: CACHE_TTL }; }

const GPU_USD_PER_MS = 0.000044;

export function estimateCost(count) {
  const n = Math.max(1, count || 1);
  const gpuMs = n * 12000;
  const usd = gpuMs * GPU_USD_PER_MS;
  return {
    generations: n, gpuMs: gpuMs,
    usd: Math.round(usd * 10000) / 10000,
    huf: Math.round(usd * 355)
  };
}

export const QUEUE_VERSION = '1.0.0';
