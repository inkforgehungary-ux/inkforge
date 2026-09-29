// INKFORGE — RUNPOD PUBLIC IMAGE MODELS
// Z-Image Turbo: text-to-image + image-to-image
// FLUX.1 Kontext dev: image-to-image editing
// A public endpointekhez csak RUNPOD_API_KEY kell; saját Serverless endpoint nem szükséges.

const API = 'https://api.runpod.ai/v2/';

function key() {
  const v = process.env.RUNPOD_API_KEY || '';
  if (!v) throw new Error('A RUNPOD_API_KEY nincs beállítva.');
  return v;
}

async function post(endpoint, input, timeoutMs) {
  const res = await fetch(API + endpoint + '/runsync', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ input }),
    signal: AbortSignal.timeout(timeoutMs || 180000)
  });
  const raw = await res.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
  if (!res.ok) {
    const detail = raw ? ' — ' + raw.slice(0, 1000) : '';
    throw new Error('RunPod public endpoint hiba: HTTP ' + res.status + detail);
  }
  if (data.status && ['FAILED','ERROR','CANCELLED','TIMED_OUT'].includes(String(data.status).toUpperCase())) {
    throw new Error('RunPod public modell hiba: ' + String(data.error || data.message || data.status));
  }
  return data;
}

function output(data) {
  const out = data && data.output;
  if (!out) throw new Error('A RunPod public modell nem adott vissza outputot.');
  return out;
}

function imageUrlFromOutput(out) {
  const candidate =
    out.image_url ||
    out.url ||
    (Array.isArray(out.images) && out.images[0] && (
      typeof out.images[0] === 'string' ? out.images[0] : (out.images[0].url || out.images[0].image_url)
    ));
  if (!candidate || typeof candidate !== 'string') {
    throw new Error('A RunPod public modell elkészült, de nem adott vissza kép URL-t.');
  }
  return candidate;
}

async function downloadImage(url) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: { Accept: 'image/*,*/*;q=0.8' }
  });
  if (!r.ok) throw new Error('A RunPod kép letöltése sikertelen: HTTP ' + r.status);
  const bytes = Buffer.from(await r.arrayBuffer());
  if (bytes.length < 100) throw new Error('A RunPod kép túl kicsi vagy üres.');
  return {
    url,
    base64: bytes.toString('base64'),
    contentType: (r.headers.get('content-type') || 'image/png').split(';')[0]
  };
}

export async function zImageTextToImage({ prompt, negative, size, seed }) {
  const data = await post('z-image-turbo', {
    prompt,
    negative_prompt: negative || undefined,
    size: size || '1024*1024',
    seed: seed == null ? -1 : seed,
    output_format: 'png'
  });
  const out = output(data);
  const url = imageUrlFromOutput(out);
  const image = await downloadImage(url);
  return { ...image, engine: 'RunPod Z-Image Turbo', cost: Number(out.cost || data.cost || 0.005) };
}

export async function zImageImageToImage({ imageUrl, prompt, strength, size, seed }) {
  const data = await post('z-image-turbo', {
    prompt,
    image: imageUrl,
    strength: strength == null ? 0.65 : strength,
    size: size || '1024*1024',
    seed: seed == null ? -1 : seed,
    output_format: 'png'
  });
  const out = output(data);
  const url = imageUrlFromOutput(out);
  const image = await downloadImage(url);
  return { ...image, engine: 'RunPod Z-Image Turbo img2img', cost: Number(out.cost || data.cost || 0.005) };
}

export async function fluxKontextImageToImage({ imageUrl, prompt, size }) {
  const data = await post('black-forest-labs-flux-1-kontext-dev', {
    prompt,
    image: imageUrl,
    num_inference_steps: 28,
    guidance: 2,
    size: size || '1024*1024'
  });
  const out = output(data);
  const url = imageUrlFromOutput(out);
  const image = await downloadImage(url);
  return { ...image, engine: 'RunPod FLUX.1 Kontext dev', cost: Number(out.cost || data.cost || 0.025) };
}
