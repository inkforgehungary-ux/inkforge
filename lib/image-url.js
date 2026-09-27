// ============================================================
// INKFORGE — KÉP LINKBŐL
// A vevő beir egy URL-t, a motor letolti es stencilt keszit belole.
//
// BIZTONSAG (SSRF vedelem):
//   - csak http/https
//   - belso halozat blokkolva (localhost, 127.*, 10.*, 192.168.*, 172.16-31.*)
//   - felho metadata blokkolva (169.254.169.254)
//   - fajlmeret korlat (25 MB), idotullepes (20 mp)
//   - csak valodi kép (magikus bajtok ellenorzese)
//
// A letoltott kép TAROLVA lesz — nem linkelve. Igy a link elhalasa
// nem torne el a kesz stencilt, es a forras megmarad a source_path-ban.
// ============================================================

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
  const blocked = [
    'localhost', '127.0.0.1', '0.0.0.0', '::1',
    '169.254.169.254', 'metadata.google.internal', 'metadata',
    'kubernetes.default', 'host.docker.internal'
  ];
  if (blocked.indexOf(host) !== -1) {
    return { ok: false, error: 'Belso halozati cim nem engedelyezett.' };
  }
  if (host.indexOf('.local') === host.length - 6 || host.indexOf('.internal') === host.length - 9) {
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
    throw new Error('A kép nem erheto el: ' + String(e && e.message ? e.message : e));
  }
  clearTimeout(timer);

  if (!res.ok) throw new Error('A szerver ' + res.status + ' hibaval valaszolt a kép re.');

  const ct = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (ct && ALLOWED_TYPES.indexOf(ct) === -1 && ct.indexOf('image/') !== 0) {
    throw new Error('A link nem kép re mutat (a szerver tipusa: ' + ct + ').');
  }

  const len = parseInt(res.headers.get('content-length') || '0', 10);
  if (len && len > MAX_BYTES) {
    throw new Error('A kép tul nagy (' + Math.round(len / 1048576) + ' MB). A korlat 25 MB.');
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error('A kép tul nagy (' + Math.round(buf.length / 1048576) + ' MB). A korlat 25 MB.');
  if (buf.length < 100) throw new Error('A letoltott fajl tul kicsi — nem valoszinuleg kép.');

  const kind = sniffType(buf);
  if (!kind) throw new Error('A fajl nem ismert képformatum (PNG, JPG, WebP, BMP, TIFF, GIF).');

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

// Egyseges belepesi pont: a 4 bemeneti ut egy fuggvenyben
//   kind: 'file' | 'url' | 'text'
export async function resolveSource(cfg) {
  const o = cfg || {};
  if (o.kind === 'url') {
    const got = await fetchImage(o.url);
    return {
      kind: 'url',
      bytes: got.bytes,
      contentType: got.contentType,
      fileName: nameFromUrl(o.url),
      sourcePath: o.url,
      sourceType: 'url'
    };
  }
  if (o.kind === 'file') {
    return {
      kind: 'file',
      bytes: o.bytes,
      contentType: o.contentType || 'image/png',
      fileName: o.fileName || 'feltoltes.png',
      sourcePath: o.storedPath || null,
      sourceType: 'upload'
    };
  }
  return { kind: 'text', sourceType: 'ai' };
}

export const URL_MODULE_VERSION = '1.0.0';
