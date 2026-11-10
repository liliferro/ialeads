import { createClient } from '@supabase/supabase-js';
import { syncApproved, hubspotTransport } from '../../../../lib/pilot/hubspot.mjs';
import {sameOrigin} from '../../../../lib/pilot/origin.mjs';
export const runtime='nodejs';
export async function POST(req) {
  if(!sameOrigin(req))return Response.json({error:'Origen no permitido.'},{status:403});
  if(!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.HUBSPOT_ACCESS_TOKEN)return Response.json({error:'El envío aún no está activado en el servidor.'},{status:503});
  const token=req.headers.get('authorization');
  if(!token?.startsWith('Bearer '))return Response.json({error:'Inicia sesión.'},{status:401});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://funfgwutdzpgtrcfppnr.supabase.co';
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_lTsW9CyRNjhV3UGi7VMsyw_oHia2vF7';
  const auth=createClient(url,key,{global:{headers:{Authorization:token}},auth:{persistSession:false}});
  const {data:{user},error}=await auth.auth.getUser(token.slice(7));
  if(error || !user)return Response.json({error:'Sesión vencida.'},{status:401});
  const raw=await req.text();
  if(raw.length>2000)return Response.json({error:'Solicitud demasiado grande.'},{status:413});
  let body;try {body=JSON.parse(raw);}catch{return Response.json({error:'Solicitud inválida.'},{status:400});}
  const {data:visible}=await auth.from('growth_outbox').select('id,organization_id').eq('id',body.job_id).maybeSingle();
  if(!visible)return Response.json({error:'Solicitud no disponible.'},{status:404});
  // A member can trigger only a job whose snapshot has already been approved by an administrator.
  const db=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const command=async(action,data={})=>{const r=await db.rpc('growth_command',{p_org:visible.organization_id,p_action:action,p_id:visible.id,p_data:data});if(r.error)throw new Error('database_command_failed');return r.data;};
  try {
    const job=await command('claim');
    if(job.status!=='running')return Response.json(job);
    await syncApproved({job,command,request:hubspotTransport(process.env.HUBSPOT_ACCESS_TOKEN)});
    return Response.json({ok:true});
  } catch {return Response.json({error:'No se pudo completar el envío. Consulta su estado antes de volver a intentar.'},{status:502});}
}
