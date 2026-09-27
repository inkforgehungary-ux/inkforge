// INKFORGE — A4 PRINT LAYOUT
// Physical-size helpers for tattoo stencil output.
// All dimensions are millimetres unless explicitly noted.

export const A4 = { widthMm: 210, heightMm: 297 };
export const DEFAULT_MARGIN_MM = 5;
export const DEFAULT_OVERLAP_MM = 8;

function pagesFor(widthMm, heightMm, pageW, pageH, marginMm, overlapMm) {
  const artW = pageW - marginMm * 2;
  const artH = pageH - marginMm * 2;
  const stepX = Math.max(1, artW - overlapMm);
  const stepY = Math.max(1, artH - overlapMm);
  const cols = Math.max(1, Math.ceil(Math.max(0, widthMm - artW) / stepX) + 1);
  const rows = Math.max(1, Math.ceil(Math.max(0, heightMm - artH) / stepY) + 1);
  const coveredW = artW + (cols - 1) * stepX;
  const coveredH = artH + (rows - 1) * stepY;
  return {
    pageW,
    pageH,
    artW,
    artH,
    stepX,
    stepY,
    cols,
    rows,
    count: cols * rows,
    coveredW,
    coveredH,
    waste: Math.max(0, coveredW - widthMm) * Math.max(0, coveredH - heightMm)
  };
}

export function calculateA4Layout(widthMm, heightMm, opts) {
  const w = Math.max(1, Number(widthMm) || 100);
  const h = Math.max(1, Number(heightMm) || 100);
  const o = opts || {};
  const marginMm = Math.max(2, Number(o.marginMm ?? DEFAULT_MARGIN_MM));
  const overlapMm = Math.max(0, Number(o.overlapMm ?? DEFAULT_OVERLAP_MM));
  const orientation = o.orientation || 'auto';

  const portrait = pagesFor(w, h, A4.widthMm, A4.heightMm, marginMm, overlapMm);
  const landscape = pagesFor(w, h, A4.heightMm, A4.widthMm, marginMm, overlapMm);

  let chosen;
  if (orientation === 'portrait') chosen = portrait;
  else if (orientation === 'landscape') chosen = landscape;
  else {
    chosen = portrait.count < landscape.count
      ? portrait
      : landscape.count < portrait.count
        ? landscape
        : (portrait.waste <= landscape.waste ? portrait : landscape);
  }

  const pages = [];
  for (let row = 0; row < chosen.rows; row++) {
    for (let col = 0; col < chosen.cols; col++) {
      const xMm = col * chosen.stepX;
      const yMm = row * chosen.stepY;
      pages.push({
        index: pages.length,
        row,
        col,
        xMm,
        yMm,
        cropWidthMm: Math.min(chosen.artW, Math.max(0, w - xMm)),
        cropHeightMm: Math.min(chosen.artH, Math.max(0, h - yMm)),
        pageWidthMm: chosen.pageW,
        pageHeightMm: chosen.pageH,
        artLeftMm: marginMm,
        artTopMm: marginMm,
        artWidthMm: chosen.artW,
        artHeightMm: chosen.artH
      });
    }
  }

  return {
    targetWidthMm: w,
    targetHeightMm: h,
    marginMm,
    overlapMm,
    orientation: chosen === landscape ? 'landscape' : 'portrait',
    pageWidthMm: chosen.pageW,
    pageHeightMm: chosen.pageH,
    artWidthMm: chosen.artW,
    artHeightMm: chosen.artH,
    stepXmm: chosen.stepX,
    stepYmm: chosen.stepY,
    cols: chosen.cols,
    rows: chosen.rows,
    pageCount: chosen.count,
    coveredWidthMm: chosen.coveredW,
    coveredHeightMm: chosen.coveredH,
    pages
  };
}

export function mmToPx(mm, dpi) {
  return Math.max(1, Math.round(Number(mm) * Number(dpi) / 25.4));
}

export function formatMm(mm) {
  return Number(mm || 0).toFixed(1);
}
