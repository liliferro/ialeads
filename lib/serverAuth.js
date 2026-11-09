import { serverClient } from './supabase';

// Valida que la petición venga de una persona autenticada y autorizada (tabla allowed_emails).
export async function requireMember(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return { error: 'Falta iniciar sesión', status: 401 };
  const supabase = serverClient(token);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return { error: 'Sesión inválida', status: 401 };
  const { data: member } = await supabase.rpc('is_member');
  if (!member) return { error: 'Tu correo no está autorizado', status: 403 };
  return { supabase, user: userData.user };
}
