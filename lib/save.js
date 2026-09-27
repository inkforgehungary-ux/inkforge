// InkForge — mentes es kuldes: fajlnevek, tarolo-utak, tobb nyelvu e-mail.

export function buildNames(stencilName, widthMm, dpi) {
  const base = String(stencilName || 'stencil')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'stencil';
  const tag = widthMm + 'mm-' + dpi + 'dpi';
  return {
    slug: base + '-' + tag,
    pdf: base + '-' + tag + '-nyomtatasi-lap.pdf',
    png: base + '-' + tag + '-atlatszo.png',
    svg: base + '-' + tag + '.svg',
    thumb: base + '-' + tag + '-elonezet.png'
  };
}

export const BUCKET = 'stencils';

export function storagePaths(userId, names) {
  const dir = (userId || 'anon') + '/' + names.slug;
  return {
    dir: dir,
    pdf: dir + '/' + names.pdf,
    png: dir + '/' + names.png,
    svg: dir + '/' + names.svg,
    thumb: dir + '/' + names.thumb
  };
}

export function buildEmail(cfg) {
  const { lang, studioName, stencilName, widthMm, heightMm, dpi, quality, pdfName, pngName, senderName } = cfg;
  const L = EMAILS[lang] || EMAILS.hu;
  const subject = L.subject
    .replace('{studio}', studioName || '')
    .replace('{name}', stencilName || 'stencil');
  const lines = [
    L.hello + (studioName ? ' ' + studioName + ',' : ','),
    '',
    L.body,
    '',
    L.details + ':',
    '  ' + L.dName + ': ' + (stencilName || 'stencil'),
    '  ' + L.dSize + ': ' + Number(widthMm).toFixed(1) + ' x ' + Number(heightMm).toFixed(1) + ' mm',
    '  ' + L.dDpi + ': ' + dpi + ' DPI',
    '  ' + L.dQuality + ': ' + (quality || '-'),
    '',
    L.files,
    '  ' + pdfName + '  -  ' + L.fPdf,
    '  ' + pngName + '  -  ' + L.fPng,
    '',
    L.printNote,
    '',
    L.sign,
    senderName || 'InkForge'
  ];
  return { subject: subject, text: lines.join('\n'), html: toHtml(lines, L) };
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toHtml(lines, L) {
  let rows = '';
  for (let i = 0; i < lines.length; i++) {
    rows += lines[i] ? '<div style="margin:2px 0">' + esc(lines[i]) + '</div>' : '<div style="height:8px"></div>';
  }
  return '<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1c1a17;max-width:560px">' +
    '<div style="padding:16px 0;border-bottom:2px solid #b8892a;margin-bottom:16px">' +
    '<span style="font-size:18px;font-weight:700;letter-spacing:2px;color:#8a6a1c">INKFORGE</span>' +
    '<span style="font-size:12px;color:#6b6862;margin-left:12px">' + esc(L.tagline) + '</span></div>' +
    rows +
    '<div style="margin-top:20px;padding-top:12px;border-top:1px solid #e2ded6;font-size:11px;color:#8a8680">' +
    esc(L.footer) + '</div></div>';
}

const EMAILS = {
  hu: {
    tagline: 'Tattoo stencil platform',
    subject: 'Stencil: {name} - {studio}',
    hello: 'Kedves',
    body: 'Kuldjuk a kesz stencilt nyomtatasra kesz formaban. A csatolt PDF 1:1 meretben nyomtathato, a PNG atlatszo hatterrel kesobbre elteheto.',
    details: 'Reszletek', dName: 'Minta', dSize: 'Meret', dDpi: 'Felbontas', dQuality: 'Minoseg',
    files: 'Csatolt fajlok',
    fPdf: 'nyomtatasi lap (A4, mm-pontos, illesztokeresztekkel)',
    fPng: 'atlatszo PNG (ujranyomtatashoz)',
    printNote: 'Nyomtatasnal kapcsold ki a "Fit to page" opciot, es ellenorizd a 100 mm-es kalibracios vonalat.',
    sign: 'Udvozlettel,', footer: 'InkForge - az otletedbol tiszta sablon.'
  },
  en: {
    tagline: 'Tattoo stencil platform',
    subject: 'Stencil: {name} - {studio}',
    hello: 'Dear',
    body: 'Here is the finished stencil, print-ready. The attached PDF prints at 1:1 scale, and the transparent PNG can be kept for later.',
    details: 'Details', dName: 'Design', dSize: 'Size', dDpi: 'Resolution', dQuality: 'Quality',
    files: 'Attached files',
    fPdf: 'print sheet (A4, mm-accurate, with registration crosses)',
    fPng: 'transparent PNG (for reprinting)',
    printNote: 'Turn off "Fit to page" when printing, and check the 100 mm calibration line.',
    sign: 'Best regards,', footer: 'InkForge - from idea to a clean stencil.'
  },
  de: {
    tagline: 'Tattoo-Stencil-Plattform',
    subject: 'Stencil: {name} - {studio}',
    hello: 'Hallo',
    body: 'Hier ist die fertige Schablone, druckfertig. Das PDF druckt im Massstab 1:1, das transparente PNG ist spater wiederverwendbar.',
    details: 'Details', dName: 'Motiv', dSize: 'Grosse', dDpi: 'Auflosung', dQuality: 'Qualitat',
    files: 'Angehangte Dateien',
    fPdf: 'Druckblatt (A4, mm-genau, mit Passkreuzen)',
    fPng: 'transparentes PNG (zum Nachdrucken)',
    printNote: 'Beim Drucken "Fit to page" ausschalten und die 100-mm-Kalibrierlinie prufen.',
    sign: 'Mit freundlichen Grussen,', footer: 'InkForge - von der Idee zur sauberen Schablone.'
  },
  pl: {
    tagline: 'Platforma szablonow',
    subject: 'Szablon: {name} - {studio}',
    hello: 'Dzien dobry',
    body: 'Przesylamy gotowy szablon do druku. Zalaczony PDF drukuje w skali 1:1, przezroczysty PNG mozna zachowac na pozniej.',
    details: 'Szczegoly', dName: 'Wzor', dSize: 'Rozmiar', dDpi: 'Rozdzielczosc', dQuality: 'Jakosc',
    files: 'Zalaczone pliki',
    fPdf: 'arkusz do druku (A4, co do mm, ze znacznikami)',
    fPng: 'przezroczysty PNG (do ponownego druku)',
    printNote: 'Podczas druku wylacz "Fit to page" i sprawdz linie kalibracyjna 100 mm.',
    sign: 'Z powazaniem,', footer: 'InkForge - od pomyslu do czystego szablonu.'
  }
};

export const SAVE_MODULE_VERSION = '2.0.0';
