// INKFORGE — MENTES
// Fajlnevek, tarolo-utvonal, e-mail tartalom.

export function buildNames(stencilName, widthMm, dpi) {
  const base = (stencilName || 'stencil')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'stencil';
  return {
    slug: base + '-' + widthMm + 'mm-' + dpi + 'dpi',
    pdf: base + '-' + widthMm + 'mm-' + dpi + 'dpi-nyomtatasi-lap.pdf',
    png: base + '-' + widthMm + 'mm-' + dpi + 'dpi-atlatszo.png',
    thumb: base + '-' + widthMm + 'mm-' + dpi + 'dpi-elonezet.png'
  };
}

export const BUCKET = 'stencils';

export function storagePaths(userId, names) {
  const dir = (userId || 'anon') + '/' + names.slug;
  return { dir: dir, pdf: dir + '/' + names.pdf, png: dir + '/' + names.png, thumb: dir + '/' + names.thumb };
}

export function buildEmail(cfg) {
  const { lang, studioName, stencilName, widthMm, heightMm, dpi, quality, pdfName, pngName } = cfg;
  const L = EMAILS[lang] || EMAILS.hu;
  const subject = L.subject.replace('{studio}', studioName || '').replace('{name}', stencilName || 'stencil');
  const lines = [
    L.hello + (studioName ? ' ' + studioName + ',' : ','),
    '', L.body, '',
    L.details + ':',
    '  ' + L.dName + ': ' + (stencilName || 'stencil'),
    '  ' + L.dSize + ': ' + Number(widthMm).toFixed(1) + ' x ' + Number(heightMm).toFixed(1) + ' mm',
    '  ' + L.dDpi + ': ' + dpi + ' DPI',
    '  ' + L.dQuality + ': ' + (quality || '-'),
    '', L.files,
    '  ' + pdfName + '  -  ' + L.fPdf,
    '  ' + pngName + '  -  ' + L.fPng,
    '', L.printNote, '', L.sign, 'InkForge'
  ];
  return { subject: subject, text: lines.join('\n'), html: toHtml(lines, L) };
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function toHtml(lines, L) {
  let rows = '';
  for (let i = 0; i < lines.length; i++) {
    rows += lines[i] ? '<div style="margin:2px 0">' + esc(lines[i]) + '</div>' : '<div style="height:8px"></div>';
  }
  return '<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1c1a17;max-width:560px">' +
    '<div style="padding:16px 0;border-bottom:2px solid #b8892a;margin-bottom:16px">' +
    '<span style="font-size:18px;font-weight:700;letter-spacing:2px;color:#8a6a1c">INKFORGE</span>' +
    '<span style="font-size:12px;color:#6b6862;margin-left:12px">' + esc(L.tagline) + '</span></div>' +
    rows + '<div style="margin-top:20px;padding-top:12px;border-top:1px solid #e2ded6;font-size:11px;color:#8a8680">' +
    esc(L.footer) + '</div></div>';
}

const EMAILS = {
  hu: { tagline: 'Tattoo stencil', subject: 'Stencil: {name} - {studio}', hello: 'Kedves',
    body: 'Kuldjuk a kesz stencilt nyomtatasra kesz formaban. A csatolt PDF 1:1 meretben nyomtathato.',
    details: 'Reszletek', dName: 'Minta', dSize: 'Meret', dDpi: 'Felbontas', dQuality: 'Minoseg',
    files: 'Csatolt fajlok', fPdf: 'nyomtatasi lap (A4, mm-pontos)', fPng: 'atlatszo PNG (ujranyomtatashoz)',
    printNote: 'Nyomtatasnal kapcsold ki a Fit to page opciot.', sign: 'Udvozlettel,', footer: 'InkForge' },
  en: { tagline: 'Tattoo stencil', subject: 'Stencil: {name} - {studio}', hello: 'Dear',
    body: 'Here is the finished stencil, print-ready. The attached PDF prints at 1:1 scale.',
    details: 'Details', dName: 'Design', dSize: 'Size', dDpi: 'Resolution', dQuality: 'Quality',
    files: 'Attached files', fPdf: 'print sheet (A4, mm-accurate)', fPng: 'transparent PNG',
    printNote: 'Turn off "Fit to page" when printing.', sign: 'Best regards,', footer: 'InkForge' },
  de: { tagline: 'Tattoo-Stencil', subject: 'Stencil: {name} - {studio}', hello: 'Hallo',
    body: 'Hier ist die fertige Schablone, druckfertig. Das PDF druckt im Massstab 1:1.',
    details: 'Details', dName: 'Motiv', dSize: 'Grosse', dDpi: 'Auflosung', dQuality: 'Qualitat',
    files: 'Angehangte Dateien', fPdf: 'Druckblatt (A4, mm-genau)', fPng: 'transparentes PNG',
    printNote: 'Beim Drucken "Fit to page" ausschalten.', sign: 'Grussen,', footer: 'InkForge' },
  pl: { tagline: 'Tattoo szablon', subject: 'Szablon: {name} - {studio}', hello: 'Dzien dobry',
    body: 'Przesylamy gotowy szablon do druku. Zalaczony PDF drukuje w skali 1:1.',
    details: 'Szczegoly', dName: 'Wzor', dSize: 'Rozmiar', dDpi: 'Rozdzielczosc', dQuality: 'Jakosc',
    files: 'Zalaczone pliki', fPdf: 'arkusz do druku (A4)', fPng: 'przezroczysty PNG',
    printNote: 'Wylacz "Fit to page" podczas druku.', sign: 'Pozdrawiam,', footer: 'InkForge' }
};

export const SAVE_VERSION = '1.0.0';
