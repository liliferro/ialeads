import {createClient} from '@supabase/supabase-js';
import {searchFilters,searchIron} from '../../../../lib/pilot/iron.mjs';
import {sameOrigin} from '../../../../lib/pilot/origin.mjs';
export const runtime='nodejs';
export async function POST(req){
 if(!sameOrigin(req))return Response.json({error:'Origen no permitido.'},{status:403});
 const token=req.headers.get('authorization');if(!token?.startsWith('Bearer '))return Response.json({error:'Inicia sesión para buscar empresas.'},{status:401});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||'https://funfgwutdzpgtrcfppnr.supabase.co',process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_lTsW9CyRNjhV3UGi7VMsyw_oHia2vF7',{global:{headers:{Authorization:token}},auth:{persistSession:false}});
 const {data:{user},error}=await db.auth.getUser(token.slice(7));if(error||!user)return Response.json({error:'Sesión vencida.'},{status:401});
 const raw=await req.text();if(raw.length>5000)return Response.json({error:'Demasiados filtros.'},{status:413});
 let body,filters;try{body=JSON.parse(raw);filters=searchFilters(body.filters);}catch(e){return Response.json({error:e.message||'Filtros inválidos.'},{status:400});}
 const {data:org}=await db.from('growth_organizations').select('id').eq('id',body.organization_id).maybeSingle();if(!org)return Response.json({error:'Sin acceso a este cliente.'},{status:403});
 try{return Response.json({...await searchIron(filters),filters});}catch(e){return Response.json({error:e.name==='TimeoutError'?'Iron tardó demasiado. Intenta de nuevo.':e.message},{status:502});}
}
