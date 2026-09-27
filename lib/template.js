// ============================================================
// INKFORGE — SABLON SZOVEGBOL
// Egy promptbol stencil: minta generalas, majd stencil-konverzio.
//
// KET MOD:
//   A) studio_self  — a studio irja a promptot, o fizet
//   B) library      — a platform generalja elore, a studio valaszt
//
// A Runpod endpoint mindkettot tudja:
//   - text-to-image:  promptbol kép
//   - image-to-image: kesz képbol stencil
// ============================================================

export const STENCIL_PROMPT_TEMPLATE = [
  '{subject}',
  'clean tattoo stencil line drawing',
  'bold even black outlines on pure white background',
  'closed continuous contours, no shading, no gradients, no grey tones',
  'high contrast, print-ready transfer sheet',
  'centered composition, clear silhouette readable at small size'
].join(', ');

export const NEGATIVE_HINT = [
  'photorealistic', 'grey tones', 'soft gradients', 'blurry edges',
  'watermark', 'signature', 'text', 'color', 'shading'
].join(', ');

export const STYLE_PRESETS = [
  { slug: 'linework',   hu: 'Vonalas',         en: 'Linework',         extra: 'clean single-weight linework, uniform stroke width' },
  { slug: 'blackwork',  hu: 'Blackwork',       en: 'Blackwork',        extra: 'bold black fills with sharp negative space, high contrast' },
  { slug: 'tribal',     hu: 'Tribal',          en: 'Tribal',           extra: 'flowing tribal curves, pointed tips, symmetrical' },
  { slug: 'fineline',   hu: 'Fine line',       en: 'Fine line',        extra: 'very thin delicate lines, minimal, elegant' },
  { slug: 'dotwork',    hu: 'Dotwork',         en: 'Dotwork',          extra: 'stippled dot shading for depth, no solid fills' },
  { slug: 'ornamental', hu: 'Ornamentalis',    en: 'Ornamental',       extra: 'symmetric ornamental filigree, balanced detail' },
  { slug: 'japanese',   hu: 'Japan',           en: 'Japanese',         extra: 'classic japanese motif composition, flowing waves and bold shapes' },
  { slug: 'geometric',  hu: 'Geometrikus',     en: 'Geometric',        extra: 'precise geometric construction, straight lines, symmetry' },
  { slug: 'lettering',  hu: 'Felirat',         en: 'Lettering',        extra: 'script lettering, connected strokes, no serif detail' },
  { slug: 'realism',    hu: 'Realista kontur', en: 'Realist contour',  extra: 'detailed contour of a realistic subject, no shading' }
];

export function presetBySlug(slug) {
  for (let i = 0; i < STYLE_PRESETS.length; i++) {
    if (STYLE_PRESETS[i].slug === slug) return STYLE_PRESETS[i];
  }
  return null;
}

export function buildPrompt(subject, styleSlug, opts) {
  const o = opts || {};
  const preset = presetBySlug(styleSlug);
  const parts = [];
  parts.push(subject || (o.lang === 'hu' ? 'tetovalas minta' : 'tattoo design'));
  if (preset) parts.push(preset.extra);
  parts.push(o.template || STENCIL_PROMPT_TEMPLATE);
  if (o.bodyPart) parts.push('suitable for ' + o.bodyPart + ' placement');
  return {
    prompt: parts.filter(Boolean).join(', '),
    negative: o.negative || NEGATIVE_HINT,
    style: preset ? preset.slug : null,
    subject: subject || null
  };
}

// A stencil-KONVERZIO prompt: kesz kepbol vonalas stencil
export function buildConvertPrompt(lang) {
  const L = lang || 'hu';
  const map = {
    hu: 'Alakitsd ezt a kepet tiszta tetovalas stencil vonalrajzza: vastag, egyenletes fekete konturok tiszta feher hatteren, zart folytonos vonalak, arnyekolas es szurke arnyalatok nelkul. Nyomtatasra kesz.',
    en: 'Convert this image into a clean tattoo stencil line drawing: bold even black outlines on pure white background, closed continuous contours, no shading and no grey tones. Print-ready.',
    de: 'Wandle dieses Bild in eine saubere Tattoo-Stencil-Linienzeichnung um: kraeftige gleichmaessige schwarze Konturen auf reinweissem Hintergrund, geschlossene durchgehende Linien, ohne Schattierung und ohne Grautoene.',
    pl: 'Przeksztalc ten obraz w czysty kontur szablonu tatuzu: wyrazne, rowne czarne kontury na czystym bialym tle, zamkniete ciagle linie, bez cieniowania i odcieni szarosci.'
  };
  return map[L] || map.en;
}

export function runpodPayload(cfg) {
  const o = cfg || {};
  if (o.mode === 'image') {
    return {
      mode: 'image',
      image_base64: o.imageBase64,
      prompt: o.prompt || buildConvertPrompt(o.lang),
      strength: o.strength != null ? o.strength : 0.75,
      target_coverage: o.targetCoverage != null ? o.targetCoverage : 0.06
    };
  }
  const p = buildPrompt(o.subject, o.styleSlug, o);
  return {
    mode: 'text',
    prompt: p.prompt,
    negative_prompt: p.negative,
    style_slug: p.style,
    count: o.count || 1,
    width_mm: o.widthMm || 100,
    target_coverage: o.targetCoverage != null ? o.targetCoverage : 0.06
  };
}

// Sablon a styles tablaba (library mod)
export function styleLibraryRow(cfg) {
  return {
    slug: cfg.slug,
    name_hu: cfg.nameHu || cfg.slug,
    name_en: cfg.nameEn || cfg.slug,
    prompt: cfg.prompt || null,
    negative_prompt: cfg.negativePrompt || null,
    preview_path: cfg.previewPath || null,
    source: cfg.source || 'platform',
    is_public: cfg.isPublic !== false,
    is_active: true
  };
}

export const STYLE_GROUPS = [
  { key: 'classic', hu: 'Klasszikus', en: 'Classic', slugs: ['linework', 'blackwork', 'fineline'] },
  { key: 'ethnic',  hu: 'Etnikus',    en: 'Ethnic',  slugs: ['tribal', 'japanese', 'ornamental'] },
  { key: 'modern',  hu: 'Modern',     en: 'Modern',  slugs: ['geometric', 'dotwork', 'realism'] },
  { key: 'text',    hu: 'Szoveg',     en: 'Text',    slugs: ['lettering'] }
];

export const TEMPLATE_VERSION = '1.0.0';
