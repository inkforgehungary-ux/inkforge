// ============================================================
// INKFORGE — COMFYUI WORKFLOW (FLUX.1-dev fp8)
// A runpod-workers/worker-comfyui API formatuma.
//
// Keres:  POST /runsync    (a Quick start panel ezt mutatja)
//   { "input": { "workflow": { "6": { "inputs": {...}, "class_type": "..." } } } }
//
// Valasz:
//   { "output": { "message": "data:image/png;base64,..." }, "status": "COMPLETED" }
//
// A PROMPT a "6" node-ba kerul (CLIPTextEncode positive).
// A NEGATIV a "33" node-ba kerul (CLIPTextEncode negative).
// ============================================================

export function buildFluxWorkflow(cfg) {
  const o = cfg || {};
  const width = o.width || 1024;
  const height = o.height || 1024;
  const steps = o.steps || 20;
  const guidance = o.guidance != null ? o.guidance : 3.5;
  const seed = o.seed != null ? o.seed : Math.floor(Math.random() * 9007199254740991);
  const ckpt = o.ckpt || 'flux1-dev-fp8.safetensors';
  const prefix = o.prefix || 'inkforge';

  return {
    '6': {
      inputs: { text: o.prompt || '', clip: ['30', 1] },
      class_type: 'CLIPTextEncode',
      _meta: { title: 'CLIP Text Encode (Positive Prompt)' }
    },
    '8': {
      inputs: { samples: ['31', 0], vae: ['30', 2] },
      class_type: 'VAEDecode',
      _meta: { title: 'VAE Decode' }
    },
    '9': {
      inputs: { filename_prefix: prefix, images: ['8', 0] },
      class_type: 'SaveImage',
      _meta: { title: 'Save Image' }
    },
    '27': {
      inputs: { width: width, height: height, batch_size: 1 },
      class_type: 'EmptySD3LatentImage',
      _meta: { title: 'EmptySD3LatentImage' }
    },
    '30': {
      inputs: { ckpt_name: ckpt },
      class_type: 'CheckpointLoaderSimple',
      _meta: { title: 'Load Checkpoint' }
    },
    '31': {
      inputs: {
        seed: seed, steps: steps, cfg: 1,
        sampler_name: 'euler', scheduler: 'simple', denoise: 1,
        model: ['30', 0], positive: ['35', 0],
        negative: ['33', 0], latent_image: ['27', 0]
      },
      class_type: 'KSampler',
      _meta: { title: 'KSampler' }
    },
    '33': {
      inputs: { text: o.negative || '', clip: ['30', 1] },
      class_type: 'CLIPTextEncode',
      _meta: { title: 'CLIP Text Encode (Negative Prompt)' }
    },
    '35': {
      inputs: { guidance: guidance, conditioning: ['6', 0] },
      class_type: 'FluxGuidance',
      _meta: { title: 'FluxGuidance' }
    }
  };
}

export function buildRunpodInput(cfg) {
  const o = cfg || {};
  const input = {
    workflow: buildFluxWorkflow({
      prompt: o.prompt, negative: o.negative,
      width: o.width, height: o.height,
      steps: o.steps, guidance: o.guidance,
      seed: o.seed, ckpt: o.ckpt
    })
  };
  // Csak akkor tesszuk bele az images mezot, ha van
  if (o.images) input.images = o.images;
  return { input: input };
}

// A valasz feldolgozasa: base64 kinyerese
export function extractImage(res) {
  if (!res) return null;

  if (res.output && res.output.message && typeof res.output.message === 'string') {
    const m = res.output.message.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (m) return { mime: 'image/' + m[1], base64: m[2] };
    if (res.output.message.length > 200 && /^[A-Za-z0-9+/=]+$/.test(res.output.message.slice(0, 100))) {
      return { mime: 'image/png', base64: res.output.message };
    }
  }

  if (res.output && Array.isArray(res.output.images) && res.output.images.length) {
    const first = res.output.images[0];
    if (typeof first === 'string') {
      const m = first.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
      if (m) return { mime: 'image/' + m[1], base64: m[2] };
      return { mime: 'image/png', base64: first };
    }
    if (first && first.data) return { mime: first.mime || 'image/png', base64: first.data };
  }

  if (typeof res.image_base64 === 'string') return { mime: 'image/png', base64: res.image_base64 };
  if (typeof res.image === 'string' && res.image.length > 200) {
    const m = res.image.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (m) return { mime: 'image/' + m[1], base64: m[2] };
  }
  return null;
}

export function isCompleted(res) {
  if (!res) return false;
  const s = String(res.status || '').toUpperCase();
  return s === 'COMPLETED' || s === 'SUCCESS' || s === 'OK';
}

export function isFailed(res) {
  if (!res) return true;
  const s = String(res.status || '').toUpperCase();
  return s === 'FAILED' || s === 'ERROR' || s === 'CANCELLED' || s === 'TIMED_OUT';
}

// Képmeret a stencil-formathoz
export function sizeForStencil(opts) {
  const o = opts || {};
  const aspect = o.aspect || '1:1';
  const base = o.base || 1024;
  const map = {
    '1:1':  { width: base, height: base },
    '3:4':  { width: 896,  height: 1152 },
    '4:3':  { width: 1152, height: 896 },
    '9:16': { width: 768,  height: 1344 },
    '16:9': { width: 1344, height: 768 }
  };
  return map[aspect] || map['1:1'];
}

export const COMFY_WORKFLOW_VERSION = '1.0.0';
