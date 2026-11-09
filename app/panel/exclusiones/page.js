'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePanel } from '../ctx';
import { fmtDay } from '@/lib/shared';

export default function Exclusiones() {
  const { supabase } = usePanel();
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('suppressions').select('*').order('created_at', { ascending: false });
    setRows(data || []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const kind = f.get('kind');
    let value = String(f.get('value')).trim();
    if (kind !== 'telefono') value = value.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
    const { error } = await supabase.from('suppressions').insert({ kind, value, reason: f.get('reason') || null });
    if (error) return setMsg(error.code === '23505' ? 'Ya estaba en la lista.' : error.message);
    setMsg('');
    e.target.reset();
    load();
  }

  return (
    <>
      <h1>Exclusiones</h1>
      <p className="muted">Quien pide no ser contactado entra aquí el mismo día. Las cuentas que coinciden quedan bloqueadas en la prospección.</p>
      <form className="card" onSubmit={add}>
        <div className="row">
          <div className="fit">
            <label htmlFor="kind">Tipo</label>
            <select id="kind" name="kind"><option value="email">Correo</option><option value="dominio">Dominio</option><option value="telefono">Teléfono</option></select>
          </div>
          <div><label htmlFor="value">Valor *</label><input id="value" name="value" required /></div>
          <div><label htmlFor="reason">Motivo</label><input id="reason" name="reason" placeholder="Pidió baja, cliente actual, competidor…" /></div>
          <div className="fit"><button>Agregar</button></div>
        </div>
        {msg && <div className="notice bad" role="alert">{msg}</div>}
      </form>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Tipo</th><th>Valor</th><th>Motivo</th><th>Desde</th><th></th></tr></thead>
          <tbody>
            {!rows && <tr><td colSpan={5} className="muted">Cargando…</td></tr>}
            {rows && rows.length === 0 && <tr><td colSpan={5} className="muted">Lista vacía.</td></tr>}
            {rows?.map((r) => (
              <tr key={r.id}>
                <td>{r.kind}</td><td>{r.value}</td><td>{r.reason || '—'}</td><td>{fmtDay(r.created_at)}</td>
                <td><button className="danger sm" onClick={async () => { await supabase.from('suppressions').delete().eq('id', r.id); load(); }}>Quitar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
