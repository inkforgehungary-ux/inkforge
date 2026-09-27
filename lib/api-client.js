// INKFORGE — KULDES: kliens oldali segito
// A stencil PDF/PNG elkeszitese utan a szerver vegpontra kuldjuk.

export async function saveStencil(payload) {
  const res = await fetch('/api/stencil/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

export async function sendStencil(payload) {
  const res = await fetch('/api/stencil/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

// A PDF szerveroldalon keszul: a bongeszo csak a maszkot es a beallitasokat adja.
export function pdfPayload(cfg) {
  return {
    stencilName: cfg.stencilName,
    studioName: cfg.studioName,
    studioEmail: cfg.studioEmail,
    widthMm: cfg.widthMm,
    heightMm: cfg.heightMm,
    dpi: cfg.dpi,
    maskBase64: cfg.maskBase64,
    maskW: cfg.maskW,
    maskH: cfg.maskH,
    registration: cfg.registration,
    layerCount: cfg.layerCount,
    report: cfg.report,
    lang: cfg.lang
  };
}
