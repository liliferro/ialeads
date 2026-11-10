import {createClient} from '@supabase/supabase-js';
import {authorizePilot} from '../../../../lib/pilot/server';
import {sameOrigin} from '../../../../lib/pilot/origin.mjs';
import {auditSite,overlapCandidates} from '../../../../lib/pilot/seo.mjs';
import {topics,topicDraft} from '../../../../lib/pilot/seo-topics.mjs';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(req){
 if(!sameOrigin(req))return Response.json({error:'Origen no permitido.'},{status:403});
 const auth=await authorizePilot(req);if(!auth)return Response.json({error:'Inicia sesión con acceso al piloto.'},{status:401});
 const {data:role}=await auth.db.rpc('growth_pilot_role',{p_org:auth.org.id});if(!['admin','sales'].includes(role))return Response.json({error:'Tu rol no permite ejecutar diagnósticos.'},{status:403});
 let input;try{input=await req.json();}catch{return Response.json({error:'Solicitud no válida.'},{status:400});}
 if(!['audit','continue','drafts'].includes(input.action))return Response.json({error:'Acción no válida.'},{status:400});
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY)return Response.json({error:'Falta configurar el acceso del servidor a la base.'},{status:503});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||'https://funfgwutdzpgtrcfppnr.supabase.co',process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 try{
  const {data:latest,error}=await auth.db.from('growth_seo_audits').select('*').eq('organization_id',auth.org.id).order('created_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;
  if(input.action==='drafts'){
   if(!latest||latest.report.pages.length<latest.report.inventory.length)return Response.json({error:'Completa el diagnóstico del inventario antes de preparar los borradores.'},{status:409});
   let created=0,existing=0;for(const topic of topics){const payload=topicDraft(topic,overlapCandidates(topic.keyword,latest.report),latest.id);if(!latest.report.inventory.includes(payload.target_url))continue;
    const {data:known}=await auth.db.from('growth_content').select('id').eq('organization_id',auth.org.id).eq('seo_key',topic.id).maybeSingle();if(known){existing++;continue;}
    const r=await auth.db.rpc('growth_content_command',{p_org:auth.org.id,p_action:'create',p_id:null,p_data:payload});if(r.error)throw r.error;created++;
   }return Response.json({created,existing});
  }
  if(input.action==='continue'&&!latest)return Response.json({error:'Primero inicia un diagnóstico.'},{status:409});
  if(input.action==='audit'&&latest&&Date.now()-Date.parse(latest.created_at)<60000)return Response.json({error:'Ya existe un diagnóstico reciente. Usa Continuar o espera un minuto.'},{status:429});
  const report=await auditSite(input.action==='continue'?latest.report:null);
  const saved=await db.from('growth_seo_audits').insert({organization_id:auth.org.id,report}).select('id').single();if(saved.error)throw saved.error;
  return Response.json({id:saved.data.id,report});
 }catch{return Response.json({error:'No se completó la operación. Se conserva el último diagnóstico. Revisa el acceso o vuelve a intentar.'},{status:502});}
}
