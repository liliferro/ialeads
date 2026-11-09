'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePanel } from '../ctx';
import { SOURCES, ROUTES, LEAD_STATUS, fmtDate } from '@/lib/shared';

export default function Leads() {
  const { supabase } = usePanel();
  const [f, setF] = useState({ source: '', route: '', status: '' });
  const [rows, setRows] = useState(null);

  useEffect(() => {
    (async () => {
      let q = supabase.from('leads').select('id,created_at,name,company_name,source,fit,route,status,intent,first_response_at,hubspot_status').order('created_at', { ascending: false }).limit(300);
      for (const k of ['source', 'route', 'status']) if (f[k]) q = q.eq(k, f[k]);
      const { data } = await q;
      setRows(data || []);
    })();
  }, [supabase, f]);

  const sel = (key, label, options) => (
    <div>
      <label htmlFor={key}>{label}</label>
      <select id={key} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })}>
        <option value="">Todas</option>
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <h1>Leads</h1>
      <div className="row" style={{ marginBottom: 14 }}>
        {sel('source', 'Fuente', SOURCES)}
        {sel('route', 'Ruta', ROUTES)}
        {sel('status', 'Estado', LEAD_STATUS)}
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Recibido</th><th>Persona / empresa</th><th>Fuente</th><th>Encaje</th><th>Ruta</th><th>Estado</th><th>1.ª respuesta</th><th>HubSpot</th></tr></thead>
          <tbody>
            {!rows && <tr><td colSpan={8} className="muted">Cargando…</td></tr>}
            {rows && rows.length === 0 && <tr><td colSpan={8} className="muted">No hay leads con estos filtros.</td></tr>}
            {rows?.map((l) => (
              <tr key={l.id}>
                <td>{fmtDate(l.created_at)}</td>
                <td><Link href={`/panel/leads/${l.id}`}>{l.name}</Link><div className="muted small">{l.company_name || 'Sin empresa'}</div></td>
                <td>{SOURCES[l.source]}</td>
                <td>{l.fit ? <span className={`tag ${l.fit}`}>{l.fit === 'sin_coincidencia' ? 'Sin coincidencia' : l.fit}</span> : '—'}</td>
                <td>{ROUTES[l.route] || '—'}</td>
                <td>{LEAD_STATUS[l.status]}</td>
                <td>{l.first_response_at ? 'Sí' : <span className="tag B">Pendiente</span>}</td>
                <td className="small">{l.hubspot_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">«Sin coincidencia» en el DENUE nunca descarta un lead por sí sola: va a «Verificar» para que lo revise una persona.</p>
    </>
  );
}
