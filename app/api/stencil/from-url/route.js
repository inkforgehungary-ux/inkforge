// INKFORGE — KÉP LINKBŐL -> ÉLES STENCIL
// Nincs memória-queue. A Vercel csak elindítja és lekérdezi a RunPod jobot.

import { fetchImage, checkUrl } from '../../../../lib/image-url.js';
import { runpodReady, runpodRun, runpodStatus, extractRunpodOutput, extractRunpodBase64 } from '../../../../lib/runpod-client.js';
import { stencilInsertRow, stencilUpdateRow, creditEntry, CREDIT_COST, STATUS, costUsd } from '../../../../lib/save.js';

const SUPABASE_URL=process.env.SUPABASE_URL;
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;
function sbHeaders(extra){return Object.assign({apikey:SERVICE_KEY,Authorization:'Bearer '+SERVICE_KEY,'Content-Type':'application/json'},extra||{});}
async function sbInsert(table,row){if(!SUPABASE_URL||!SERVICE_KEY)return null;try{const r=await fetch(SUPABASE_URL+'/rest/v1/'+table,{method:'POST',headers:sbHeaders({'Prefer':'return=representation'}),body:JSON.stringify(row)});if(!r.ok)return null;const j=await r.json();return Array.isArray(j)?j[0]:j;}catch(e){return null;}}
async function sbPatch(table,id,patch,extra){if(!SUPABASE_URL||!SERVICE_KEY||!id)return null;try{const r=await fetch(SUPABASE_URL+'/rest/v1/'+table+'?id=eq.'+encodeURIComponent(id)+(extra||''),{method:'PATCH',headers:sbHeaders({'Prefer':'return=representation'}),body:JSON.stringify(patch)});if(!r.ok)return null;const j=await r.json();return Array.isArray(j)?(j[0]||null):j;}catch(e){return null;}}

export async function POST(req){
  try{
    if(!runpodReady())return Response.json({ok:false,configured:false,error:'A RunPod GPU motor nincs beállítva.'},{status:503});
    const body=await req.json();
    const check=checkUrl(String(body.url||'').trim());
    if(!check.ok)return Response.json({ok:false,error:check.error},{status:400});

    const widthMm=Math.max(20,Math.min(700,parseFloat(body.width_mm||'100')));
    const heightMm=Math.max(20,Math.min(1000,parseFloat(body.height_mm||body.width_mm||'100')));
    const dpi=[150,300,600].includes(parseInt(body.dpi||'300',10))?parseInt(body.dpi||'300',10):300;
    const mode=['image_to_stencil','image_to_image_stencil','image_to_image'].includes(String(body.mode||'image_to_image_stencil'))
      ? String(body.mode||'image_to_image_stencil') : 'image_to_image_stencil';
    const title=String(body.title||'link-minta').slice(0,80);

    const got=await fetchImage(check.url);
    const imageB64=Buffer.from(got.bytes).toString('base64');

    const created=await sbInsert('stencils',stencilInsertRow({
      userId:body.user_id||null,studioId:body.studio_id||null,title,sourceType:'url',
      sourcePath:check.url,widthMm,heightMm,dpi
    }));
    const stencilId=created?created.id:null;

    const start=await runpodRun({
      mode,image_base64:imageB64,
      prompt:body.prompt||'preserve the source subject; clean tattoo stencil line art',
      max_side:1024,
      target_width_mm:widthMm,
      target_height_mm:heightMm,
      steps:24,
      strength:Math.max(0.15,Math.min(0.85,parseFloat(body.strength||'0.38'))),
      return_generated:true
    });

    if(stencilId)await sbPatch('stencils',stencilId,{status:STATUS.processing});

    return Response.json({
      ok:true,runpodId:start.id,runpodStatus:start.status||'IN_QUEUE',
      stencilId,studioId:body.studio_id||null,userId:body.user_id||null,
      sourceUrl:check.url,widthMm,heightMm,dpi,title,mode
    });
  }catch(e){return Response.json({ok:false,error:String(e&&e.message?e.message:e)},{status:500});}
}

export async function GET(req){
  const u=new URL(req.url),id=u.searchParams.get('id'),stencilId=u.searchParams.get('stencil'),studioId=u.searchParams.get('studio');
  const widthMm=Math.max(20,parseFloat(u.searchParams.get('mm')||'100')),requestedHeightMm=parseFloat(u.searchParams.get('hmm')||''),dpi=parseInt(u.searchParams.get('dpi')||'300',10);
  if(!id)return Response.json({ok:false,error:'Hiányzó RunPod id.'},{status:400});
  try{
    const st=await runpodStatus(id);const status=String(st.status||'').toUpperCase();const failed=['FAILED','ERROR','CANCELLED','TIMED_OUT'].includes(status);
    if(!['COMPLETED','SUCCESS'].includes(status)&&!failed)return Response.json({ok:true,ready:false,status,runpodId:id});
    const out=extractRunpodOutput(st)||{};
    if(failed){const msg=out.error||out.message||st.error||'A RunPod feladat sikertelen.';if(stencilId)await sbPatch('stencils',stencilId,stencilUpdateRow({status:STATUS.failed,error:msg}),'&status=eq.'+encodeURIComponent(STATUS.processing));return Response.json({ok:true,ready:true,failed:true,error:String(msg),status});}
    const b64=extractRunpodBase64(st);if(!b64)return Response.json({ok:true,ready:true,failed:true,error:'A worker kész, de nem adott képet.'});
    const width=Number(out.width||768),height=Number(out.height||768),heightMm=Number.isFinite(requestedHeightMm)&&requestedHeightMm>0?Math.round(requestedHeightMm*100)/100:Math.round(widthMm*height/Math.max(1,width)*100)/100,gpuMs=Number(out.gpu_ms||out.executionTime||0);
    let transitioned=null;
    if(stencilId)transitioned=await sbPatch('stencils',stencilId,stencilUpdateRow({status:STATUS.ready,branchUsed:out.mode||'runpod-url',coverage:out.coverage,heightMm,gpuMs,error:null}),'&status=eq.'+encodeURIComponent(STATUS.processing));
    if(transitioned&&studioId)await sbInsert('credit_ledger',creditEntry(studioId,'stencil_url_'+(out.mode||'runpod'),CREDIT_COST.generate));
    return Response.json({ok:true,ready:true,failed:false,png_base64:b64,generated_png_base64:out.generated_png_base64||null,width,height,widthMm,heightMm,dpi,coverage:out.coverage,bridges:out.bridges||0,islands:out.islands||0,quality:out.quality||'hasznalhato',verdictText:out.verdictText||'Éles, nyomtatható stencil-vonalrajz.',gpuMs,aiCostUsd:costUsd(gpuMs),runpodId:id,mode:out.mode||null,engine:out.engine||null});
  }catch(e){return Response.json({ok:true,ready:false,status:'RETRY',note:String(e&&e.message?e.message:e)},{status:202});}
}
