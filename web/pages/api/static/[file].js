const fs = require('fs');
const path = require('path');

// A repo GYOKEREBEN levo public/ mappa kiszolgalasa.
// A kepek ott vannak (nem a web/public-ban), es a Next.js csak a sajat
// public/ mappajat szolgalja ki — ez az endpoint athidalja.
// A build idejere a fajlok atmasolasa is megtortenik (lásd next.config.js).

const ROOT_PUBLIC = path.join(process.cwd(), 'public');

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export default function handler(req, res) {
  const { file } = req.query;

  if (!file || typeof file !== 'string') {
    res.status(400).json({ error: 'Hianyzik a fajlnev' });
    return;
  }
  if (file.includes('/') || file.includes('\\') || file.includes('..')) {
    res.status(400).json({ error: 'Ervenytelen fajlnev' });
    return;
  }

  const full = path.join(ROOT_PUBLIC, file);

  try {
    if (!fs.existsSync(full)) {
      res.status(404).json({ error: 'Nincs ilyen fajl: ' + file });
      return;
    }
    const data = fs.readFileSync(full);
    const ext = path.extname(file).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.status(200).send(data);
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
