'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePanel } from '../ctx';
import { CONTENT_STATUS, fmtDay } from '@/lib/shared';

export default function Contenido() {
  const { supabase, user } = usePanel();
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('content_pieces').select('*').order('created_at', { ascending: false });
    setRows(data || []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from('content_pieces').insert({ title: f.get('title'), target_query: f.get('target_query') || null, format: f.get('format') || null });
    if (error) return setMsg(error.message);
    e.target.reset();
    load();
  }

  async function setStatus(p, status) {
    const changes = { status };
    // Una persona aprueba todo lo que sale: queda registrado quién lo aprobó.
    if (status === 'aprobado') changes.approved_by = user.email;
    if (status === 'publicado') {
      if (!p.approved_by) return setMsg('No se puede publicar sin aprobación: pásalo primero a «aprobado».');
      if (!p.url) return setMsg('Agrega la URL publicada antes de marcarlo como publicado.');
      changes.published_at = new Date().toISOString().slice(0, 10);
    }
    setMsg('');
    await supabase.from('content_pieces').update(changes).eq('id', p.id);
    load();
  }

  return (
    <>
      <h1>Contenido SEO / GEO</h1>
      <p className="muted">Cola de piezas de la rama de visibilidad. Cada pieza apunta a una consulta y lleva a /cotizar.</p>
      <form className="card" onSubmit={add}>
        <div className="row">
          <div><label htmlFor="title">Título *</label><input id="title" name="title" required /></div>
          <div><label htmlFor="target_query">Consulta objetivo</label><input id="target_query" name="target_query" placeholder="lo que la gente busca o pregunta" /></div>
          <div>
            <label htmlFor="format">Formato</label>
            <select id="format" name="format" defaultValue="guia">
              <option value="guia">Guía</option><option value="comparativa">Comparativa</option><option value="ficha">Ficha de producto</option><option value="faq">Preguntas frecuentes</option><option value="caso">Caso de uso</option>
            </select>
          </div>
          <div className="fit"><button>Agregar</button></div>
        </div>
      </form>
      {msg && <div className="notice bad" role="alert">{msg}</div>}
      <div className="tablewrap">
        <table>
          <thead><tr><th>Pieza</th><th>Formato</th><th>Estado</th><th>URL publicada</th><th>Aprobó</th><th>Publicado</th><th></th></tr></thead>
          <tbody>
            {!rows && <tr><td colSpan={7} className="muted">Cargando…</td></tr>}
            {rows && rows.length === 0 && <tr><td colSpan={7} className="muted">Aún no hay piezas.</td></tr>}
            {rows?.map((p) => (
              <tr key={p.id}>
                <td><b>{p.title}</b><div className="muted small">{p.target_query}</div></td>
                <td>{p.format}</td>
                <td>
                  <select aria-label={`Estado de ${p.title}`} value={p.status} onChange={(e) => setStatus(p, e.target.value)}>
                    {CONTENT_STATUS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td><input aria-label={`URL de ${p.title}`} defaultValue={p.url || ''} placeholder="https://…" onBlur={async (e) => { if (e.target.value !== (p.url || '')) { await supabase.from('content_pieces').update({ url: e.target.value || null }).eq('id', p.id); load(); } }} /></td>
                <td className="small">{p.approved_by || '—'}</td>
                <td className="small">{p.published_at ? fmtDay(p.published_at + 'T12:00:00') : '—'}</td>
                <td><button className="danger sm" onClick={async () => { await supabase.from('content_pieces').delete().eq('id', p.id); load(); }}>Borrar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Para medir: enlaza cada pieza a <code>/cotizar?utm_source=blog&amp;utm_medium=organic&amp;utm_campaign=slug-de-la-pieza</code>. Las visitas que llegan desde asistentes de IA se marcan solas como GEO cuando el navegador envía el referente; no siempre lo envía, así que GEO queda subcontado.</p>
    </>
  );
}
