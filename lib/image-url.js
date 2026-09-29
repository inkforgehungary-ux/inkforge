// INKFORGE — KEP LINKBOL
// SSRF-safe remote image loader with redirect re-validation.

const MAX_BYTES = 25 * 1024 * 1024;
const TIMEOUT_MS = 20000;
const MAX_REDIRECTS = 4;
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
  'image/bmp', 'image/tiff', 'image/gif'
];

function isBlockedHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\\[|\\]$/g, '');
  const blocked = [
    'localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254',
    'metadata.google.internal', 'metadata', 'kubernetes.default',
    'host.docker.internal', '::1'
  ];
  if (blocked.includes(host) || host.endsWith('.local') || host.endsWith('.internal')) return true;

  // IPv4 private/link-local/reserved ranges.
  const m = host.match(/^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$/);
  if (m) {
    const [a,b,c,d] = m.slice(1).map(Number);
    if ([a,b,c,d].some(n => n > 255)) return true;
    if (a === 10 || a === 127 || (a === 169 && b === 254) || (a === 192 && b === 168)) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 0 || a >= 224) return true;
  }

  // IPv6 loopback/private/link-local/unique-local ranges.
  if (host.includes(':')) {
    if (host === '::' || host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe8') || host.startsWith('fe9') || host.startsWith('fea') || host.startsWith('feb')) return true;
  }
  return false;
}

export function checkUrl(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); }
  catch (e) { return { ok: false, error: 'Ervenytelen link. Teljes cimet adj meg (https://...).' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, error: 'Csak http vagy https link hasznalhato.' };
  }
  if (u.username || u.password) return { ok: false, error: 'Hitelesitest tartalmazo URL nem engedelyezett.' };
  if (isBlockedHost(u.hostname)) return { ok: false, error: 'Belso vagy fenntartott halozati cim nem engedelyezett.' };
  return { ok: true, url: u.toString(), host: u.hostname.toLowerCase() };
}

async function readResponseImage(res, sourceUrl) {
  if (!res.ok) throw new Error('A szerver ' + res.status + ' hibaval valaszolt a kepre.');
  const ct = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (ct && ALLOWED_TYPES.indexOf(ct) === -1 && !ct.startsWith('image/')) {
    throw new Error('A link nem kepre mutat (a szerver tipusa: ' + ct + ').');
  }
  const len = parseInt(res.headers.get('content-length') || '0', 10);
  if (len && len > MAX_BYTES) throw new Error('A kep tul nagy (' + Math.round(len / 1048576) + ' MB). A korlat 25 MB.');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error('A kep tul nagy. A korlat 25 MB.');
  if (buf.length < 100) throw new Error('A letoltott fajl tul kicsi.');
  const kind = sniffType(buf);
  if (!kind) throw new Error('A fajl nem ismert kepformatum (PNG, JPG, WebP, BMP, TIFF, GIF).');
  return { bytes: buf, contentType: ct || ('image/' + kind), kind, sourceUrl, sizeBytes: buf.length };
}

export async function fetchImage(url) {
  let current = checkUrl(url);
  if (!current.ok) throw new Error(current.error);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(current.url, {
        signal: ctrl.signal,
        redirect: 'manual',
        headers: { 'User-Agent': 'InkForge/1.0 (+stencil-engine)', 'Accept': 'image/*,*/*;q=0.8' },
        cache: 'no-store'
      });
      if (res.status >= 300 && res.status < 400) {
        if (hop === MAX_REDIRECTS) throw new Error('Tul sok atiranyitas a kephez.');
        const location = res.headers.get('location');
        if (!location) throw new Error('A kep szervere ervenytelen atiranyitast adott.');
        const next = checkUrl(new URL(location, current.url).toString());
        if (!next.ok) throw new Error(next.error);
        current = next;
        continue;
      }
      return await readResponseImage(res, current.url);
    }
    throw new Error('A kep letoltese sikertelen.');
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('A kep letoltese idotullepes miatt megszakadt.');
    throw new Error('A kep nem erheto el: ' + String(e && e.message ? e.message : e));
  } finally {
    clearTimeout(timer);
  }
}

export function sniffType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'png';
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'jpeg';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  if (buf[0] === 0x42 && buf[1] === 0x4D) return 'bmp';
  if ((buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2A) || (buf[0] === 0x4D && buf[1] === 0x4D && buf[2] === 0x00)) return 'tiff';
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'webp';
  return null;
}

export function nameFromUrl(url) {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean).pop() || 'kep';
    return decodeURIComponent(seg).replace(/[^a-zA-Z0-9-_.]/g, '-').slice(0, 60);
  } catch (e) { return 'kep'; }
}

export const URL_MODULE_VERSION = '2.0.0';
