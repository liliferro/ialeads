import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/serverAuth';
import { callDenue, searchDenue } from '@/lib/denue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Estado real de cada conexión. No finge nada: una integración sin credenciales se reporta como pendiente.
export async function POST(request) {
  const auth = await requireMember(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { test } = await request.json().catch(() => ({}));

  if (test === 'denue') {
    try {
      const [catalog, sample] = await Promise.all([callDenue('listar_sectores_y_tamanos', {}), searchDenue({ porPagina: 2 })]);
      return NextResponse.json({
        ok: sample.ok,
        status: sample.status,
        campos: sample.sampleKeys,
        ejemplo: sample.items?.[0] || null,
        catalogo: catalog.ok ? JSON.stringify(catalog.json).slice(0, 1500) : `sin respuesta (${catalog.status})`,
      });
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'No se pudo conectar con la herramienta' });
    }
  }

  if (test === 'hubspot') {
    const token = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!token) return NextResponse.json({ ok: false, error: 'Falta HUBSPOT_ACCESS_TOKEN en Vercel' });
    try {
      const r = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
      return NextResponse.json({ ok: r.ok, status: r.status });
    } catch { return NextResponse.json({ ok: false, error: 'HubSpot no respondió' }); }
  }

  const has = (k) => Boolean(process.env[k]);
  return NextResponse.json({
    hubspot: has('HUBSPOT_ACCESS_TOKEN'),
    scrapegraph: has('SCRAPEGRAPH_API_KEY'),
    gmail: has('GOOGLE_CLIENT_ID') && has('GOOGLE_CLIENT_SECRET'),
    google_ads: has('GOOGLE_ADS_DEVELOPER_TOKEN'),
    search_console: has('GOOGLE_CLIENT_ID') && has('GOOGLE_CLIENT_SECRET'),
    whatsapp: has('WHATSAPP_ACCESS_TOKEN'),
  });
}
