import { NextResponse } from 'next/server';
import { runpodRun, waitRunpod, extractRunpodOutput } from '../../../lib/runpod-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    engine: 'designly',
    modes: ['designly.website_generate','designly.website_edit','designly.website_redesign','designly.image_to_website','designly.website_variation','designly.section_generate','designly.component_generate','designly.asset_generate']
  });
}

export async function POST(request) {
  try {
    const input = await request.json();
    if (!input || typeof input !== 'object') return NextResponse.json({ ok:false, error:'Érvénytelen JSON.' }, { status:400 });
    const prompt = String(input.prompt || '').trim();
    if (!prompt && !String(input.mode || '').startsWith('designly.section_') && !String(input.mode || '').startsWith('designly.component_')) {
      return NextResponse.json({ ok:false, error:'A prompt kötelező.' }, { status:400 });
    }
    const mode = String(input.mode || 'designly.website_generate').toLowerCase();
    const allowed = new Set(['designly.website_generate','designly.website_edit','designly.website_redesign','designly.image_to_website','designly.website_variation','designly.section_generate','designly.component_generate','designly.asset_generate']);
    if (!allowed.has(mode)) return NextResponse.json({ ok:false, error:'Ismeretlen Designly mód.' }, { status:400 });

    const job = await runpodRun({ ...input, mode, prompt }, { text:false, timeoutMs:30000 });
    const status = await waitRunpod(job.id, { text:false, timeoutMs:300000, pollEveryMs:2000 });
    const output = extractRunpodOutput(status);
    if (!output) return NextResponse.json({ ok:false, error:'A RunPod nem adott vissza eredményt.', job_id:job.id }, { status:502 });
    return NextResponse.json({ ...output, job_id:job.id });
  } catch (error) {
    return NextResponse.json({ ok:false, error:String(error?.message || error) }, { status:500 });
  }
}
