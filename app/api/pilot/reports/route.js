import {createClient} from '@supabase/supabase-js';
import {authorizePilot} from '../../../../lib/pilot/server';
import {sameOrigin} from '../../../../lib/pilot/origin.mjs';
import {fetchReport,reportPeriod} from '../../../../lib/pilot/reports.mjs';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(req){
 const auth=await authorizePilot(req);if(!auth)return Response.json({error:'Inicia sesión con acceso a MatDepot.'},{status:401});
 return Response.json({hubspotConfigured:!!(process.env.HUBSPOT_ACCESS_TOKEN&&process.env.SUPABASE_SERVICE_ROLE_KEY),reportsConfigured:!!(process.env.WINDSOR_API_KEY&&process.env.SUPABASE_SERVICE_ROLE_KEY),aiConfigured:false,publicCapture:false});
}
export async function POST(req){
 if(!sameOrigin(req))return Response.json({error:'Origen no permitido.'},{status:403});
 const auth=await authorizePilot(req);if(!auth)return Response.json({error:'Inicia sesión con acceso a MatDepot.'},{status:401});
 if(!process.env.WINDSOR_API_KEY||!process.env.SUPABASE_SERVICE_ROLE_KEY)return Response.json({error:'Faltan las credenciales de Windsor y/o Supabase en el servidor. El último informe guardado sigue disponible.'},{status:503});
 const period=reportPeriod();
 const {data:recent}=await auth.db.from('growth_reports').select('source,fetched_at').eq('organization_id',auth.org.id).eq('date_from',period.date_from).eq('date_to',period.date_to);
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||'https://funfgwutdzpgtrcfppnr.supabase.co',process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const results=await Promise.all(['googleanalytics4','searchconsole'].map(async source=>{
   if(recent?.some(r=>r.source===source&&Date.now()-Date.parse(r.fetched_at)<3600000))return {source,status:'cached'};
   try{const report=await fetchReport(source,process.env.WINDSOR_API_KEY,period);const {error}=await db.from('growth_reports').upsert({...report,organization_id:auth.org.id},{onConflict:'organization_id,source,date_from,date_to'});if(error)throw new Error('save_failed');return {source,status:'updated'};}
   catch{return {source,status:'unavailable'};}
 }));return Response.json({results});
}
