// INKFORGE — mentes a MEGLEVO Supabase semahoz (v3.1)
//
// A stencils tabla oszlopai (a felhasznalo adatbazisabol):
//   id, owner_id, studio_id, title, source_type, source_prompt, source_path,
//   style_id, status, line_weight, bridge_width, output_width_mm,
//   output_height_mm, output_dpi, branch_used, coverage, preview_path,
//   pdf_path, svg_path, ai_cost_usd, error, created_at, completed_at
//
// FONTOS:
//   - owner_id NOT NULL  -> kell a felhasznalo
//   - status default 'queued' -> queued -> processing -> ready/failed
//   - ai_cost_usd NOT NULL default 0 -> a GPU koltseg beirasa

// GPU koltseg: A4000 ~0.000044 USD / ms
export const GPU_USD_PER_MS = 0.000044;

// Kredit-egysegek (a credit_ledger.delta ertekei)
export const CREDIT_COST = { generate: -1, generate_hd: -3 };

export const STATUS = {
  queued: 'queued',
  processing: 'processing',
  ready: 'ready',
  failed: 'failed'
};

export function costUsd(gpuMs) {
  const usd = (gpuMs || 0) * GPU_USD_PER_MS;
  return Math.round(usd * 1000000) / 1000000;
}

export function buildNames(title, widthMm, dpi) {
  const base = String(title || 'stencil')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'stencil';
  const tag = widthMm + 'mm-' + dpi + 'dpi';
  return {
    base: base + '-' + tag,
    png: base + '-' + tag + '-atlatszo.png',
    preview: base + '-' + tag + '-elonezet.png',
    pdf: base + '-' + tag + '-nyomtatasi-lap.pdf',
    svg: base + '-' + tag + '.svg',
    layer: function (i) { return base + '-' + tag + '-reteg-' + (i + 1) + '.png'; }
  };
}

export const BUCKET = 'stencils';

export function storagePaths(studioId, names) {
  const dir = (studioId || 'anon') + '/' + names.base;
  return {
    dir: dir,
    png: dir + '/' + names.png,
    preview: dir + '/' + names.preview,
    pdf: dir + '/' + names.pdf,
    svg: dir + '/' + names.svg,
    layer: function (i) { return dir + '/' + names.layer(i); }
  };
}

// A kezdo sor: status = queued
export function stencilInsertRow(cfg) {
  return {
    owner_id: cfg.userId,
    studio_id: cfg.studioId || null,
    title: cfg.title || 'stencil',
    source_type: cfg.sourceType || 'upload',
    source_prompt: cfg.sourcePrompt || null,
    source_path: cfg.sourcePath || null,
    style_id: cfg.styleId || null,
    status: STATUS.queued,
    line_weight: cfg.lineWeight != null ? cfg.lineWeight : 1.5,
    bridge_width: cfg.bridgeWidth != null ? cfg.bridgeWidth : 1.2,
    output_width_mm: cfg.widthMm,
    output_height_mm: cfg.heightMm,
    output_dpi: cfg.dpi || 300,
    branch_used: null,
    coverage: null,
    preview_path: null,
    pdf_path: null,
    svg_path: null,
    ai_cost_usd: 0,
    error: null
  };
}

// A befejezo frissites
//   status: processing / ready / failed
//   ai_cost_usd: a GPU koltseg
//   completed_at: most, ha kesz vagy hiba
export function stencilUpdateRow(cfg) {
  const patch = { status: cfg.status || STATUS.ready };

  if (cfg.branchUsed) patch.branch_used = cfg.branchUsed;
  if (cfg.coverage != null) patch.coverage = cfg.coverage;
  if (cfg.previewPath) patch.preview_path = cfg.previewPath;
  if (cfg.pdfPath) patch.pdf_path = cfg.pdfPath;
  if (cfg.svgPath) patch.svg_path = cfg.svgPath;
  if (cfg.gpuMs != null) patch.ai_cost_usd = costUsd(cfg.gpuMs);
  if (cfg.error != null) patch.error = String(cfg.error).slice(0, 500);
  if (patch.status === STATUS.ready || patch.status === STATUS.failed) {
    patch.completed_at = new Date().toISOString();
  }
  return patch;
}

// Kredit a credit_ledger tablaba (delta negativ = fogyasztas)
export function creditEntry(studioId, reason, cost) {
  return {
    studio_id: studioId,
    delta: cost != null ? cost : CREDIT_COST.generate,
    reason: reason || 'stencil_generate'
  };
}

// Re teg-sorok a stencil_layers tablaba
export function layerRows(stencilId, layers) {
  return (layers || []).map(function (L, i) {
    return {
      stencil_id: stencilId,
      layer_index: i,
      label: L.label || ('reteg-' + (i + 1)),
      path: L.path || null
    };
  });
}

export function buildEmail(cfg) {
  const { lang, studioName, title, widthMm, heightMm, dpi, pdfName, pngName, senderName } = cfg;
  const L = EMAILS[lang] || EMAILS.hu;
  const subject = L.subject.replace('{studio}', studioName || '').replace('{name}', title || 'stencil');
  const lines = [
    L.hello + (studioName ? ' ' + studioName + ',' : ','),
    '', L.body, '',
    L.details + ':',
    '  ' + L.dName + ': ' + (title || 'stencil'),
    '  ' + L.dSize + ': ' + Number(widthMm).toFixed(1) + ' x ' + Number(heightMm).toFixed(1) + ' mm',
    '  ' + L.dDpi + ': ' + dpi + ' DPI',
    '', L.files,
    '  ' + pngName + '  -  ' + L.fPng,
    pdfName ? '  ' + pdfName + '  -  ' + L.fPdf : '',
    '', L.printNote, '', L.sign, senderName || 'InkForge'
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
    rows +
    '<div style="margin-top:20px;padding-top:12px;border-top:1px solid #e2ded6;font-size:11px;color:#8a8680">' +
    esc(L.footer) + '</div></div>';
}

const EMAILS = {
  hu: { tagline: 'Tattoo stencil platform', subject: 'Stencil: {name} - {studio}', hello: 'Kedves',
    body: 'Kuldjuk a kesz stencilt nyomtatasra kesz formaban.',
    details: 'Reszletek', dName: 'Minta', dSize: 'Meret', dDpi: 'Felbontas',
    files: 'Csatolt fajlok', fPdf: 'nyomtatasi lap (A4, mm-pontos)', fPng: 'atlatszo PNG',
    printNote: 'Nyomtatasnal kapcsold ki a "Fit to page" opciot.', sign: 'Udvozlettel,', footer: 'InkForge' },
  en: { tagline: 'Tattoo stencil platform', subject: 'Stencil: {name} - {studio}', hello: 'Dear',
    body: 'Here is the finished stencil, print-ready.',
    details: 'Details', dName: 'Design', dSize: 'Size', dDpi: 'Resolution',
    files: 'Attached files', fPdf: 'print sheet (A4)', fPng: 'transparent PNG',
    printNote: 'Turn off "Fit to page" when printing.', sign: 'Best regards,', footer: 'InkForge' },
  de: { tagline: 'Tattoo-Stencil-Plattform', subject: 'Stencil: {name} - {studio}', hello: 'Hallo',
    body: 'Hier ist die fertige Schablone.',
    details: 'Details', dName: 'Motiv', dSize: 'Grosse', dDpi: 'Auflosung',
    files: 'Angehangte Dateien', fPdf: 'Druckblatt (A4)', fPng: 'transparentes PNG',
    printNote: 'Beim Drucken "Fit to page" ausschalten.', sign: 'Grussen,', footer: 'InkForge' },
  pl: { tagline: 'Platforma szablonow', subject: 'Szablon: {name} - {studio}', hello: 'Dzien dobry',
    body: 'Przesylamy gotowy szablon.',
    details: 'Szczegoly', dName: 'Wzor', dSize: 'Rozmiar', dDpi: 'Rozdzielczosc',
    files: 'Zalaczone pliki', fPdf: 'arkusz do druku (A4)', fPng: 'przezroczysty PNG',
    printNote: 'Wylacz "Fit to page" podczas druku.', sign: 'Pozdrawiam,', footer: 'InkForge' }
};

export const SAVE_MODULE_VERSION = '3.1.0';
