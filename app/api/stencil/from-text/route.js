// Build-safe import separation for Vercel/Next.js.
// INKFORGE — PROMPT -> KÉP -> ÉLES STENCIL
// POST /api/stencil/from-text -> RunPod text_to_stencil
// GET  /api/stencil/from-text?id=... -> RunPod status

import { runpodReady, runpodRun, runpodStatus, extractRunpodOutput, extractRunpodBase64 } from '../../../../lib/runpod-client.js';
import { buildPromptFromDescription, styleTail } from '../../../../lib/prompt.js';
import { translatePromptToEnglish } from '../../../../lib/prompt-translate.js';
import { stencilInsertRow, stencilUpdateRow, creditEntry, CREDIT_COST, STATUS, costUsd } from '../../../../lib/save.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders(extra) {
  return Object.assign({
    'apikey': SERVICE_KEY,
    'Authorization': 'Bearer ' + SERVICE_KEY,
    'Content-Type': 'application/json'
  }, extra || {});
}
async function sbInsert(table,row) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const r=await fetch(SUPABASE_URL+'/rest/v1/'+table,{method:'POST',headers:sbHeaders({'Prefer':'return=representation'}),body:JSON.stringify(row)});
    if(!r.ok)return null; const j=await r.json(); return Array.isArray(j)?j[0]:j;
  }catch(e){return null;}
}
async function sbPatch(table,id,patch,extra) {
  if(!SUPABASE_URL||!SERVICE_KEY||!id)return null;
  try{
    const r=await fetch(SUPABASE_URL+'/rest/v1/'+table+'?id=eq.'+encodeURIComponent(id)+(extra||''),{method:'PATCH',headers:sbHeaders({'Prefer':'return=representation'}),body:JSON.stringify(patch)});
    if(!r.ok)return null; const j=await r.json(); return Array.isArray(j)?(j[0]||null):j;
  }catch(e){return null;}
}

export async function POST(req) {
  try {
    if (!runpodReady()) return Response.json({ok:false,configured:false,error:'A RunPod GPU motor nincs beállítva.'},{status:503});
    const body=await req.json();
    const description=String(body.description||'').trim();
    if(description.length<4)return Response.json({ok:false,error:'Írd le, mit ábrázoljon.'},{status:400});

    const widthMm=Math.max(20,Math.min(700,parseFloat(body.width_mm||'100')));
    const heightMm=Math.max(20,Math.min(1000,parseFloat(body.height_mm||widthMm)));
    const dpi=[150,300,600].includes(parseInt(body.dpi||'300',10))?parseInt(body.dpi||'300',10):300;
    const bodyPart=body.body_part||null;
    const styleSlug=body.style_slug||'linework';
    const title=String(body.title||description).slice(0,80);
    const normalized=await translatePromptToEnglish(description);
    const built=buildPromptFromDescription(normalized.text,{bodyPart,styleTail:styleTail(styleSlug)});

    const created=await sbInsert('stencils',stencilInsertRow({
      userId:body.user_id||null,studioId:body.studio_id||null,title,sourceType:'ai',
      sourcePrompt:built.prompt,widthMm,heightMm,dpi
    }));
    const stencilId=created?created.id:null;

    const mode=body.mode==='text_to_image'?'text_to_image':'text_to_stencil';

    // TEXT -> AI KÉP: közvetlen RunPod FLUX public endpoint.
    // Így a text_to_image módnak nem kell a stencil workerben külön FLUX handlerre várnia.
    if (mode === 'text_to_image') {
      const apiKey = process.env.RUNPOD_API_KEY || '';
      if (!apiKey) throw new Error('A RUNPOD_API_KEY nincs beállítva.');

      const fluxRes = await fetch(
        'https://api.runpod.ai/v2/black-forest-labs-flux-1-schnell/runsync',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: {
              prompt: built.prompt,
              width: 1024,
              height: 1024,
              num_inference_steps: 4
            }
          }),
          signal: AbortSignal.timeout(120000)
        }
      );

      const fluxRaw = await fluxRes.text();
      let flux = {};
      try { flux = fluxRaw ? JSON.parse(fluxRaw) : {}; } catch (_) {}

      if (!fluxRes.ok) {
        throw new Error('RunPod FLUX hiba: HTTP ' + fluxRes.status + (fluxRaw ? ' — ' + fluxRaw.slice(0, 800) : ''));
      }

      const imageUrl = flux && flux.output && (
        flux.output.image_url ||
        flux.output.url ||
        (Array.isArray(flux.output.images) && flux.output.images[0] && (flux.output.images[0].url || flux.output.images[0]))
      );

      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('A RunPod FLUX elkészült, de nem adott vissza image URL-t.');
      }

      const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
      if (!imageRes.ok) {
        throw new Error('A RunPod FLUX képe nem tölthető le: HTTP ' + imageRes.status);
      }

      const imageBytes = Buffer.from(await imageRes.arrayBuffer());
      const imageB64 = imageBytes.toString('base64');

      return Response.json({
        ok: true,
        ready: true,
        failed: false,
        png_base64: imageB64,
        generated_png_base64: imageB64,
        width: 1024,
        height: 1024,
        widthMm,
        heightMm,
        dpi,
        mode: 'text_to_image',
        engine: 'RunPod FLUX 1 Schnell',
        gpuMs: 0,
        coverage: 0,
        bridges: 0,
        islands: 1,
        quality: 'ai_kep',
        verdictText: 'AI kép elkészült.',
        prompt: built.prompt,
        embeddedText: built.embeddedText,
        promptLanguage: normalized.source,
        translatedPrompt: normalized.translated
      });
    }
    const start=await runpodRun({
      mode:mode,
      prompt:built.prompt,
      negative:built.negative,
      max_side:1024,
      target_width_mm:widthMm,
      target_height_mm:heightMm,
      steps:24,
      guidance:5.5,
      return_generated:true,
      style: styleSlug === 'fine_line' || styleSlug === 'linework' ? 'line' : (
        ['stencil','hatching','bold','soft'].includes(styleSlug) ? styleSlug : 'stencil'
      )
    }, { text: true });

    if(stencilId)await sbPatch('stencils',stencilId,{status:STATUS.processing});

    return Response.json({
      ok:true,runpodId:start.id,runpodStatus:start.status||'IN_QUEUE',
      stencilId,studioId:body.studio_id||null,userId:body.user_id||null,
      widthMm,heightMm,dpi,title,prompt:built.prompt,embeddedText:built.embeddedText,style:styleSlug,
      promptLanguage:normalized.source,translatedPrompt:normalized.translated
    });
  }catch(e){
    return Response.json({ok:false,error:String(e&&e.message?e.message:e)},{status:500});
  }
}

export async function GET(req) {
  const u=new URL(req.url);
  const id=u.searchParams.get('id');
  const stencilId=u.searchParams.get('stencil');
  const studioId=u.searchParams.get('studio');
  const widthMm=Math.max(20,parseFloat(u.searchParams.get('mm')||'100'));
  const requestedHeightMm=parseFloat(u.searchParams.get('hmm')||'');
  const dpi=parseInt(u.searchParams.get('dpi')||'300',10);
  if(!id)return Response.json({ok:false,error:'Hiányzó RunPod id.'},{status:400});

  try{
    const st=await runpodStatus(id,{text:true});
    const status=String(st.status||'').toUpperCase();
    const failed=['FAILED','ERROR','CANCELLED','TIMED_OUT'].includes(status);
    if(!['COMPLETED','SUCCESS'].includes(status)&&!failed)return Response.json({ok:true,ready:false,status,runpodId:id});

    const out=extractRunpodOutput(st)||{};
    if(failed){
      const msg=out.error||out.message||st.error||'A RunPod feladat sikertelen.';
      if(stencilId)await sbPatch('stencils',stencilId,stencilUpdateRow({status:STATUS.failed,error:msg}),'&status=eq.'+encodeURIComponent(STATUS.processing));
      return Response.json({ok:true,ready:true,failed:true,error:String(msg),status});
    }
    const b64=extractRunpodBase64(st);
    if(!b64)return Response.json({ok:true,ready:true,failed:true,error:'A worker kész, de nem adott képet.'});

    const width=Number(out.width||768),height=Number(out.height||768);
    const heightMm=Number.isFinite(requestedHeightMm)&&requestedHeightMm>0
      ? Math.round(requestedHeightMm*100)/100
      : Math.round(widthMm*height/Math.max(1,width)*100)/100;
    const gpuMs=Number(out.gpu_ms||out.executionTime||0);
    let transitioned=null;
    if(stencilId)transitioned=await sbPatch('stencils',stencilId,stencilUpdateRow({
      status:STATUS.ready,branchUsed:'runpod-text-to-stencil',coverage:out.coverage,heightMm,gpuMs,error:null
    }),'&status=eq.'+encodeURIComponent(STATUS.processing));
    if(transitioned&&studioId)await sbInsert('credit_ledger',creditEntry(studioId,'stencil_text_to_stencil',CREDIT_COST.generate_hd));

    return Response.json({
      ok:true,ready:true,failed:false,
      png_base64:b64,generated_png_base64:out.generated_png_base64||null,
      width,height,widthMm,heightMm,dpi,coverage:out.coverage,
      bridges:out.bridges||0,islands:out.islands||0,
      quality:out.quality||'hasznalhato',verdictText:out.verdictText||'Éles, nyomtatható stencil-vonalrajz.',
      gpuMs,aiCostUsd:costUsd(gpuMs),runpodId:id,mode:out.mode||'text_to_stencil',
      engine:out.engine||null,prompt:out.prompt||null
    });
  }catch(e){
    return Response.json({ok:true,ready:false,status:'RETRY',note:String(e&&e.message?e.message:e)},{status:202});
  }
}
