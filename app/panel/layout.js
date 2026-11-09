'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase';
import { Icon } from '@/components/ui';
import { PanelContext } from './ctx';

const NAV = [
  ['Resumen', [['/panel', 'Tablero', 'home'], ['/panel/leads', 'Leads', 'inbox']]],
  ['Fuentes', [
    ['/panel/cuentas', 'Prospección', 'target'],
    ['/panel/contenido', 'SEO y GEO', 'doc'],
    ['/panel/pauta', 'Pauta', 'ads'],
  ]],
  ['Configuración', [
    ['/panel/integraciones', 'Integraciones', 'plug'],
    ['/panel/exclusiones', 'Exclusiones', 'ban'],
    ['/panel/ajustes', 'Ajustes', 'gear'],
  ]],
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
  const hasDemo = useCallback(async () => {
    const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('is_demo', true);
    return (count || 0) > 0;
  }, [supabase]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/login');
      const settings = await loadSettings();
      const demo = settings ? await hasDemo() : false;
      if (alive) setState({ loading: false, user: data.session.user, settings, member: !!settings, demo });
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login');
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [supabase, router, loadSettings, hasDemo]);

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
    const [settings, demo] = await Promise.all([loadSettings(), hasDemo()]);
    setState((s) => ({ ...s, settings, demo }));
  };
  const authFetch = async (url, body) => {
    const { data } = await supabase.auth.getSession();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
      body: JSON.stringify(body || {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Error del servidor');
    return json;
  };
  const isOn = (href) => (href === '/panel' ? pathname === href : pathname.startsWith(href) || (href === '/panel/cuentas' && pathname.startsWith('/panel/web')));

  return (
    <PanelContext.Provider value={{ supabase, user: state.user, settings: state.settings, reloadSettings, authFetch }}>
      {state.demo && <div className="demo-banner" role="status">Modo demostración: hay datos de ejemplo cargados. Se borran en Ajustes.</div>}
      <div className="shell">
        <nav className="side" aria-label="Secciones">
          <div className="brand"><span className="logo">ia</span>ialeads</div>
          {NAV.map(([group, items]) => (
            <div key={group}>
              <div className="group">{group}</div>
              {items.map(([href, label, icon]) => (
                <Link key={href} href={href} className={isOn(href) ? 'on' : ''} aria-current={isOn(href) ? 'page' : undefined}>
                  <Icon name={icon} />{label}
                </Link>
              ))}
            </div>
          ))}
          <div className="foot">
            <div className="who">{state.settings.client_name}<br />{state.user.email}</div>
            <button className="sm" onClick={() => supabase.auth.signOut()}>Salir</button>
          </div>
        </nav>
        <main className="main">{children}</main>
      </div>
    </PanelContext.Provider>
  );
}
