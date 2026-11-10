import {createClient} from '@supabase/supabase-js';
export async function authorizePilot(req){
 const header=req.headers.get('authorization');if(!header?.startsWith('Bearer '))return null;
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||'https://funfgwutdzpgtrcfppnr.supabase.co',process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_lTsW9CyRNjhV3UGi7VMsyw_oHia2vF7',{global:{headers:{Authorization:header}},auth:{persistSession:false}});
 const {data:{user},error}=await db.auth.getUser(header.slice(7));if(error||!user)return null;
 const {data:org}=await db.from('growth_organizations').select('id,slug').eq('slug','matdepot').maybeSingle();return org?{db,org,user}:null;
}
