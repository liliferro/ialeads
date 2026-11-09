'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePanel } from '../ctx';
import { PageHead, MultiSelect, Steps, Icon, Empty } from '@/components/ui';
import { ESTADOS_MX, ESTRATOS, computeFit, domainOf } from '@/lib/shared';
import { SECTORES, sectorIdsFromScian } from '@/lib/sectores';
import { giroFilters } from '@/lib/giro';

const TAM = Object.entries(ESTRATOS).map(([k, v]) => ({ id: Number(k), label: `${v} personas` }));
const CON = [{ id: 'conTelefono', label: 'Con teléfono' }, { id: 'conEmail', label: 'Con correo' }, { id: 'conWeb', label: 'Con sitio web' }];

export default function Encontrar() {
  const { supabase, settings, authFetch } = usePanel();
  const [tab, setTab] = useState('denue');
  const [sectores, setSectores] = useState(() => sectorIdsFromScian(settings.icp_scian));
  const [estado, setEstado] = useState(settings.icp_states?.[0] || '');
  const [tam, setTam] = useState(() => TAM.map((t) => t.id).filter((n) => n >= settings.estrato_min && n <= settings.estrato_max));
  const [con, setCon] = useState(['conTelefono']);
  const [limite, setLimite] = useState(100);
  const [urls, setUrls] = useState('');
  const [directorio, setDirectorio] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [mercado, setMercado] = useState(null);
  const [pend, setPend] = useState(null);
  const [supp, setSupp] = useState([]);
  const [pasados, setPasados] = useState(0);

  const load = useCallback(async () => {
    const [{ data }, { data: s }] = await Promise.all([
      supabase.from('companies').select('*').eq('status', 'nueva').order('created_at', { ascending: false }).limit(300),
      supabase.from('suppressions').select('kind,value'),
    ]);
    const orden = { A: 0, B: 1, C: 2 };
    setPend((data || []).sort((a, b) => (orden[a.fit] ?? 3) - (orden[b.fit] ?? 3)));
    setSupp(s || []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const filtros = () => ({ estados: estado ? [estado] : undefined, estratos: tam.length ? tam : undefined, ...Object.fromEntries(con.map((k) => [k, true])) });
  const grupos = () => (sectores.length ? SECTORES.filter((x) => sectores.includes(x.id)) : [{ id: 'todos', label: 'Todos los giros', scian: [] }]);
  const giro = (g) => {
    const { sectores: sec, actividades } = giroFilters(g.scian);
    return { ...(actividades.length ? { actividades } : {}), ...(sec.length ? { sectores: sec } : {}) };
  };

  async function dimensionar() {
    setMsg(null); setMercado(null);
    try {
      const out = [];
      for (const g of grupos()) {
        setBusy(`Contando: ${g.label}…`);
        const r = await authFetch('/api/denue', { ...filtros(), ...giro(g), porPagina: 1 });
        out.push({ label: g.label, total: Number(r.total) || 0 });
      }
      setMercado(out);
    } catch (err) { setMsg({ bad: true, text: `No se pudo consultar la base: ${err.message}` }); }
    setBusy('');
  }

  async function buscarDenue(e) {
    e.preventDefault();
    setMsg(null); setMercado(null);
    const found = new Map();
    try {
      const gs = grupos();
      const porGrupo = Math.max(100, Math.ceil(limite / gs.length / 100) * 100);
      for (const g of gs) {
        for (let pagina = 0; pagina < porGrupo / 100; pagina++) {
          setBusy(`Buscando: ${g.label}…`);
          const r = await authFetch('/api/denue', { ...filtros(), ...giro(g), pagina, porPagina: 100 });
          for (const i of r.items) {
            const key = i.denue_id || `${i.name}|${i.municipality}`;
            if (!found.has(key)) found.set(key, { ...i, scian: g.scian[0] || null });
          }
          if (!r.hayMas || !r.items.length) break;
        }
      }
      const rows = [...found.values()].map((c) => ({
        name: c.name, legal_name: c.legal_name, denue_id: c.denue_id, scian: c.scian, giro: c.giro, estrato: c.estrato,
        state: c.state, municipality: c.municipality, phone: c.phone, email: c.email, website: c.website,
        domain: domainOf(c.website) || null, fit: computeFit(settings, c), origins: ['denue'],
      }));
      setBusy('Guardando…');
      let error = null;
      for (let i = 0; i < rows.length && !error; i += 200) {
        ({ error } = await supabase.from('companies').upsert(rows.slice(i, i + 200), { onConflict: 'denue_id', ignoreDuplicates: true }));
      }
      if (error) throw new Error(error.message);
      setMsg({ text: rows.length ? `Se encontraron ${rows.length} empresas. Están abajo, listas para revisar.` : 'No hay empresas con esos filtros. Prueba quitando alguno.' });
      await load();
    } catch (err) { setMsg({ bad: true, text: `No se pudo buscar: ${err.message}` }); }
    setBusy('');
  }

  async function buscarWeb(e) {
    e.preventDefault();
    setMsg(null);
    let list = [...new Set(urls.split(/[\s,]+/).map((u) => u.trim()).filter(Boolean))].slice(0, 25);
    let ok = 0, fail = 0;
    try {
      if (directorio) {
        setBusy('Leyendo el directorio…');
        const d = await authFetch('/api/scrape', { url: list[0], mode: 'directorio' });
        list = d.links;
        if (!list.length) throw new Error('no se encontraron empresas enlazadas en esa página');
      }
      const { data: existing } = await supabase.from('companies').select('domain').not('domain', 'is', null).limit(5000);
      const known = new Set((existing || []).map((c) => c.domain));
      for (let i = 0; i < list.length; i++) {
        setBusy(`Leyendo sitio ${i + 1} de ${list.length}…`);
        try {
          const d = await authFetch('/api/scrape', { url: list[i] });
          const domain = domainOf(d.website);
          if (known.has(domain)) continue;
          const { error } = await supabase.from('companies').insert({ name: d.name, website: d.website, domain, email: d.email, phone: d.phone, giro: d.description || null, state: estado || null, source_url: d.source_url, origins: ['web'] });
          if (error) throw new Error(error.message);
          known.add(domain); ok++;
        } catch { fail++; }
      }
      setMsg({ text: `${ok} empresas agregadas${fail ? `; ${fail} sitios no se pudieron leer` : ''}. Están abajo, listas para revisar.` });
      setUrls('');
      await load();
    } catch (err) { setMsg({ bad: true, text: `No se pudo leer: ${err.message}` }); }
    setBusy('');
  }

  const bloqueada = (c) => supp.some((s) => (s.kind === 'email' && c.email && s.value === c.email.toLowerCase()) || (s.kind === 'dominio' && s.value === c.domain) || (s.kind === 'telefono' && c.phone && s.value === c.phone));

  // Pasa la empresa al embudo de leads: ahí se le da seguimiento.
  async function pasar(list) {
    const ok = list.filter((c) => !bloqueada(c));
    if (!ok.length) return;
    const leads = ok.map((c) => ({
      source: c.origins.includes('denue') ? 'prospeccion_denue' : 'prospeccion_web',
      name: c.contact_name || c.name, company_name: c.name, state: c.state, municipality: c.municipality,
      email: c.email, phone: c.phone, need: `Prospecto de salida${c.giro ? ` · ${c.giro}` : ''}`, intent: 'informacion',
      company_id: c.id, fit: c.fit || 'sin_coincidencia', route: 'sdr', status: 'nuevo', hubspot_status: 'pendiente', is_demo: c.is_demo || false,
    }));
    const { error } = await supabase.from('leads').insert(leads);
    if (error) return setMsg({ bad: true, text: error.message });
    await supabase.from('companies').update({ status: 'verificada' }).in('id', ok.map((c) => c.id));
    setPasados((n) => n + ok.length);
    setPend((p) => p.filter((c) => !ok.includes(c)));
  }
  async function descartar(c) {
    await supabase.from('companies').update({ status: 'descartada', discard_reason: 'Descartada en revisión' }).eq('id', c.id);
    setPend((p) => p.filter((x) => x.id !== c.id));
  }

  const buenas = (pend || []).filter((c) => ['A', 'B'].includes(c.fit) && !bloqueada(c));
  const paso = pasados ? 2 : pend?.length ? 1 : 0;

  return (
    <>
      <PageHead title="Encontrar empresas" sub="Busca empresas que encajan con tu cliente ideal y pásalas a Leads para darles seguimiento." />
      <Steps steps={['Busca', 'Revisa', 'Pasa a Leads']} current={paso} />

      <div className="card">
        <div className="cardhead">
          <h2><span className="stepnum">1</span>Busca empresas</h2>
          <div className="seg" role="group" aria-label="Dónde buscar">
            <button type="button" aria-pressed={tab === 'denue'} onClick={() => setTab('denue')}>En el directorio nacional</button>
            <button type="button" aria-pressed={tab === 'web'} onClick={() => setTab('web')}>En sitios web</button>
          </div>
        </div>

        {tab === 'denue' ? (
          <form onSubmit={buscarDenue}>
            <div className="grid2">
              <div><label htmlFor="sec">Sector</label><MultiSelect id="sec" options={SECTORES} value={sectores} onChange={setSectores} placeholder="Todos los sectores" unit="sectores" /></div>
              <div>
                <label htmlFor="estado">Estado</label>
                <select id="estado" value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todo el país</option>{ESTADOS_MX.map((s) => <option key={s}>{s}</option>)}</select>
              </div>
              <div><label htmlFor="tam">Tamaño</label><MultiSelect id="tam" options={TAM} value={tam} onChange={setTam} placeholder="Cualquier tamaño" unit="tamaños" /></div>
              <div><label htmlFor="con">Datos de contacto</label><MultiSelect id="con" options={CON} value={con} onChange={setCon} placeholder="No importa" unit="requisitos" /></div>
              <div>
                <label htmlFor="limite">Cuántas traer</label>
                <select id="limite" value={limite} onChange={(e) => setLimite(Number(e.target.value))}>{[100, 300, 500, 1000].map((n) => <option key={n} value={n}>Hasta {n}</option>)}</select>
              </div>
            </div>
            <p style={{ margin: '16px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button disabled={!!busy}><Icon name="search" />{busy || 'Buscar empresas'}</button>
              <button type="button" className="ghost" disabled={!!busy} onClick={dimensionar}>Ver cuántas hay</button>
            </p>
          </form>
        ) : (
          <form onSubmit={buscarWeb}>
            <label htmlFor="urls">{directorio ? 'Página del directorio o asociación' : 'Sitios de las empresas (uno por línea)'}</label>
            <textarea id="urls" value={urls} onChange={(e) => setUrls(e.target.value)} placeholder={directorio ? 'https://asociacion-ejemplo.mx/socios' : 'empresa-uno.com.mx\nempresa-dos.mx'} style={{ minHeight: directorio ? 44 : 96 }} />
            <label className="check" style={{ marginTop: 10 }}>
              <input type="checkbox" checked={directorio} onChange={(e) => setDirectorio(e.target.checked)} />
              <span>Es un directorio: traer todas las empresas enlazadas en esa página.</span>
            </label>
            <p style={{ margin: '14px 0 0' }}><button disabled={!!busy || !urls.trim()}><Icon name="globe" />{busy || 'Leer y agregar'}</button></p>
            <p className="small muted" style={{ margin: '10px 0 0' }}>La app lee cada sitio y toma el nombre y el contacto que la empresa publica. Nunca correos personales.</p>
          </form>
        )}
      </div>

      {msg && <div className={`notice ${msg.bad ? 'bad' : 'ok'}`} role="status">{msg.text}</div>}
      {mercado && (
        <div className="card">
          <h2>Empresas que existen con estos filtros</h2>
          <div className="bars">
            {mercado.map((m) => (
              <div className="bar" key={m.label}>
                <span>{m.label}</span>
                <div className="track"><div className="fill" style={{ width: `${(m.total / Math.max(1, ...mercado.map((x) => x.total))) * 100}%` }} /></div>
                <span className="v">{m.total.toLocaleString('es-MX')}</span>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>Fuente: INEGI, DENUE, vía Leads INEGI (Iron). Las clasificaciones son aproximadas.</p>
        </div>
      )}

      <div className="card">
        <div className="cardhead">
          <h2><span className="stepnum">2</span>Revisa y pasa a Leads {pend?.length ? <span className="tag" style={{ marginLeft: 8 }}>{pend.length} por revisar</span> : null}</h2>
          {buenas.length > 0 && <button onClick={() => pasar(buenas)}><Icon name="check" />Pasar a Leads las {buenas.length} de encaje A y B</button>}
        </div>
        {pasados > 0 && <div className="notice ok">{pasados} empresas pasaron a Leads. <Link href="/panel/leads"><b>Ir a Leads →</b></Link></div>}
        {!pend && <p className="muted">Cargando…</p>}
        {pend && pend.length === 0 && <Empty title="No hay empresas por revisar">Haz una búsqueda arriba y aparecerán aquí.</Empty>}
        <div className="plist">
          {pend?.slice(0, 60).map((c) => (
            <div className="prow" key={c.id}>
              <div>
                <div className="name line">{c.name}</div>
                <div className="muted small line">{c.giro || 'Giro sin clasificar'}</div>
              </div>
              <div className="small">
                <div className="line">{[c.municipality, c.state].filter(Boolean).join(', ') || 'Sin ubicación'}</div>
                <div className="muted">{c.estrato ? `${ESTRATOS[c.estrato]} personas` : 'Tamaño sin dato'}</div>
              </div>
              <div className="small">
                <div className="line">{c.phone || c.email || 'Sin contacto'}</div>
                <div className="muted line">{c.phone && c.email ? c.email : c.website || ''}</div>
              </div>
              <div className="acts">
                {c.fit ? <span className={`tag ${c.fit}`}>Encaje {c.fit}</span> : <span className="tag">Sin clasificar</span>}
                {bloqueada(c) ? <span className="tag bad">En exclusiones</span> : <button className="sm" onClick={() => pasar([c])}>Pasar a Leads</button>}
                <button className="ghost sm" onClick={() => descartar(c)}>Descartar</button>
              </div>
            </div>
          ))}
        </div>
        {pend?.length > 60 && <p className="small muted" style={{ marginTop: 10 }}>Se muestran las primeras 60, ordenadas por encaje. Al pasar o descartar aparecen las siguientes.</p>}
      </div>
    </>
  );
}
