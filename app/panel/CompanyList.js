'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePanel } from './ctx';
import { COMPANY_STATUS, ESTRATOS, SEQUENCE, draftMessage, domainOf, fmtDay } from '@/lib/shared';

// Lista de cuentas de prospección con su secuencia. La app propone el borrador;
// el envío siempre lo hace una persona desde su propio correo o teléfono.
export default function CompanyList({ origin, refreshKey }) {
  const { supabase, settings } = usePanel();
  const [rows, setRows] = useState(null);
  const [supp, setSupp] = useState([]);
  const [open, setOpen] = useState(null);
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    let q = supabase.from('companies').select('*').contains('origins', [origin]).order('created_at', { ascending: false }).limit(500);
    if (status) q = q.eq('status', status);
    const [{ data }, { data: s }] = await Promise.all([q, supabase.from('suppressions').select('kind,value')]);
    setRows(data || []);
    setSupp(s || []);
  }, [supabase, origin, status]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const save = async (id, changes) => { await supabase.from('companies').update(changes).eq('id', id); load(); };
  const isSuppressed = (c) => supp.some((s) =>
    (s.kind === 'email' && c.email && s.value === c.email.toLowerCase()) ||
    (s.kind === 'dominio' && (s.value === c.domain || s.value === domainOf(c.email))) ||
    (s.kind === 'telefono' && c.phone && s.value === c.phone));

  async function optOut(c) {
    const items = [];
    if (c.email) items.push({ kind: 'email', value: c.email.toLowerCase(), reason: 'Pidió baja' });
    if (c.phone) items.push({ kind: 'telefono', value: c.phone, reason: 'Pidió baja' });
    if (items.length) await supabase.from('suppressions').upsert(items, { onConflict: 'kind,value', ignoreDuplicates: true });
    save(c.id, { status: 'descartada', discard_reason: 'Pidió baja', next_action_at: null });
  }

  function sequenceBlock(c) {
    if (!settings.outbound_legal_ok) return <div className="notice warn">Prospección bloqueada: falta el visto bueno del abogado. Se activa en Ajustes cuando lo tengas por escrito.</div>;
    if (isSuppressed(c)) return <div className="notice bad">Esta cuenta está en la lista de exclusión. No se le contacta.</div>;
    if (c.sequence_paused) return <div className="notice warn">Secuencia pausada: esta empresa ya escribió por un canal entrante. Atiéndela desde Leads.</div>;
    if (c.status === 'nueva') return <div className="notice">Verifica primero la cuenta (que exista, que el giro sea correcto y el contacto sea de la empresa) y cámbiala a «Verificada».</div>;
    if (['respondio', 'calificada', 'descartada'].includes(c.status)) return null;
    const next = SEQUENCE[c.seq_step];
    if (!next) return <div className="notice">Secuencia terminada sin respuesta. Decide si se descarta o se retoma más adelante.</div>;
    const text = draftMessage(next.step, c, settings);
    return (
      <>
        <p className="small"><b>Siguiente paso:</b> {next.label}</p>
        <pre className="draft">{text}</pre>
        <p className="small muted">Borrador. Revísalo, corrígelo y envíalo tú desde tu correo o teléfono; la app no envía nada. No incluyas normas ni certificaciones que no estén confirmadas.</p>
        <div className="row">
          <div className="fit"><button className="ghost sm" onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copiado' : 'Copiar borrador'}</button></div>
          <div className="fit"><button className="sm" onClick={() => save(c.id, { seq_step: c.seq_step + 1, status: 'en_secuencia', next_action_at: next.wait ? new Date(Date.now() + next.wait * 864e5).toISOString().slice(0, 10) : null })}>Ya lo envié / ya llamé</button></div>
          <div className="fit"><button className="ghost sm" onClick={() => save(c.id, { status: 'respondio', next_action_at: null })}>Respondió</button></div>
          <div className="fit"><button className="danger sm" onClick={() => optOut(c)}>Pidió baja</button></div>
        </div>
      </>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="row" style={{ margin: '10px 0' }}>
        <div className="fit">
          <label htmlFor={`st-${origin}`}>Estado</label>
          <select id={`st-${origin}`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(COMPANY_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Empresa</th><th>Giro</th><th>Personal</th><th>Ubicación</th><th>Encaje</th><th>Estado</th><th>Próxima acción</th><th></th></tr></thead>
          <tbody>
            {!rows && <tr><td colSpan={8} className="muted">Cargando…</td></tr>}
            {rows && rows.length === 0 && <tr><td colSpan={8} className="muted">Aún no hay cuentas de este origen.</td></tr>}
            {rows?.map((c) => (
              <FragmentRow key={c.id} c={c} open={open === c.id} toggle={() => setOpen(open === c.id ? null : c.id)} today={today} save={save} sequenceBlock={sequenceBlock} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FragmentRow({ c, open, toggle, today, save, sequenceBlock }) {
  const due = c.next_action_at && c.next_action_at <= today;
  const field = (key, label, type = 'text') => (
    <div>
      <label htmlFor={`${key}-${c.id}`}>{label}</label>
      <input id={`${key}-${c.id}`} type={type} defaultValue={c[key] || ''} onBlur={(e) => e.target.value !== (c[key] || '') && save(c.id, { [key]: e.target.value || null })} />
    </div>
  );
  return (
    <>
      <tr>
        <td><b>{c.name}</b>{c.origins.length > 1 && <div className="muted small">Orígenes: {c.origins.join(' + ')}</div>}</td>
        <td className="small">{c.giro || '—'}</td>
        <td>{c.estrato ? ESTRATOS[c.estrato] : '—'}</td>
        <td className="small">{[c.municipality, c.state].filter(Boolean).join(', ') || '—'}</td>
        <td>{c.fit ? <span className={`tag ${c.fit}`}>{c.fit}</span> : <span className="tag">Sin clasificar</span>}</td>
        <td>{COMPANY_STATUS[c.status]}</td>
        <td>{c.next_action_at ? <span className={due ? 'tag B' : ''}>{fmtDay(c.next_action_at + 'T12:00:00')}</span> : '—'}</td>
        <td><button className="ghost sm" aria-expanded={open} onClick={toggle}>{open ? 'Cerrar' : 'Abrir'}</button></td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} style={{ background: '#fbfaf7' }}>
            <div className="grid2">
              {field('contact_name', 'Contacto')}
              {field('contact_role', 'Puesto')}
              {field('email', 'Correo', 'email')}
              {field('phone', 'Teléfono', 'tel')}
              <div>
                <label htmlFor={`status-${c.id}`}>Estado</label>
                <select id={`status-${c.id}`} value={c.status} onChange={(e) => save(c.id, { status: e.target.value })}>
                  {Object.entries(COMPANY_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`fit-${c.id}`}>Encaje</label>
                <select id={`fit-${c.id}`} value={c.fit || ''} onChange={(e) => save(c.id, { fit: e.target.value || null })}>
                  <option value="">Sin clasificar</option>
                  {['A', 'B', 'C'].map((x) => <option key={x}>{x}</option>)}
                </select>
              </div>
              {field('discard_reason', 'Motivo de descarte')}
              {field('notes', 'Notas')}
            </div>
            <p className="small muted">
              {c.website && <>Sitio: <a href={/^https?:/.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer">{c.website}</a> · </>}
              {c.source_url && <>Fuente del dato: <a href={c.source_url} target="_blank" rel="noreferrer">{c.source_url}</a> · </>}
              {c.denue_id && <>DENUE: {c.denue_id}</>}
            </p>
            {sequenceBlock(c)}
          </td>
        </tr>
      )}
    </>
  );
}
