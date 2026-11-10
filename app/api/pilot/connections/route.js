import {createClient} from '@supabase/supabase-js';
import {authorizePilot} from '../../../../lib/pilot/server';
import {hubspotTransport} from '../../../../lib/pilot/hubspot.mjs';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(req){
 const auth=await authorizePilot(req);if(!auth)return Response.json({error:'Inicia sesión con acceso a MatDepot.'},{status:401});
 const result={database:'missing',hubspot:'missing',portal:null,contactsRead:false,reports:process.env.WINDSOR_API_KEY?'configured':'missing',checkedAt:new Date().toISOString()};
 if(process.env.SUPABASE_SERVICE_ROLE_KEY){try{const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||'https://funfgwutdzpgtrcfppnr.supabase.co',process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});const {data,error}=await db.from('growth_organizations').select('id').eq('id',auth.org.id).maybeSingle();result.database=!error&&data?'verified':'invalid';}catch{result.database='unavailable';}}
 if(process.env.HUBSPOT_ACCESS_TOKEN){try{const request=hubspotTransport(process.env.HUBSPOT_ACCESS_TOKEN);const account=await request('GET','/account-info/v3/details');result.portal=String(account.portalId);result.hubspot=result.portal==='50738398'?'verified':'wrong_portal';if(result.hubspot==='verified'){try{await request('GET','/crm/v3/properties/contacts');result.contactsRead=true;}catch{result.contactsRead=false;}}}catch(e){result.hubspot=e.status===401?'invalid_token':e.status===403?'missing_permissions':'unavailable';}}
 return Response.json(result,{headers:{'Cache-Control':'no-store'}});
}
