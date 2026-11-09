'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePanel } from './ctx';
import { PageHead, Empty } from '@/components/ui';
import { SOURCES, fmtMoney } from '@/lib/shared';

const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmtHours = (h) => (h === null ? '—' : h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`);
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');

export default function Tablero() {
  const { supabase, settings } = usePanel();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - days * 864e5).toISOString();
      const [{ data: leads }, { data: spend }, { count: cuentas }] = await Promise.all([
        supabase.from('leads').select('source,status,route,fit,created_at,first_response_at').gte('created_at', since).limit(5000),
        supabase.from('ad_spend').select('source,amount_mxn').gte('day', since.slice(0, 10)).limit(5000),
        supabase.from('companies').select('id', { count: 'exact', head: true }),
      ]);
      setData({ leads: leads || [], spend: spend || [], cuentas: cuentas || 0 });
    })();
  }, [supabase, days]);

  if (!data) return <p className="muted">Cargando…</p>;

  const all = data.leads;
  const rows = Object.keys(SOURCES).map((key) => {
    const ls = all.filter((l) => l.source === key);
    const gasto = data.spend.filter((s) => s.source === key).reduce((a, s) => a + Number(s.amount_mxn), 0);
    const acept = ls.filter((l) => l.status === 'oportunidad_aceptada').length;
    const calif = ls.filter((l) => ['calificado', 'oportunidad_aceptada'].includes(l.status)).length;
    const paid = key.startsWith('pauta');
    return { key, total: ls.length, ab: ls.filter((l) => ['A', 'B'].includes(l.fit)).length, calif, acept, gasto, paid, costo: paid && acept ? gasto / acept : null, cpl: paid && ls.length ? gasto / ls.length : null };
  }).filter((r) => r.total || r.gasto).sort((a, b) => b.total - a.total);

  const resp = all.filter((l) => l.first_response_at).map((l) => (new Date(l.first_response_at) - new Date(l.created_at)) / 36e5);
  const sinResp = all.filter((l) => !l.first_response_at && l.status !== 'descartado').length;
  const ab = all.filter((l) => ['A', 'B'].includes(l.fit)).length;
  const calif = all.filter((l) => ['calificado', 'oportunidad_aceptada'].includes(l.status)).length;
  const acept = all.filter((l) => l.status === 'oportunidad_aceptada').length;
  const gastoTotal = data.spend.reduce((a, s) => a + Number(s.amount_mxn), 0);
  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <>
      <PageHead title={`Tablero · ${settings.client_name}`} sub="Qué fuente trae oportunidades reales y cuánto cuesta cada una.">
        <div className="seg" role="group" aria-label="Periodo">
          {[7, 30, 90].map((d) => <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>{d} días</button>)}
        </div>
      </PageHead>

      {all.length === 0 && data.cuentas === 0 && (
        <div className="notice info">
          Aún no hay datos. Para recorrer la app completa, carga los datos de demostración en <Link href="/panel/ajustes">Ajustes</Link>, o empieza por definir tu cliente ideal y extraer cuentas en <Link href="/panel/cuentas">Prospección</Link>.
        </div>
      )}

      <div className="tiles">
        <div className="tile"><div className="n">{all.length}</div><div className="l">Leads recibidos</div></div>
        <div className="tile"><div className="n">{acept}</div><div className="l">Oportunidades aceptadas</div></div>
        <div className="tile"><div className="n">{acept && gastoTotal ? fmtMoney(gastoTotal / acept) : '—'}</div><div className="l">Gasto de pauta por oportunidad</div></div>
        <div className="tile"><div className="n">{fmtHours(median(resp))}</div><div className="l">Mediana de primera respuesta</div></div>
        <div className="tile"><div className="n" style={{ color: sinResp ? 'var(--bad)' : undefined }}>{sinResp}</div><div className="l">Sin responder</div></div>
      </div>

      <div className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        <div className="card">
          <h2>Embudo</h2>
          <div className="funnel">
            <div className="step"><b>{all.length}</b><span>Leads</span><em>100%</em></div>
            <div className="step"><b>{ab}</b><span>Con encaje A/B</span><em>{pct(ab, all.length)}</em></div>
            <div className="step"><b>{calif}</b><span>Calificados</span><em>{pct(calif, all.length)}</em></div>
            <div className="step"><b>{acept}</b><span>Oport. aceptadas</span><em>{pct(acept, all.length)}</em></div>
          </div>
        </div>
        <div className="card">
          <h2>Leads por fuente</h2>
          {rows.length === 0 ? <Empty title="Sin leads en este periodo" /> : (
            <div className="bars">
              {rows.filter((r) => r.total).map((r) => (
                <div className="bar" key={r.key} title={`${SOURCES[r.key]}: ${r.total} leads, ${r.acept} oportunidades aceptadas`}>
                  <span>{SOURCES[r.key]}</span>
                  <div className="track"><div className="fill" style={{ width: `${(r.total / max) * 100}%` }} /></div>
                  <span className="v">{r.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="tablewrap">
        <table>
          <thead><tr><th>Fuente</th><th className="num">Leads</th><th className="num">Encaje A/B</th><th className="num">Calificados</th><th className="num">Oport. aceptadas</th><th className="num">Conversión</th><th className="num">Gasto</th><th className="num">Costo por lead</th><th className="num">Costo por oportunidad</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9} className="muted">Aún no hay leads ni gasto en este periodo.</td></tr>}
            {rows.map((r) => (
              <tr key={r.key}>
                <td><b>{SOURCES[r.key]}</b></td>
                <td className="num">{r.total}</td>
                <td className="num">{r.ab}</td>
                <td className="num">{r.calif}</td>
                <td className="num">{r.acept}</td>
                <td className="num">{pct(r.acept, r.total)}</td>
                <td className="num">{r.paid ? fmtMoney(r.gasto) : '—'}</td>
                <td className="num">{fmtMoney(r.cpl)}{r.paid && settings.cpl_max_mxn && r.cpl > Number(settings.cpl_max_mxn) ? <span className="tag bad" style={{ marginLeft: 6 }}>sobre tope</span> : null}</td>
                <td className="num">{r.paid ? (r.acept ? fmtMoney(r.costo) : 'sin oportunidades') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>El costo solo se calcula para pauta, donde hay gasto registrado. Las horas de trabajo de SEO/GEO y prospección no están incluidas.</p>
    </>
  );
}
