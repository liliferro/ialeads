import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/serverAuth';
import { searchDenue } from '@/lib/denue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Proxy autenticado hacia la herramienta del DENUE (evita CORS y abuso anónimo).
export async function POST(request) {
  const auth = await requireMember(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }); }
  const allowed = ['estados', 'municipios', 'cp', 'sectores', 'actividades', 'nombre', 'estratos', 'conTelefono', 'conEmail', 'emailCorporativo', 'conWeb', 'pagina', 'porPagina', 'orden'];
  const params = {};
  for (const k of allowed) if (body[k] !== undefined) params[k] = body[k];
  params.porPagina = Math.min(Number(params.porPagina) || 50, 100);
  try {
    const r = await searchDenue(params);
    if (!r.ok) return NextResponse.json({ error: `La herramienta del DENUE respondió ${r.status}`, detail: r.detail }, { status: 502 });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: 'No se pudo consultar la herramienta del DENUE' }, { status: 502 });
  }
}
