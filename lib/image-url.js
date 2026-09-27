// INKFORGE — KEP LINKBOL
// A vevo beir egy URL-t, a motor letolti es stencilt keszit belole.
// SSRF-vedelem: belso halozat, privat IP, metadata vegpontok blokkolva.

const MAX_BYTES = 25 * 1024 * 1024;
const TIMEOUT_MS = 20000;

const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
  'image/bmp', 'image/tiff', 'image/gif'
];

export function checkUrl(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); }
  catch (e) { return { ok: false, error: 'Ervenytelen link. Teljes cimet adj meg (https://...).' }; }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, error: 'Csak http vagy https link hasznalhato.' };
  }

  const host = u.hostname.toLowerCase();
  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254',
    'metadata.google.internal', 'metadata', 'kubernetes.default', 'host.docker.internal'];
  if (blocked.indexOf(host) !== -1) {
    return { ok: false, error: 'Belso halozati cim nem engedelyezett.' };
  }
  if (host.endsWith('.local') || host.endsWith('.internal')) {
    return { ok: false, error: 'Belso halozati cim nem engedelyezett.' };
  }
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = +m[1], b = +m[2];
    if (a === 10 || a === 127) return { ok: false, error: 'Belso halozati cim nem engedelyezett.' };
    if (a === 192 && b === 168) return { ok: false, error: 'Belso halozati cim nem engedelyezett.' };
    if (a === 172 && b >= 16 && b <= 31) return { ok: false, error: 'Belso halozati cim nem engedelyezett.' };
    if (a === 169 && b === 254) return { ok: false, error: 'Belso halozati cim nem engedelyezett.' };
  }
  return { ok: true, url: u.toString(), host: host };
}

export async function fetchImage(url) {
  const check = checkUrl(url);
  if (!check.ok) throw new Error(check.error);

  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);

  let res;
  try {
    res = await fetch(check.url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'InkForge/1.0 (+stencil-engine)', 'Accept': 'image/*,*/*;q=0.8' }
    });
  } catch (e) {
    clearTimeout(timer);
    throw new Error('A kep nem erheto el: ' + String(e && e.message ? e.message : e));
  }
  clearTimeout(timer);

  if (!res.ok) throw new Error('A szerver ' + res.status + ' hibaval valaszolt a kepre.');

  const ct = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (ct && ALLOWED_TYPES.indexOf(ct) === -1 && ct.indexOf('image/') !== 0) {
    throw new Error('A link nem kepre mutat (a szerver tipusa: ' + ct + ').');
  }

  const len = parseInt(res.headers.get('content-length') || '0', 10);
  if (len && len > MAX_BYTES) {
    throw new Error('A kep tul nagy (' + Math.round(len / 1048576) + ' MB). A korlat 25 MB.');
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error('A kep tul nagy. A korlat 25 MB.');
  if (buf.length < 100) throw new Error('A letoltott fajl tul kicsi.');

  const kind = sniffType(buf);
  if (!kind) throw new Error('A fajl nem ismert kepformatum (PNG, JPG, WebP, BMP, TIFF, GIF).');

  return { bytes: buf, contentType: ct || ('image/' + kind), kind: kind, sourceUrl: check.url, sizeBytes: buf.length };
}

export function sniffType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'png';
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'jpeg';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  if (buf[0] === 0x42 && buf[1] === 0x4D) return 'bmp';
  if ((buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2A) ||
      (buf[0] === 0x4D && buf[1] === 0x4D && buf[2] === 0x00)) return 'tiff';
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'webp';
  return null;
}

export function nameFromUrl(url) {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean).pop() || 'kep';
    return decodeURIComponent(seg).replace(/[^a-zA-Z0-9-_.]/g, '-').slice(0, 60);
  } catch (e) { return 'kep'; }
}

export const URL_MODULE_VERSION = '1.0.0';
