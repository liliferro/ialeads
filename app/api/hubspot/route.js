import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/serverAuth';
import { sendToHubspot } from '@/lib/hubspot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Reintento manual de envío a HubSpot desde el panel.
export async function POST(request) {
  const auth = await requireMember(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'Falta el lead' }, { status: 400 });
  const { data: lead, error } = await auth.supabase.from('leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
  const hub = await sendToHubspot(lead);
  await auth.supabase.from('leads').update({ hubspot_status: hub.status, ...(hub.id ? { hubspot_id: hub.id } : {}) }).eq('id', id);
  await auth.supabase.from('lead_events').insert({ lead_id: id, actor: auth.user.email, type: 'hubspot', detail: hub.status });
  return NextResponse.json(hub);
}
