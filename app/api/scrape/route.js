import { NextResponse } from 'next/server';
import { lookup } from 'node:dns/promises';
import { requireMember } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRIVATE = /^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|::1|f[cd]|fe80)/i;
const FREE_MAIL = /@(gmail|hotmail|outlook|yahoo|live|icloud|msn|prodigy)\./i;
const JUNK = /(sentry|wixpress|example|\.png|\.jpg|\.gif|\.webp|\.svg)/i;

// Solo páginas públicas: bloquea direcciones internas para que el extractor no pueda usarse contra la red privada.
async function safeUrl(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  if (!['http:', 'https:'].includes(u.protocol)) return null;
  if (u.hostname === 'localhost' || !u.hostname.includes('.')) return null;
  try {
    const addrs = await lookup(u.hostname, { all: true });
    if (addrs.some((a) => PRIVATE.test(a.address))) return null;
  } catch { return null; }
  return u;
}

const strip = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const meta = (html, name) => (html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')) || [])[1] || null;

async function grab(url) {
  let res;
  let current = url;
  // Sigue redirecciones a mano para revisar que ninguna apunte a una dirección interna.
  for (let hop = 0; hop < 4; hop++) {
    res = await fetch(current, { headers: { 'User-Agent': 'ialeads-extractor/1.0' }, redirect: 'manual', signal: AbortSignal.timeout(9000) });
    if (res.status < 300 || res.status >= 400) break;
    const next = await safeUrl(new URL(res.headers.get('location') || '', current).toString());
    if (!next) throw new Error('El sitio redirige a una dirección no permitida');
    current = next;
  }
  if (!res.ok) throw new Error(`El sitio respondió ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (!type.includes('html')) throw new Error('La dirección no es una página web');
  return (await res.text()).slice(0, 600000);
}

function extract(html, url) {
  const text = strip(html);
  const emails = [...new Set((html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []).map((e) => e.toLowerCase()))].filter((e) => !JUNK.test(e));
  // Solo correos del dominio de la empresa o genéricos de contacto: nada de correos personales.
  const host = url.hostname.replace(/^www\./, '');
  const corp = emails.filter((e) => e.endsWith(`@${host}`) || (!FREE_MAIL.test(e) && /^(ventas|contacto|info|hola|cotizaciones|compras|atencion)/.test(e)));
  const phones = [...new Set((text.match(/(?:\+?52[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)\d{3,4}[\s.-]?\d{4}/g) || []).map((p) => p.trim()))].filter((p) => p.replace(/\D/g, '').length >= 10).slice(0, 3);
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1];
  const name = (meta(html, 'og:site_name') || (title || '').split(/[|\-–—·]/)[0] || host).trim().slice(0, 120);
  return { name, description: (meta(html, 'description') || meta(html, 'og:description') || '').slice(0, 300), email: corp[0] || null, phone: phones[0] || null };
}

// Extrae los datos públicos de contacto de la página de una empresa (inicio + página de contacto).
export async function POST(request) {
  const auth = await requireMember(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { url: raw } = await request.json().catch(() => ({}));
  const url = await safeUrl(String(raw || '').trim());
  if (!url) return NextResponse.json({ error: 'Dirección no válida. Usa el sitio público de la empresa.' }, { status: 400 });
  try {
    const home = await grab(url);
    let data = extract(home, url);
    if (!data.email || !data.phone) {
      const link = (home.match(/href=["']([^"']*(?:contact|contacto)[^"']*)["']/i) || [])[1];
      if (link) {
        try {
          const cUrl = await safeUrl(new URL(link, url).toString());
          if (cUrl && cUrl.hostname === url.hostname) {
            const more = extract(await grab(cUrl), url);
            data = { ...data, email: data.email || more.email, phone: data.phone || more.phone };
          }
        } catch { /* la página de contacto no cargó */ }
      }
    }
    return NextResponse.json({ ...data, website: url.hostname.replace(/^www\./, ''), source_url: url.toString() });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'No se pudo leer el sitio' }, { status: 502 });
  }
}
