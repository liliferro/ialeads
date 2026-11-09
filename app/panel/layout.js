'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase';
import { PanelContext } from './ctx';

const NAV = [
  ['/panel', 'Tablero'],
  ['/panel/leads', 'Leads'],
  ['/panel/cuentas', 'Cuentas · DENUE'],
  ['/panel/web', 'Cuentas · Web'],
  ['/panel/contenido', 'Contenido SEO/GEO'],
  ['/panel/pauta', 'Pauta'],
  ['/panel/exclusiones', 'Exclusiones'],
  ['/panel/ajustes', 'Ajustes'],
];

export default function PanelLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getBrowserClient();
  const [state, setState] = useState({ loading: true });

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    return data;
  }, [supabase]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/login');
      const settings = await loadSettings();
      if (alive) setState({ loading: false, user: data.session.user, settings, member: !!settings });
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login');
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [supabase, router, loadSettings]);

  if (state.loading) return <main className="wrap"><p className="muted">Cargando…</p></main>;

  if (!state.member) {
    return (
      <main className="wrap">
        <h1>Sin acceso</h1>
        <p>La cuenta <b>{state.user.email}</b> no está en la lista de correos autorizados. Pide a un administrador que la agregue en Ajustes.</p>
        <button className="ghost" onClick={() => supabase.auth.signOut()}>Salir</button>
      </main>
    );
  }

  const reloadSettings = async () => {
    const settings = await loadSettings();
    setState((s) => ({ ...s, settings }));
  };
  const authFetch = async (url, body) => {
    const { data } = await supabase.auth.getSession();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Error del servidor');
    return json;
  };

  return (
    <PanelContext.Provider value={{ supabase, user: state.user, settings: state.settings, reloadSettings, authFetch }}>
      <div className="shell">
        <nav className="side" aria-label="Secciones">
          <div className="brand">ialeads</div>
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className={(href === '/panel' ? pathname === href : pathname.startsWith(href)) ? 'on' : ''}>{label}</Link>
          ))}
          <div className="who">{state.user.email}</div>
          <button className="sm" onClick={() => supabase.auth.signOut()}>Salir</button>
        </nav>
        <main className="main">{children}</main>
      </div>
    </PanelContext.Provider>
  );
}
