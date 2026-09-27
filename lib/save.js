// INKFORGE — MENTES ES KULDES SEGEDEK
// Fajlnevek es e-mail tartalom. Kulső fuggoseg nelkul.

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
    thumb: base + '-' + tag + '-elonezet.png'
  };
}

export const BUCKET = 'stencils';
