'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePanel } from '../ctx';
import { fmtDay, fmtMoney } from '@/lib/shared';

const LABEL = { pauta_google: 'Google Ads', pauta_chatgpt: 'ChatGPT Ads' };

export default function Pauta() {
  const { supabase } = usePanel();
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('ad_spend').select('*').order('day', { ascending: false }).limit(300);
    setRows(data || []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from('ad_spend').insert({
      day: f.get('day'), source: f.get('source'), campaign: f.get('campaign') || null,
      amount_mxn: Number(f.get('amount_mxn')), clicks: f.get('clicks') ? Number(f.get('clicks')) : null,
    });
    if (error) return setMsg({ bad: true, text: error.message });
    setMsg(null);
    e.target.reset();
    load();
  }

  // Retorno de calidad a Google Ads: solo leads con gclid que una persona marcó como calificados.
  async function exportConversions() {
    const { data } = await supabase.from('leads').select('gclid,status,created_at').not('gclid', 'is', null).in('status', ['calificado', 'oportunidad_aceptada']).limit(5000);
    if (!data?.length) return setMsg({ bad: true, text: 'No hay leads con gclid en estado calificado u oportunidad aceptada.' });
    const lines = ['Parameters:TimeZone=America/Mexico_City', 'Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency'];
    for (const l of data) {
      const t = new Date(l.created_at).toLocaleString('sv-SE', { timeZone: 'America/Mexico_City' });
      lines.push(`${l.gclid},${l.status === 'oportunidad_aceptada' ? 'Oportunidad aceptada' : 'Lead calificado'},${t},,MXN`);
    }
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `conversiones-google-ads-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ text: `${data.length} conversiones exportadas.` });
  }

  return (
    <>
      <h1>Pauta</h1>
      <p className="muted">Registra el gasto para que el tablero calcule el costo por oportunidad aceptada, y devuelve a Google Ads qué clics sí fueron buenos.</p>
      <form className="card" onSubmit={add}>
        <div className="row">
          <div><label htmlFor="day">Día *</label><input id="day" name="day" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          <div>
            <label htmlFor="source">Plataforma *</label>
            <select id="source" name="source">{Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
          <div><label htmlFor="campaign">Campaña</label><input id="campaign" name="campaign" /></div>
          <div><label htmlFor="amount_mxn">Gasto (MXN) *</label><input id="amount_mxn" name="amount_mxn" type="number" min="0" step="0.01" required /></div>
          <div><label htmlFor="clicks">Clics</label><input id="clicks" name="clicks" type="number" min="0" /></div>
          <div className="fit"><button>Registrar</button></div>
        </div>
      </form>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Retorno de calidad a Google Ads</h2>
        <p className="small">Descarga un CSV de conversiones sin conexión con los leads que llegaron con <code>gclid</code> y que el equipo marcó como calificados u oportunidad aceptada. Antes de subirlo, crea en Google Ads dos acciones de conversión de tipo importación con estos nombres exactos: «Lead calificado» y «Oportunidad aceptada».</p>
        <button className="ghost" onClick={exportConversions}>Descargar CSV de conversiones</button>
        <p className="small muted" style={{ marginTop: 10 }}>URLs de destino: Google Ads agrega el <code>gclid</code> solo si el etiquetado automático está activo. Para ChatGPT usa <code>/cotizar?utm_source=chatgpt&amp;utm_medium=cpc&amp;utm_campaign=nombre</code>.</p>
      </div>
      {msg && <div className={`notice ${msg.bad ? 'bad' : 'ok'}`} role="status">{msg.text}</div>}

      <div className="tablewrap">
        <table>
          <thead><tr><th>Día</th><th>Plataforma</th><th>Campaña</th><th className="num">Gasto</th><th className="num">Clics</th><th></th></tr></thead>
          <tbody>
            {!rows && <tr><td colSpan={6} className="muted">Cargando…</td></tr>}
            {rows && rows.length === 0 && <tr><td colSpan={6} className="muted">Aún no hay gasto registrado.</td></tr>}
            {rows?.map((r) => (
              <tr key={r.id}>
                <td>{fmtDay(r.day + 'T12:00:00')}</td><td>{LABEL[r.source]}</td><td>{r.campaign || '—'}</td>
                <td className="num">{fmtMoney(Number(r.amount_mxn))}</td><td className="num">{r.clicks ?? '—'}</td>
                <td><button className="danger sm" onClick={async () => { await supabase.from('ad_spend').delete().eq('id', r.id); load(); }}>Borrar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
