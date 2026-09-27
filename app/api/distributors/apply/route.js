import { NextResponse } from 'next/server';

export async function POST(request) {
  const form = await request.formData();
  const company_name = String(form.get('companyName') || '').trim();
  const contact_name = String(form.get('contactName') || '').trim();
  const email = String(form.get('email') || '').trim();
  const website = String(form.get('website') || '').trim() || null;
  const fulfillment_mode = String(form.get('fulfillmentMode') || 'dropship');
  const categories = String(form.get('categories') || '').split(',').map((x) => x.trim()).filter(Boolean);
  const message = String(form.get('message') || '').trim() || null;
  if (!company_name || !contact_name || !email) return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Distributor applications are not configured yet.' }, { status: 503 });
  const response = await fetch(url + '/rest/v1/distributor_applications', { method:'POST', headers:{ apikey:key, Authorization:'Bearer '+key, 'Content-Type':'application/json', Prefer:'return=minimal' }, body:JSON.stringify({company_name,contact_name,email,website,fulfillment_mode,categories,message}) });
  if (!response.ok) return NextResponse.json({ error:'Could not save application.' }, { status:500 });
  return NextResponse.redirect(new URL('/hu/forgalmazoknak?sent=1', request.url), 303);
}