// INKFORGE — API: E-MAIL KULDES
// A kesz stencil elkuldtetese a studio cimere, PDF + PNG csatolmannyal.
// Amig nincs kulcs, tisztan jelzi, nem hasal el.

export function validEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
}

export async function POST(req) {
  try {
    const body = await req.json();
    const RESEND_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.INKFORGE_FROM_EMAIL || 'stencil@inkforge.app';
    const FROM_NAME = process.env.INKFORGE_FROM_NAME || 'InkForge';

    const { toEmail, studioName, stencilName, widthMm, heightMm, dpi, quality, pdfBase64, pngBase64, lang } = body || {};

    if (!validEmail(toEmail)) {
      return Response.json({ ok: false, error: 'Ervenytelen e-mail cim.' }, { status: 400 });
    }
    if (!pngBase64) {
      return Response.json({ ok: false, error: 'Hianyzo csatolmany (PNG).' }, { status: 400 });
    }
    if (!RESEND_KEY) {
      return Response.json({
        ok: false,
        configured: false,
        error: 'Az e-mail-kuldes meg nincs bekapcsolva. Csatlakoztasd a Resend-et, es add meg a RESEND_API_KEY kornyezeti valtozot a Vercelen.'
      }, { status: 503 });
    }

    const base = String(stencilName || 'stencil').replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase() || 'stencil';
    const tag = widthMm + 'mm-' + dpi + 'dpi';

    const L = {
      hu: { subj: 'Stencil: ' + (stencilName || 'stencil'), hello: 'Kedves',
        body: 'Kuldjuk a kesz stencilt. A PNG atlatszo hatterrel kesobbi ujranyomtatashoz hasznalhato.',
        det: 'Reszletek', name: 'Minta', size: 'Meret', dpiL: 'Felbontas', sign: 'Udvozlettel,' },
      en: { subj: 'Stencil: ' + (stencilName || 'stencil'), hello: 'Dear',
        body: 'Here is the finished stencil. The transparent PNG can be reused later.',
        det: 'Details', name: 'Design', size: 'Size', dpiL: 'Resolution', sign: 'Best regards,' },
      de: { subj: 'Stencil: ' + (stencilName || 'stencil'), hello: 'Hallo',
        body: 'Hier ist die fertige Schablone. Das transparente PNG ist spater wiederverwendbar.',
        det: 'Details', name: 'Motiv', size: 'Grosse', dpiL: 'Auflosung', sign: 'Grussen,' },
      pl: { subj: 'Szablon: ' + (stencilName || 'stencil'), hello: 'Dzien dobry',
        body: 'Przesylamy gotowy szablon. Przezroczysty PNG mozna uzyc ponownie.',
        det: 'Szczegoly', name: 'Wzor', size: 'Rozmiar', dpiL: 'Rozdzielczosc', sign: 'Pozdrawiam,' }
    }[lang] || null;
    const t = L || { subj: 'Stencil: ' + stencilName, hello: 'Dear', body: 'Here is the finished stencil.', det: 'Details', name: 'Design', size: 'Size', dpiL: 'Resolution', sign: 'Best regards,' };

    const lines = [
      t.hello + (studioName ? ' ' + studioName + ',' : ','),
      '', t.body, '',
      t.det + ':',
      '  ' + t.name + ': ' + (stencilName || 'stencil'),
      '  ' + t.size + ': ' + Number(widthMm).toFixed(1) + ' x ' + Number(heightMm).toFixed(1) + ' mm',
      '  ' + t.dpiL + ': ' + dpi + ' DPI',
      '', t.sign, FROM_NAME
    ];

    const attachments = [{ filename: base + '-' + tag + '-atlatszo.png', content: pngBase64 }];
    if (pdfBase64) attachments.unshift({ filename: base + '-' + tag + '-nyomtatasi-lap.pdf', content: pdfBase64 });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_NAME + ' <' + FROM_EMAIL + '>',
        to: [toEmail.trim()],
        subject: t.subj,
        text: lines.join('\n'),
        attachments: attachments
      })
    });
    const out = await res.json().catch(function () { return {}; });

    if (!res.ok) {
      return Response.json({ ok: false, error: 'A kuldes nem sikerult: ' + ((out && out.message) || res.status) }, { status: 502 });
    }
    return Response.json({ ok: true, messageId: out.id || null, to: toEmail.trim() });
  } catch (e) {
    return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 500 });
  }
}
