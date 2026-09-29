import { NextResponse } from 'next/server';
import { runpodRun, waitRunpod, extractRunpodOutput } from '../../../../lib/runpod-client.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODES = [
  'designly.website_generate',
  'designly.website_edit',
  'designly.website_redesign',
  'designly.image_to_website',
  'designly.website_variation',
  'designly.section_generate',
  'designly.component_generate',
  'designly.asset_generate'
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    engine: 'designly',
    transport: 'runpod-serverless',
    modes: MODES
  });
}

export async function POST(request) {
  try {
    const input = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return NextResponse.json({ ok: false, error: 'Érvénytelen JSON.' }, { status: 400 });
    }

    const mode = String(input.mode || 'designly.website_generate').trim().toLowerCase();
    if (!MODES.includes(mode)) {
      return NextResponse.json({ ok: false, error: 'Ismeretlen Designly mód.' }, { status: 400 });
    }

    const prompt = String(input.prompt || '').trim();
    const promptOptional = mode.startsWith('designly.section_') || mode.startsWith('designly.component_') || mode === 'designly.asset_generate';
    if (!prompt && !promptOptional) {
      return NextResponse.json({ ok: false, error: 'A prompt kötelező.' }, { status: 400 });
    }

    const payload = {
      ...input,
      mode,
      prompt,
      source: 'inkforge-web'
    };

    const job = await runpodRun(payload, { text: false, timeoutMs: 30000 });
    const status = await waitRunpod(job.id, { text: false, timeoutMs: 300000, pollEveryMs: 2000 });
    const output = extractRunpodOutput(status);

    if (!output || typeof output !== 'object') {
      return NextResponse.json({
        ok: false,
        error: 'A RunPod worker nem adott érvényes Designly eredményt.',
        job_id: job.id
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      job_id: job.id,
      ...output
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: String(error?.message || error)
    }, { status: 500 });
  }
}
