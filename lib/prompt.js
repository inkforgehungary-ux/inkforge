// INKFORGE — PROMPT (v3)
//
// MERES TANULSAG (crazy girl, 2026-09-27):
//   - a FLUX MEGRAJZOLJA A HATTERET is (utca, auto, fak)
//   - a stencil ezert tul fedett lesz (~100%)
//   => a promptnak KIFEJEZETTEN kerni kell a tiszta hatteret

const STYLE_TAIL = [
  'clean tattoo stencil line drawing',
  'bold even black outlines on pure white background',
  'closed continuous contours',
  'no shading, no gradients, no grey tones',
  'high contrast, print-ready transfer sheet',
  'the subject fills the frame, centered composition'
].join(', ');

// A hatter kizarasa: ez az uj, MERES ALAPJAN
const NO_BACKGROUND = [
  'isolated subject only',
  'plain empty white background',
  'no environment', 'no scenery', 'no landscape',
  'no street', 'no buildings', 'no trees', 'no cars',
  'no props behind the subject', 'no frame', 'no border'
].join(', ');

const NEGATIVE_BASE = [
  'photo', 'photorealistic', 'realistic rendering',
  'grey tones', 'greyscale', 'soft gradients', 'blurry edges',
  'watermark', 'signature', 'logo', 'color', 'colour',
  'shading', 'shadow', 'low contrast', 'noisy background',
  'background', 'scenery', 'landscape', 'street', 'building',
  'trees', 'sky', 'cars', 'furniture', 'room',
  'frame', 'border', 'vignette', 'texture'
].join(', ');

const TEXT_HINTS = [
  'szalag', 'szalagon', 'felirat', 'felirattal', 'szoveg', 'szoveggel',
  'banner', 'ribbon', 'cimke', 'nevvel', 'szoval', 'olvashato'
];

export function detectEmbeddedText(desc) {
  const d = String(desc || '').toLowerCase();
  let found = false;
  for (let i = 0; i < TEXT_HINTS.length; i++) {
    if (d.indexOf(TEXT_HINTS[i]) !== -1) { found = true; break; }
  }
  if (!found) return null;

  const quoted = desc.match(/[\u0022\u201e\u0027]([^\u0022\u201e\u0027]{2,40})[\u0022\u201e\u0027]/);
  if (quoted) return quoted[1].trim();

  const caps = desc.match(/\b[A-Z\u00c1\u00c9\u00cd\u00d3\u00d6\u0150\u00da\u00dc\u0170]{2,}(?:\s+[A-Z\u00c1\u00c9\u00cd\u00d3\u00d6\u0150\u00da\u00dc\u0170]{2,})*\b/g);
  if (caps && caps.length) {
    let best = '';
    for (let i = 0; i < caps.length; i++) {
      if (caps[i].length > best.length) best = caps[i];
    }
    if (best.length >= 3) return best.trim();
  }
  return null;
}

export function buildPromptFromDescription(description, opts) {
  const o = opts || {};
  const desc = String(description || '').trim();
  if (!desc) return null;

  const embedded = detectEmbeddedText(desc);
  const parts = [desc];

  if (embedded) {
    parts.push('the ribbon contains the exact text ' + String.fromCharCode(34) + embedded + String.fromCharCode(34));
    parts.push('render the lettering cleanly and correctly spelled');
  }

  parts.push(NO_BACKGROUND);

  if (o.styleTail) parts.push(o.styleTail);
  parts.push(STYLE_TAIL);
  if (o.bodyPart) parts.push('suitable for ' + o.bodyPart + ' placement');

  const negative = [NEGATIVE_BASE];
  if (embedded) negative.push('garbled text', 'misspelled letters');

  return {
    prompt: parts.filter(Boolean).join(', '),
    negative: negative.join(', '),
    embeddedText: embedded,
    description: desc
  };
}

export const STYLES = {
  linework:    { hu: 'Vonalas',         en: 'Linework',        tail: 'clean uniform single-weight linework' },
  blackwork:   { hu: 'Blackwork',       en: 'Blackwork',       tail: 'bold black fills, sharp negative space' },
  dotwork:     { hu: 'Dotwork',         en: 'Dotwork',         tail: 'fine stippled dot shading for depth' },
  fineline:    { hu: 'Fine line',       en: 'Fine line',       tail: 'very thin delicate elegant lines' },
  traditional: { hu: 'Traditional',     en: 'Traditional',     tail: 'classic bold traditional tattoo composition' },
  ornamental:  { hu: 'Ornamentalis',    en: 'Ornamental',      tail: 'symmetric ornamental filigree detail' },
  geometric:   { hu: 'Geometrikus',     en: 'Geometric',       tail: 'precise geometric construction, symmetry' },
  tribal:      { hu: 'Tribal',          en: 'Tribal',          tail: 'flowing tribal curves, pointed tips' },
  japanese:    { hu: 'Japan',           en: 'Japanese',        tail: 'japanese motif composition, flowing forms' },
  realism:     { hu: 'Realista kontur', en: 'Realist contour', tail: 'detailed realistic contour, no shading' }
};

export function styleTail(slug) {
  const s = STYLES[slug];
  return s ? s.tail : '';
}

export function styleList(lang) {
  const out = [];
  const keys = Object.keys(STYLES);
  for (let i = 0; i < keys.length; i++) {
    out.push({ slug: keys[i], label: lang === 'en' ? STYLES[keys[i]].en : STYLES[keys[i]].hu });
  }
  return out;
}

export const EXAMPLES = [
  'koponya szarnyakkal, alatta szalag, a szalagon PRO PATRIA',
  'farkas fej hegyek elott, kor alaku kompozicio',
  'rozsa tuskevel es ket osszefonodo level',
  'hullam es hold, minimalista vonalak',
  'kard es kigyo keresztbe, kelta csomoval',
  'oroszlan fej korona, felirattal VICTORIA'
];

export const PROMPT_VERSION = '3.0.0';
