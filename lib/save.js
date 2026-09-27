// INKFORGE — mentes a MEGLEVO Supabase semahoz (v3.1)
//
// stencils: id, owner_id, studio_id, title, source_type, source_prompt, source_path,
//   style_id, status, line_weight, bridge_width, output_width_mm, output_height_mm,
//   output_dpi, branch_used, coverage, preview_path, pdf_path, svg_path,
//   ai_cost_usd, error, created_at, completed_at
// credit_ledger: id, studio_id, delta, reason, stripe_event_id, created_at
// stencil_layers: id, stencil_id, layer_index, label, path

export const GPU_USD_PER_MS = 0.000044;
export const CREDIT_COST = { generate: -1, generate_hd: -3 };

export const STATUS = {
  queued: 'queued', processing: 'processing',
  ready: 'ready', failed: 'failed'
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
    output_height_mm: cfg.heightMm || null,
    output_dpi: cfg.dpi || 300,
    branch_used: null, coverage: null,
    preview_path: null, pdf_path: null, svg_path: null,
    ai_cost_usd: 0, error: null
  };
}

export function stencilUpdateRow(cfg) {
  const patch = { status: cfg.status || STATUS.ready };
  if (cfg.branchUsed) patch.branch_used = cfg.branchUsed;
  if (cfg.coverage != null) patch.coverage = cfg.coverage;
  if (cfg.heightMm != null) patch.output_height_mm = cfg.heightMm;
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

export function creditEntry(studioId, reason, cost) {
  return {
    studio_id: studioId,
    delta: cost != null ? cost : CREDIT_COST.generate,
    reason: reason || 'stencil_generate'
  };
}

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
  const c = cfg || {};
  const lang = c.lang || 'hu';
  const E = {
    hu: { tagline: 'Tattoo stencil platform', subject: 'Stencil: ' + (c.title || 'stencil'), hello: 'Kedves',
      body: 'Kuldjuk a kesz stencilt nyomtatasra kesz formaban.',
      det: 'Reszletek', dN: 'Minta', dS: 'Meret', dD: 'Felbontas',
      files: 'Csatolt fajlok', fPdf: 'nyomtatasi lap (A4, mm-pontos)', fPng: 'atlatszo PNG',
      note: 'Nyomtatasnal kapcsold ki a Fit to page opciot.', sign: 'Udvozlettel,' },
    en: { tagline: 'Tattoo stencil platform', subject: 'Stencil: ' + (c.title || 'stencil'), hello: 'Dear',
      body: 'Here is the finished stencil, print-ready.',
      det: 'Details', dN: 'Design', dS: 'Size', dD: 'Resolution',
      files: 'Attached files', fPdf: 'print sheet (A4)', fPng: 'transparent PNG',
      note: 'Turn off Fit to page when printing.', sign: 'Best regards,' },
    de: { tagline: 'Tattoo-Stencil-Plattform', subject: 'Stencil: ' + (c.title || 'stencil'), hello: 'Hallo',
      body: 'Hier ist die fertige Schablone.',
      det: 'Details', dN: 'Motiv', dS: 'Grosse', dD: 'Auflosung',
      files: 'Angehangte Dateien', fPdf: 'Druckblatt (A4)', fPng: 'transparentes PNG',
      note: 'Beim Drucken Fit to page ausschalten.', sign: 'Grussen,' },
    pl: { tagline: 'Platforma szablonow', subject: 'Szablon: ' + (c.title || 'stencil'), hello: 'Dzien dobry',
      body: 'Przesylamy gotowy szablon.',
      det: 'Szczegoly', dN: 'Wzor', dS: 'Rozmiar', dD: 'Rozdzielczosc',
      files: 'Zalaczone pliki', fPdf: 'arkusz do druku (A4)', fPng: 'przezroczysty PNG',
      note: 'Wylacz Fit to page podczas druku.', sign: 'Pozdrawiam,' }
  };
  const L = E[lang] || E.hu;
  const lines = [
    L.hello + (c.studioName ? ' ' + c.studioName + ',' : ','),
    '', L.body, '',
    L.det + ':',
    '  ' + L.dN + ': ' + (c.title || 'stencil'),
    '  ' + L.dS + ': ' + Number(c.widthMm).toFixed(1) + ' x ' + Number(c.heightMm).toFixed(1) + ' mm',
    '  ' + L.dD + ': ' + c.dpi + ' DPI',
    '', L.files,
    '  ' + c.pngName + '  -  ' + L.fPng,
    c.pdfName ? '  ' + c.pdfName + '  -  ' + L.fPdf : '',
    '', L.note, '', L.sign, c.senderName || 'InkForge'
  ];
  return { subject: L.subject, text: lines.join('\n'), textLines: lines };
}

export const SAVE_MODULE_VERSION = '3.1.0';
