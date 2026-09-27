// INKFORGE — API: KULDES EMAILBEN
// A kesz stencil elkuldtetese a studio cimere, PDF + PNG csatolmannyal.

import { buildNames, buildEmail } from '../../../lib/save.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.INKFORGE_FROM_EMAIL || 'stencil@inkforge.app';
const FROM_NAME = process.env.INKFORGE_FROM_NAME || 'InkForge';

function sb(path, init) {
  const opts = init || {};
  opts.headers = Object.assign({
    'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json'
  }, opts.headers || {});
  return fetch(SUPABASE_URL + '/rest/v1/' + path, opts);
}

function validEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { stencilId, toEmail, studioName, lang, stencilName, widthMm, heightMm, dpi, layerCount, quality, pdfBase64, pngBase64 } = body;
    if (!validEmail(toEmail)) return Response.json({ ok: false, error: 'Ervenytelen e-mail cim.' }, { status: 400 });
    if (!pdfBase64 || !pngBase64) return Response.json({ ok: false, error: 'Hianyzo csatolmany.' }, { status: 400 });
    if (!RESEND_KEY) {
      return Response.json({ ok: false, error: 'Nincs beallitva e-mail-kuldo. Csatlakoztasd a Resend-et es add meg a RESEND_API_KEY valtozot.' }, { status: 503 });
    }

    const names = buildNames(stencilName || 'stencil', widthMm, dpi);
    const mail = buildEmail({
      lang: lang || 'hu', studioName: studioName, stencilName: stencilName,
      widthMm: widthMm, heightMm: heightMm, dpi: dpi || 300,
      layerCount: layerCount || 1, quality: quality, senderName: FROM_NAME,
      pdfName: names.pdf, pngName: names.png
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_NAME + ' <' + FROM_EMAIL + '>',
        to: [toEmail.trim()],
        subject: mail.subject, text: mail.text, html: mail.html,
        attachments: [
          { filename: names.pdf, content: pdfBase64 },
          { filename: names.png, content: pngBase64 }
        ]
      })
    });
    const out = await res.json().catch(function () { return {}; });

    if (stencilId) {
      await sb('stencil_sends', {
        method: 'POST',
        body: JSON.stringify({
          stencil_id: stencilId, to_email: toEmail.trim(), studio_name: studioName || null,
          provider: 'resend', provider_message_id: (out && out.id) || null,
          status: res.ok ? 'sent' : 'failed',
          error: res.ok ? null : JSON.stringify(out).slice(0, 500)
        })
      }).catch(function () {});
    }

    if (!res.ok) return Response.json({ ok: false, error: 'A kuldes nem sikerult: ' + ((out && out.message) || res.status) }, { status: 502 });
    return Response.json({ ok: true, messageId: out.id || null, to: toEmail.trim() });
  } catch (e) {
    return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 500 });
  }
}
