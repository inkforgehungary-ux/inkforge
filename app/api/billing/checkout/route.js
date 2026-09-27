import { NextResponse } from 'next/server';

const PRICE_ENV = {
  gen_1: 'STRIPE_PRICE_GEN_1',
  gen_5: 'STRIPE_PRICE_GEN_5',
  gen_10: 'STRIPE_PRICE_GEN_10',
  gen_25: 'STRIPE_PRICE_GEN_25',
  start: 'STRIPE_PRICE_START',
  pro: 'STRIPE_PRICE_PRO',
  studio: 'STRIPE_PRICE_STUDIO',
  pro_studio: 'STRIPE_PRICE_PRO_STUDIO',
  business: 'STRIPE_PRICE_BUSINESS',
};

export async function POST(request) {
  try {
    const body = await request.json();
    const key = String(body.key || '').trim();
    const priceEnv = PRICE_ENV[key];
    const price = priceEnv ? process.env[priceEnv] : null;
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!price || !secret) return NextResponse.json({ ok:false, error:'Stripe ár nincs még beállítva ehhez a csomaghoz.' }, { status:503 });

    const recurring = ['start','pro','studio','pro_studio','business'].includes(key);
    const origin = new URL(request.url).origin;
    const params = new URLSearchParams();
    params.set('mode', recurring ? 'subscription' : 'payment');
    params.set('line_items[0][price]', price);
    params.set('line_items[0][quantity]', '1');
    params.set('success_url', origin + '/hu/arak?success=1');
    params.set('cancel_url', origin + '/hu/arak?cancelled=1');
    params.set('allow_promotion_codes', 'true');
    params.set('billing_address_collection', 'auto');
    if (body.email) params.set('customer_email', String(body.email));
    params.set('metadata[inkforge_key]', key);
    params.set('metadata[credits_on_success]', recurring ? 'subscription_invoice' : 'one_off');
    if (recurring) params.set('subscription_data[metadata][inkforge_key]', key);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:'POST',
      headers:{ Authorization:'Bearer '+secret, 'Content-Type':'application/x-www-form-urlencoded' },
      body:params.toString(),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ ok:false, error:data.error?.message || 'Stripe checkout hiba' }, { status:500 });
    return NextResponse.json({ ok:true, url:data.url, sessionId:data.id });
  } catch (e) {
    return NextResponse.json({ ok:false, error:String(e?.message || e) }, { status:500 });
  }
}