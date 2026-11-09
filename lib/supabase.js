import { createClient } from '@supabase/supabase-js';

// La URL y la clave publicable son públicas por diseño: la seguridad vive en las
// políticas RLS de la base de datos, no en esconder esta clave.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://funfgwutdzpgtrcfppnr.supabase.co';
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_lTsW9CyRNjhV3UGi7VMsyw_oHia2vF7';

let browserClient;
export function getBrowserClient() {
  if (!browserClient) browserClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  return browserClient;
}

// Cliente para route handlers. Con token actúa como esa persona; sin token, como anónimo.
export function serverClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  });
}
