import { createClient } from '@supabase/supabase-js';
let client;
export function pilotClient() {
  return client ||= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://funfgwutdzpgtrcfppnr.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_lTsW9CyRNjhV3UGi7VMsyw_oHia2vF7',
    { auth: { storageKey: 'mood-pilot-auth', persistSession: true } }
  );
}
