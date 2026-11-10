import {createClient} from '@supabase/supabase-js';
import {authorizePilot} from '../../../../lib/pilot/server';
import {sameOrigin} from '../../../../lib/pilot/origin.mjs';
import {measureOpenAI} from '../../../../lib/pilot/openai-geo.mjs';
export const runtime='nodejs';export const maxDuration=90;
const key=()=>process.env.OPENAI_API_KEY||process.env.OPENIA_API_KEY;
export async function GET(req){const auth=await authorizePilot(req);if(!auth)return Response.json({error:'Inicia sesión.'},{status:401});return Response.json({openaiConfigured:!!key(),model:'gpt-5-mini',dailyLimit:10,monthlyLimit:100});}
export async function POST(req){
 if(!sameOrigin(req))return Response.json({error:'Origen no permitido.'},{status:403});
 const auth=await authorizePilot(req);if(!auth)return Response.json({error:'Inicia sesión.'},{status:401});
 const {data:role}=await auth.db.rpc('growth_pilot_role',{p_org:auth.org.id});if(!['admin','sales'].includes(role))return Response.json({error:'Tu rol no permite ejecutar consultas.'},{status:403});
 let input;try{input=await req.json();}catch{return Response.json({error:'Solicitud no válida.'},{status:400});}
 if(typeof input.prompt!=='string'||input.prompt.trim().length<10||input.prompt.length>2000||!/^[-0-9a-f]{36}$/i.test(input.request_key||''))return Response.json({error:'Revisa la consulta.'},{status:400});
 if(!key()||!process.env.SUPABASE_SERVICE_ROLE_KEY)return Response.json({error:'Falta la credencial de OpenAI o del servidor en este entorno.'},{status:503});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||'https://funfgwutdzpgtrcfppnr.supabase.co',process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const reserve=await db.rpc('growth_reserve_ai',{p_org:auth.org.id,p_user:auth.user.id,p_key:input.request_key});
 if(reserve.error)return Response.json({error:'Consulta ya solicitada o límite alcanzado: 10 intentos en 24 horas y 100 al mes. Revisa el historial antes de reintentar.'},{status:429});
 try{
  const result=await measureOpenAI({key:key(),prompt:input.prompt.trim()});
  const saved=await db.from('growth_geo_observations').insert({organization_id:auth.org.id,engine:'ChatGPT',model:result.model,prompt:input.prompt.trim(),response:result.response,citations:result.citations,evidence_url:'https://platform.openai.com/logs',market:'México · CDMX (ubicación aproximada API)',observed_at:new Date().toISOString(),method:'openai_api',created_by:auth.user.id,usage:{...result.usage,response_id:result.responseId}}).select('id').single();
  if(saved.error)throw new Error('save_failed');
  await db.from('growth_ai_runs').update({status:'completed',usage:result.usage}).eq('id',reserve.data);
  return Response.json({id:saved.data.id});
 }catch(e){await db.from('growth_ai_runs').update({status:'failed',error_code:e.status?`provider_${e.status}`:'response_or_save_failed'}).eq('id',reserve.data);return Response.json({error:e.status===401?'OpenAI rechazó la credencial.':e.status===429?'OpenAI indicó falta de cuota o límite de uso.':'No se completó la consulta o su guardado. El intento quedó registrado; no se repetirá automáticamente.'},{status:502});}
}
