// INKFORGE — PROMPT -> KÉP -> ÉLES STENCIL
// POST /api/stencil/from-text -> RunPod text_to_stencil
// GET  /api/stencil/from-text?id=... -> RunPod status

import { runpodReady, runpodRun, runpodStatus, extractRunpodOutput, extractRunpodBase64 } from '../../../../lib/runpod-client.js';
import { buildPromptFromDescription, styleTail } from '../../../../lib/prompt.js';
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

    const widthMm=Math.max(20,Math.min(400,parseFloat(body.width_mm||'100')));
    const dpi=[150,300,600].includes(parseInt(body.dpi||'300',10))?parseInt(body.dpi||'300',10):300;
    const bodyPart=body.body_part||null;
    const styleSlug=body.style_slug||'linework';
    const title=String(body.title||description).slice(0,80);
    const built=buildPromptFromDescription(description,{bodyPart,styleTail:styleTail(styleSlug)});

    const created=await sbInsert('stencils',stencilInsertRow({
      userId:body.user_id||null,studioId:body.studio_id||null,title,sourceType:'ai',
      sourcePrompt:built.prompt,widthMm,dpi
    }));
    const stencilId=created?created.id:null;

    const start=await runpodRun({
      mode:'text_to_stencil',
      prompt:built.prompt,
      negative:built.negative,
      max_side:768,
      steps:22,
      guidance:5.5,
      return_generated:true
    }, { text: true });

    if(stencilId)await sbPatch('stencils',stencilId,{status:STATUS.processing});

    return Response.json({
      ok:true,runpodId:start.id,runpodStatus:start.status||'IN_QUEUE',
      stencilId,studioId:body.studio_id||null,userId:body.user_id||null,
      widthMm,dpi,title,prompt:built.prompt,embeddedText:built.embeddedText,style:styleSlug
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
  const dpi=parseInt(u.searchParams.get('dpi')||'300',10);
  if(!id)return Response.json({ok:false,error:'Hiányzó RunPod id.'},{status:400});

  try{
    const st=await runpodStatus(id,{text:false});
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
    const heightMm=Math.round(widthMm*height/Math.max(1,width)*100)/100;
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
