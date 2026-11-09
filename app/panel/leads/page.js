'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePanel } from '../ctx';
import { PageHead, Empty } from '@/components/ui';
import { SOURCES, ROUTES, LEAD_STATUS, fmtDate } from '@/lib/shared';

const COLS = [['nuevo', 'Nuevos'], ['en_contacto', 'En contacto'], ['calificado', 'Calificados'], ['oportunidad_aceptada', 'Oportunidad aceptada']];
const ago = (d) => {
  const h = (Date.now() - new Date(d)) / 36e5;
  return h < 1 ? 'hace minutos' : h < 24 ? `hace ${Math.round(h)} h` : `hace ${Math.round(h / 24)} d`;
};

export default function Leads() {
  const { supabase } = usePanel();
  const [view, setView] = useState('embudo');
  const [f, setF] = useState({ source: '', route: '', q: '' });
  const [rows, setRows] = useState(null);

  useEffect(() => {
    (async () => {
      let q = supabase.from('leads').select('id,created_at,name,company_name,source,fit,route,status,intent,first_response_at,hubspot_status,need').order('created_at', { ascending: false }).limit(400);
      for (const k of ['source', 'route']) if (f[k]) q = q.eq(k, f[k]);
      const { data } = await q;
      setRows(data || []);
    })();
  }, [supabase, f.source, f.route]);

  const term = f.q.trim().toLowerCase();
  const shown = (rows || []).filter((l) => !term || `${l.name} ${l.company_name || ''}`.toLowerCase().includes(term));
  const cerrados = shown.filter((l) => ['rechazado', 'descartado'].includes(l.status)).length;

  const fitTag = (l) => (l.fit ? <span className={`tag ${l.fit}`}>{l.fit === 'sin_coincidencia' ? 'Sin coincidencia' : `Encaje ${l.fit}`}</span> : null);

  return (
    <>
      <PageHead title="Leads" sub="Todo lo que entra, de cualquier fuente, ya clasificado y con su ruta.">
        <div className="seg" role="group" aria-label="Vista">
          <button aria-pressed={view === 'embudo'} onClick={() => setView('embudo')}>Embudo</button>
          <button aria-pressed={view === 'lista'} onClick={() => setView('lista')}>Lista</button>
        </div>
        <Link className="btn ghost" href="/cotizar" target="_blank">Abrir formulario</Link>
      </PageHead>

      <div className="row" style={{ marginBottom: 16 }}>
        <div><label htmlFor="q">Buscar</label><input id="q" placeholder="Persona o empresa" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
        <div>
          <label htmlFor="source">Fuente</label>
          <select id="source" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
            <option value="">Todas las fuentes</option>
            {Object.entries(SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="route">Ruta</label>
          <select id="route" value={f.route} onChange={(e) => setF({ ...f, route: e.target.value })}>
            <option value="">Todas las rutas</option>
            {Object.entries(ROUTES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {!rows && <p className="muted">Cargando…</p>}
      {rows && shown.length === 0 && <div className="card"><Empty title="No hay leads con estos filtros">Cuando alguien llene el formulario aparecerá aquí en segundos.</Empty></div>}

      {rows && shown.length > 0 && view === 'embudo' && (
        <>
          <div className="kanban">
            {COLS.map(([key, label]) => {
              const items = shown.filter((l) => l.status === key);
              return (
                <section className="kcol" key={key} aria-label={label}>
                  <h3><span>{label}</span><span>{items.length}</span></h3>
                  {items.map((l) => (
                    <Link className="kcard" key={l.id} href={`/panel/leads/${l.id}`}>
                      <div className="t">{l.company_name || l.name}</div>
                      <div className="muted small">{l.company_name ? l.name : 'Sin empresa'} · {ago(l.created_at)}</div>
                      <div className="meta">
                        {fitTag(l)}
                        <span className="tag info">{SOURCES[l.source]}</span>
                        {l.route && <span className="tag">{ROUTES[l.route]}</span>}
                        {!l.first_response_at && (l.source.startsWith('prospeccion') ? <span className="tag warn">Por contactar</span> : <span className="tag bad">Sin responder</span>)}
                      </div>
                    </Link>
                  ))}
                </section>
              );
            })}
          </div>
          {cerrados > 0 && <p className="muted small" style={{ marginTop: 10 }}>{cerrados} leads rechazados o descartados no se muestran en el embudo; están en la vista de lista.</p>}
        </>
      )}

      {rows && shown.length > 0 && view === 'lista' && (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Recibido</th><th>Persona / empresa</th><th>Fuente</th><th>Encaje</th><th>Ruta</th><th>Estado</th><th>Respuesta</th><th>HubSpot</th></tr></thead>
            <tbody>
              {shown.map((l) => (
                <tr key={l.id}>
                  <td>{fmtDate(l.created_at)}</td>
                  <td><Link href={`/panel/leads/${l.id}`}><b>{l.name}</b></Link><div className="muted small">{l.company_name || 'Sin empresa'}</div></td>
                  <td>{SOURCES[l.source]}</td>
                  <td>{fitTag(l) || '—'}</td>
                  <td>{ROUTES[l.route] || '—'}</td>
                  <td>{LEAD_STATUS[l.status]}</td>
                  <td>{l.first_response_at ? <span className="tag ok">Respondido</span> : <span className="tag bad">Pendiente</span>}</td>
                  <td className="small">{l.hubspot_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
