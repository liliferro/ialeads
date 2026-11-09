'use client';

import { useEffect, useState } from 'react';
import { usePanel } from './ctx';
import { SOURCES, fmtMoney } from '@/lib/shared';

const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmtHours = (h) => (h === null ? '—' : h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`);

export default function Tablero() {
  const { supabase, settings } = usePanel();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - days * 864e5).toISOString();
      const [{ data: leads }, { data: spend }] = await Promise.all([
        supabase.from('leads').select('source,status,route,fit,created_at,first_response_at').gte('created_at', since).limit(5000),
        supabase.from('ad_spend').select('source,amount_mxn').gte('day', since.slice(0, 10)).limit(5000),
      ]);
      setData({ leads: leads || [], spend: spend || [] });
    })();
  }, [supabase, days]);

  if (!data) return <p className="muted">Cargando…</p>;

  const rows = Object.keys(SOURCES).map((key) => {
    const ls = data.leads.filter((l) => l.source === key);
    const gasto = data.spend.filter((s) => s.source === key).reduce((a, s) => a + Number(s.amount_mxn), 0);
    const acept = ls.filter((l) => l.status === 'oportunidad_aceptada').length;
    const calif = ls.filter((l) => ['calificado', 'oportunidad_aceptada'].includes(l.status)).length;
    const paid = key.startsWith('pauta');
    return {
      key, total: ls.length, ab: ls.filter((l) => ['A', 'B'].includes(l.fit)).length, calif, acept, gasto, paid,
      costo: paid && acept ? gasto / acept : null,
      cpl: paid && ls.length ? gasto / ls.length : null,
    };
  }).filter((r) => r.total || r.gasto);

  const all = data.leads;
  const resp = all.filter((l) => l.first_response_at).map((l) => (new Date(l.first_response_at) - new Date(l.created_at)) / 36e5);
  const sinResp = all.filter((l) => !l.first_response_at && !['descartado'].includes(l.status)).length;
  const acept = all.filter((l) => l.status === 'oportunidad_aceptada').length;

  return (
    <>
      <div className="row" style={{ alignItems: 'center', marginBottom: 14 }}>
        <div><h1>Tablero · {settings.client_name}</h1><p className="muted small" style={{ margin: 0 }}>La métrica que manda: costo por oportunidad aceptada, por fuente.</p></div>
        <div className="fit">
          <select aria-label="Periodo" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
        </div>
      </div>

      <div className="tiles">
        <div className="tile"><div className="n">{all.length}</div><div className="l">Leads recibidos</div></div>
        <div className="tile"><div className="n">{acept}</div><div className="l">Oportunidades aceptadas</div></div>
        <div className="tile"><div className="n">{fmtHours(median(resp))}</div><div className="l">Mediana de primera respuesta</div></div>
        <div className="tile"><div className="n">{sinResp}</div><div className="l">Sin primera respuesta</div></div>
      </div>

      <div className="tablewrap">
        <table>
          <thead><tr><th>Fuente</th><th className="num">Leads</th><th className="num">Encaje A/B</th><th className="num">Calificados</th><th className="num">Oport. aceptadas</th><th className="num">Gasto</th><th className="num">Costo por lead</th><th className="num">Costo por oport. aceptada</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="muted">Aún no hay leads ni gasto en este periodo.</td></tr>}
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{SOURCES[r.key]}</td>
                <td className="num">{r.total}</td>
                <td className="num">{r.ab}</td>
                <td className="num">{r.calif}</td>
                <td className="num">{r.acept}</td>
                <td className="num">{r.paid ? fmtMoney(r.gasto) : '—'}</td>
                <td className="num">{fmtMoney(r.cpl)}{r.paid && settings.cpl_max_mxn && r.cpl > Number(settings.cpl_max_mxn) ? ' ⚠' : ''}</td>
                <td className="num">{r.paid ? (r.acept ? fmtMoney(r.costo) : 'sin oportunidades') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">El costo solo se calcula para pauta, donde hay gasto registrado. Las horas de trabajo de SEO/GEO y prospección no están en este tablero; para compararlas hay que sumarlas aparte. ⚠ = costo por lead arriba del tope definido en Ajustes.</p>
    </>
  );
}
