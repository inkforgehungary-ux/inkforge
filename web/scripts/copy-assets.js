const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', '..', 'public');
const dst = path.join(__dirname, '..', 'public');

try {
  if (fs.existsSync(src)) {
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(src)) {
      if (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.svg') || f.endsWith('.ico')) {
        fs.copyFileSync(path.join(src, f), path.join(dst, f));
      }
    }
    console.log('Kepek atmasolva a web/public mappaba.');
  } else {
    console.log('Nincs gyoker public/ mappa, kihagyva.');
  }
} catch (e) {
  console.log('Masolasi hiba:', e.message);
}
