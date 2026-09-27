// INKFORGE — E-MAIL KULDES
// Utvonal: app/api/stencil/send/route.js -> ../../../../lib/

import { buildEmail } from '../../../../lib/save.js';

export async function POST(req) {
  try {
    const RESEND_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.INKFORGE_FROM_EMAIL || 'stencil@inkforge.app';
    const FROM_NAME = process.env.INKFORGE_FROM_NAME || 'InkForge';

    if (!RESEND_KEY) {
      return Response.json({
        ok: false, configured: false,
        error: 'Az e-mail-kuldes meg nincs bekapcsolva. Csatlakoztasd a Resend-et, es add meg a RESEND_API_KEY valtozot.'
      }, { status: 503 });
    }

    const body = await req.json();
    const toEmail = String(body.to_email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(toEmail)) {
      return Response.json({ ok: false, error: 'Ervenytelen e-mail cim.' }, { status: 400 });
    }
    if (!body.png_base64) {
      return Response.json({ ok: false, error: 'Hianyzo csatolmany (PNG).' }, { status: 400 });
    }

    const mail = buildEmail({
      lang: body.lang || 'hu',
      studioName: body.studio_name,
      title: body.title,
      widthMm: body.width_mm,
      heightMm: body.height_mm,
      dpi: body.dpi || 300,
      pngName: (body.title || 'stencil') + '-atlatszo.png',
      pdfName: null,
      senderName: FROM_NAME
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_NAME + ' <' + FROM_EMAIL + '>',
        to: [toEmail],
        subject: mail.subject,
        text: mail.text,
        attachments: [{ filename: (body.title || 'stencil') + '-atlatszo.png', content: body.png_base64 }]
      })
    });
    const out = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      return Response.json({ ok: false, error: 'A kuldes nem sikerult: ' + ((out && out.message) || res.status) }, { status: 502 });
    }
    return Response.json({ ok: true, messageId: out.id || null, to: toEmail });
  } catch (e) {
    return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 500 });
  }
}
