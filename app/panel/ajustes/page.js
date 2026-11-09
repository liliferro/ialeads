'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePanel } from '../ctx';
import { ESTADOS_MX, ESTRATOS } from '@/lib/shared';

export default function Ajustes() {
  const { supabase, settings, reloadSettings, user } = usePanel();
  const [s, setS] = useState({ ...settings, icp_scian_text: (settings.icp_scian || []).join(', ') });
  const [emails, setEmails] = useState([]);
  const [msg, setMsg] = useState(null);

  const loadEmails = useCallback(async () => {
    const { data } = await supabase.from('allowed_emails').select('*').order('created_at');
    setEmails(data || []);
  }, [supabase]);
  useEffect(() => { loadEmails(); }, [loadEmails]);

  async function save(e) {
    e.preventDefault();
    const { error } = await supabase.from('settings').update({
      client_name: s.client_name, product_line: s.product_line, sender_name: s.sender_name,
      icp_scian: s.icp_scian_text.split(',').map((x) => x.trim()).filter(Boolean),
      icp_states: s.icp_states, estrato_min: Number(s.estrato_min), estrato_max: Number(s.estrato_max),
      cpl_max_mxn: s.cpl_max_mxn === '' || s.cpl_max_mxn === null ? null : Number(s.cpl_max_mxn),
      outbound_legal_ok: s.outbound_legal_ok, updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setMsg(error ? { bad: true, text: error.message } : { text: 'Ajustes guardados.' });
    if (!error) reloadSettings();
  }

  async function addEmail(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from('allowed_emails').insert({ email: String(f.get('email')).trim().toLowerCase(), role: f.get('role') });
    if (error) return setMsg({ bad: true, text: error.code === '23505' ? 'Ese correo ya tiene acceso.' : error.message });
    e.target.reset();
    loadEmails();
  }

  return (
    <>
      <h1>Ajustes</h1>
      {msg && <div className={`notice ${msg.bad ? 'bad' : 'ok'}`} role="status">{msg.text}</div>}
      <form className="card" onSubmit={save}>
        <h2 style={{ marginTop: 0 }}>Piloto</h2>
        <div className="grid2">
          <div><label htmlFor="client_name">Cliente</label><input id="client_name" value={s.client_name} onChange={(e) => setS({ ...s, client_name: e.target.value })} /></div>
          <div><label htmlFor="product_line">Línea de producto</label><input id="product_line" value={s.product_line} onChange={(e) => setS({ ...s, product_line: e.target.value })} /></div>
          <div><label htmlFor="sender_name">Quién firma los mensajes</label><input id="sender_name" value={s.sender_name || ''} onChange={(e) => setS({ ...s, sender_name: e.target.value })} /></div>
          <div><label htmlFor="cpl">Tope de costo por lead (MXN)</label><input id="cpl" type="number" min="0" value={s.cpl_max_mxn ?? ''} onChange={(e) => setS({ ...s, cpl_max_mxn: e.target.value })} /></div>
        </div>

        <h2>Cliente ideal (define el encaje A / B / C)</h2>
        <p className="small muted">Tres criterios: giro, tamaño y estado. Cumplir los tres = A, dos = B, uno o ninguno = C. Un criterio vacío se da por cumplido.</p>
        <label htmlFor="scian">Códigos SCIAN (prefijos, separados por coma)</label>
        <input id="scian" value={s.icp_scian_text} onChange={(e) => setS({ ...s, icp_scian_text: e.target.value })} placeholder="p. ej. 311, 312, 3261" />
        <div className="grid2">
          <div>
            <label htmlFor="emin">Personal mínimo</label>
            <select id="emin" value={s.estrato_min} onChange={(e) => setS({ ...s, estrato_min: e.target.value })}>{Object.entries(ESTRATOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
          <div>
            <label htmlFor="emax">Personal máximo</label>
            <select id="emax" value={s.estrato_max} onChange={(e) => setS({ ...s, estrato_max: e.target.value })}>{Object.entries(ESTRATOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
        </div>
        <label htmlFor="states">Estados objetivo (Ctrl/Cmd para elegir varios)</label>
        <select id="states" multiple size={6} value={s.icp_states || []} onChange={(e) => setS({ ...s, icp_states: [...e.target.selectedOptions].map((o) => o.value) })}>
          {ESTADOS_MX.map((x) => <option key={x}>{x}</option>)}
        </select>

        <h2>Candado legal de prospección</h2>
        <label className="check">
          <input type="checkbox" checked={!!s.outbound_legal_ok} onChange={(e) => setS({ ...s, outbound_legal_ok: e.target.checked })} />
          <span>Tengo por escrito el visto bueno del abogado para la prospección en frío. Mientras esté apagado, la app no muestra borradores de mensajes salientes.</span>
        </label>
        <p style={{ marginTop: 16 }}><button>Guardar ajustes</button></p>
      </form>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Quién puede entrar</h2>
        <form className="row" onSubmit={addEmail}>
          <div><label htmlFor="email">Correo</label><input id="email" name="email" type="email" required /></div>
          <div className="fit"><label htmlFor="role">Rol</label><select id="role" name="role"><option value="mood">Mood</option><option value="cliente">Cliente</option></select></div>
          <div className="fit"><button>Dar acceso</button></div>
        </form>
        <table style={{ marginTop: 12 }}>
          <tbody>
            {emails.map((m) => (
              <tr key={m.email}>
                <td>{m.email}</td><td>{m.role}</td>
                <td>{m.email.toLowerCase() !== user.email.toLowerCase() && <button className="danger sm" onClick={async () => { await supabase.from('allowed_emails').delete().eq('email', m.email); loadEmails(); }}>Quitar</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">La persona crea su contraseña en /login con ese mismo correo. Por ahora ambos roles ven lo mismo.</p>
      </div>
    </>
  );
}
