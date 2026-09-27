// A repo GYOKEREBEN levo public/ mappa kepeinek atmasolasa
// a web/public mappaba, minden build elott.
// Igy a /fejlec-800.png stb. utvonalak statikusan elerhetok.

const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, '..', '..', 'public'),   // repo gyokere
  path.join(process.cwd(), '..', 'public'),
  path.join(process.cwd(), 'public'),
];

const dst = path.join(__dirname, '..', 'public');
const exts = ['.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp'];

let copied = 0;

for (const src of candidates) {
  try {
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(src)) {
      if (!exts.some((e) => f.toLowerCase().endsWith(e))) continue;
      const target = path.join(dst, f);
      fs.copyFileSync(path.join(src, f), target);
      copied++;
    }
    console.log('Forras:', src, '->', copied, 'fajl atmasolva');
    break;
  } catch (e) {
    console.log('Kihagyva (' + src + '):', e.message);
  }
}

if (copied === 0) {
  console.log('FIGYELEM: nem talaltam kepeket a gyoker public/ mappaban.');
  // Fallback: ha van mar valami a web/public-ban, azt hasznaljuk
  try {
    fs.mkdirSync(dst, { recursive: true });
    console.log('web/public tartalma:', fs.readdirSync(dst).join(', ') || '(ures)');
  } catch (e) { /* nem baj */ }
}
