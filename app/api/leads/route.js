import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase';
import { matchCompany } from '@/lib/denue';
import { sendToHubspot } from '@/lib/hubspot';
import { inferSource } from '@/lib/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Captura pública: guarda el lead, lo filtra contra el DENUE y lo envía a HubSpot.
// El encaje y la ruta se calculan dentro de la base de datos, no aquí.
export async function POST(request) {
  let p;
  try { p = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }); }
  if (p.website) return NextResponse.json({ ok: true }); // trampa para bots

  const supabase = serverClient();
  const source = inferSource(p);
  const { data: created, error } = await supabase.rpc('submit_lead', { p: { ...p, source } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Filtro con DENUE. Si la herramienta falla, el lead no se pierde: cae en "verificar".
  let found = { match: null, confidence: null };
  try { found = await matchCompany(p.company_name, p.state); } catch { /* DENUE no disponible */ }
  const { data: enriched } = await supabase.rpc('enrich_lead', {
    p_id: created.id,
    p_token: created.token,
    p: { match: found.match, confidence: found.confidence },
  });

  const hub = await sendToHubspot({ ...p, source, fit: enriched?.fit, route: enriched?.route });
  await supabase.rpc('enrich_lead', {
    p_id: created.id,
    p_token: created.token,
    p: { hubspot_status: hub.status, ...(hub.id ? { hubspot_id: hub.id } : {}) },
  });

  return NextResponse.json({ ok: true });
}
