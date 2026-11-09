'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePanel } from '../ctx';
import { PageHead, Chips, SectorPicker } from '@/components/ui';
import { ESTADOS_MX, ESTRATOS } from '@/lib/shared';
import { sectorIdsFromScian, scianFromSectorIds } from '@/lib/sectores';
import { loadDemo, clearDemo } from '@/lib/demo';

const ESTADO_OPTS = ESTADOS_MX.map((e) => ({ id: e, label: e }));

export default function Ajustes() {
  const { supabase, settings, reloadSettings, user } = usePanel();
  const [s, setS] = useState({ ...settings });
  const [sectores, setSectores] = useState(() => sectorIdsFromScian(settings.icp_scian));
  const [emails, setEmails] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadEmails = useCallback(async () => {
    const { data } = await supabase.from('allowed_emails').select('*').order('created_at');
    setEmails(data || []);
  }, [supabase]);
  useEffect(() => { loadEmails(); }, [loadEmails]);

  async function save(e) {
    e.preventDefault();
    const { error } = await supabase.from('settings').update({
      client_name: s.client_name, product_line: s.product_line, sender_name: s.sender_name,
      icp_scian: scianFromSectorIds(sectores), icp_states: s.icp_states || [],
      estrato_min: Number(s.estrato_min), estrato_max: Number(s.estrato_max),
      cpl_max_mxn: s.cpl_max_mxn === '' || s.cpl_max_mxn === null ? null : Number(s.cpl_max_mxn),
      outbound_legal_ok: s.outbound_legal_ok, updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setMsg(error ? { bad: true, text: error.message } : { text: 'Ajustes guardados.' });
    if (!error) reloadSettings();
  }

  async function demo(action) {
    setBusy(true);
    try {
      if (action === 'load') { await clearDemo(supabase); const r = await loadDemo(supabase); setMsg({ text: `Datos de demostración cargados: ${r.leads} leads y ${r.companies} cuentas de ejemplo.` }); }
      else { await clearDemo(supabase); setMsg({ text: 'Datos de demostración borrados.' }); }
      await reloadSettings();
    } catch (err) { setMsg({ bad: true, text: err.message }); }
    setBusy(false);
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
      <PageHead title="Ajustes" sub="El cliente, a quién le vende y quién entra al panel." />
      {msg && <div className={`notice ${msg.bad ? 'bad' : 'ok'}`} role="status">{msg.text}</div>}

      <form onSubmit={save}>
        <div className="card">
          <h2>Cliente</h2>
          <div className="grid2">
            <div><label htmlFor="client_name">Nombre del cliente</label><input id="client_name" value={s.client_name} onChange={(e) => setS({ ...s, client_name: e.target.value })} /></div>
            <div><label htmlFor="product_line">Qué vende</label><input id="product_line" value={s.product_line} onChange={(e) => setS({ ...s, product_line: e.target.value })} placeholder="p. ej. pisos de hule" /></div>
            <div><label htmlFor="sender_name">Quién firma los mensajes</label><input id="sender_name" value={s.sender_name || ''} onChange={(e) => setS({ ...s, sender_name: e.target.value })} /></div>
            <div><label htmlFor="cpl">Tope de costo por lead (MXN)</label><input id="cpl" type="number" min="0" value={s.cpl_max_mxn ?? ''} onChange={(e) => setS({ ...s, cpl_max_mxn: e.target.value })} /></div>
          </div>
        </div>

        <div className="card">
          <h2>Cliente ideal</h2>
          <p className="small muted">La app califica cada empresa con tres criterios. Cumple los tres: encaje A. Dos: encaje B. Uno o ninguno: encaje C.</p>
          <label>1 · Sectores que compran</label>
          <SectorPicker value={sectores} onChange={setSectores} />
          <div className="grid2" style={{ marginTop: 6 }}>
            <div>
              <label htmlFor="emin">2 · Tamaño mínimo</label>
              <select id="emin" value={s.estrato_min} onChange={(e) => setS({ ...s, estrato_min: e.target.value })}>{Object.entries(ESTRATOS).map(([k, v]) => <option key={k} value={k}>{v} personas</option>)}</select>
            </div>
            <div>
              <label htmlFor="emax">Tamaño máximo</label>
              <select id="emax" value={s.estrato_max} onChange={(e) => setS({ ...s, estrato_max: e.target.value })}>{Object.entries(ESTRATOS).map(([k, v]) => <option key={k} value={k}>{v} personas</option>)}</select>
            </div>
          </div>
          <label>3 · Estados donde vende</label>
          <Chips options={ESTADO_OPTS} value={s.icp_states || []} onChange={(v) => setS({ ...s, icp_states: v })} label="Estados" />
          <p className="small muted" style={{ marginTop: 6 }}>Un criterio sin elegir se da por cumplido para todas las empresas.</p>
        </div>

        <div className="card">
          <h2>Candado legal de prospección</h2>
          <label className="check">
            <input type="checkbox" checked={!!s.outbound_legal_ok} onChange={(e) => setS({ ...s, outbound_legal_ok: e.target.checked })} />
            <span>Tengo por escrito el visto bueno del abogado para la prospección en frío. Mientras esté apagado, la app no muestra borradores de mensajes salientes.</span>
          </label>
        </div>
        <p><button>Guardar ajustes</button></p>
      </form>

      <div className="card">
        <h2>Datos de demostración</h2>
        <p className="small muted">Llena la app con empresas, leads, gasto y contenido de ejemplo para recorrerla completa frente a un cliente. Todo es inventado, queda marcado como demostración y se borra de un clic sin tocar los datos reales.</p>
        <div className="row">
          <div className="fit"><button type="button" disabled={busy} onClick={() => demo('load')}>{busy ? 'Trabajando…' : 'Cargar demostración'}</button></div>
          <div className="fit"><button type="button" className="danger" disabled={busy} onClick={() => demo('clear')}>Borrar demostración</button></div>
        </div>
      </div>

      <div className="card">
        <h2>Quién puede entrar</h2>
        <form className="row" onSubmit={addEmail}>
          <div><label htmlFor="email">Correo</label><input id="email" name="email" type="email" required /></div>
          <div className="fit"><label htmlFor="role">Rol</label><select id="role" name="role"><option value="mood">Mood</option><option value="cliente">Cliente</option></select></div>
          <div className="fit"><button>Dar acceso</button></div>
        </form>
        <table style={{ marginTop: 12 }}>
          <tbody>
            {emails.map((m) => (
              <tr key={m.email}>
                <td>{m.email}</td><td><span className="tag">{m.role}</span></td>
                <td style={{ textAlign: 'right' }}>{m.email.toLowerCase() !== user.email.toLowerCase() && <button className="danger sm" onClick={async () => { await supabase.from('allowed_emails').delete().eq('email', m.email); loadEmails(); }}>Quitar</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">La persona crea su contraseña en /login con ese mismo correo. Por ahora ambos roles ven lo mismo.</p>
      </div>
    </>
  );
}
