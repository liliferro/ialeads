import { NextResponse } from 'next/server';
// The integrated demo never reaches the legacy pilot's database or integrations.
// Enabling legacy routes is a separate, deliberate deployment configuration.
export function middleware(request) {
  if(request.nextUrl.pathname.startsWith('/api/pilot/'))return NextResponse.next();
  if(process.env.MOOD_ENABLE_LEGACY==='1')return NextResponse.next();
  if(request.nextUrl.pathname.startsWith('/api/'))return NextResponse.json({error:'Las conexiones reales están desactivadas en esta demostración.'},{status:403});
  return NextResponse.redirect(new URL('/demo/resumen',request.url));
}
export const config={matcher:['/api/:path*','/panel/:path*','/cotizar','/login','/gracias','/aviso-de-privacidad']};
