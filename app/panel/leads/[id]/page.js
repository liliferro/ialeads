'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { usePanel } from '../../ctx';
import { SOURCES, ROUTES, LEAD_STATUS, ESTRATOS, SEQUENCE, draftMessage, fmtDate } from '@/lib/shared';

export default function LeadDetail() {
  const { id } = useParams();
  const { supabase, user, authFetch, settings } = usePanel();
  const [company, setCompany] = useState(null);
  const [copied, setCopied] = useState(false);
  const [lead, setLead] = useState(null);
  const [events, setEvents] = useState([]);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [{ data: l }, { data: ev }] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id).maybeSingle(),
      supabase.from('lead_events').select('*').eq('lead_id', id).order('at', { ascending: false }),
    ]);
    setLead(l);
    if (l?.company_id) { const { data: c } = await supabase.from('companies').select('*').eq('id', l.company_id).maybeSingle(); setCompany(c); }
    setEvents(ev || []);
  }, [supabase, id]);
  useEffect(() => { load(); }, [load]);

  async function patch(changes, type, detail) {
    const { error } = await supabase.from('leads').update(changes).eq('id', id);
    if (error) return setMsg(error.message);
    await supabase.from('lead_events').insert({ lead_id: id, actor: user.email, type, detail });
    setMsg('');
    load();
  }

  if (lead === null) return <p className="muted">Cargando…</p>;
  if (!lead) return <p>Lead no encontrado. <Link href="/panel/leads">Volver</Link></p>;
  const m = lead.denue_match;

  return (
    <>
      <p className="small"><Link href="/panel/leads">← Leads</Link></p>
      <h1>{lead.name}</h1>
      <p className="muted">{lead.company_name || 'Sin empresa'} · {SOURCES[lead.source]} · recibido {fmtDate(lead.created_at)}</p>
      {msg && <div className="notice bad" role="alert">{msg}</div>}

      <div className="grid2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Solicitud</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{lead.need}</p>
          <p className="small">
            <b>Intención:</b> {lead.intent}<br />
            <b>Correo:</b> {lead.email || '—'}<br />
            <b>Teléfono:</b> {lead.phone || '—'}<br />
            <b>Prefiere:</b> {lead.preferred_channel || '—'}<br />
            <b>Ubicación:</b> {[lead.municipality, lead.state].filter(Boolean).join(', ') || '—'}
          </p>
          <p className="small">
            <b>Seguimiento comercial:</b> {lead.consent_followup ? 'autorizado' : 'NO autorizado'}<br />
            <b>WhatsApp:</b> {lead.consent_whatsapp ? 'autorizado' : 'NO autorizado'}
          </p>
          {!lead.consent_followup && <div className="notice warn">Solo respondió para esta solicitud: se le contesta la cotización, pero no entra a nutrición ni a secuencias.</div>}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Filtro</h2>
          <p>
            Encaje: <span className={`tag ${lead.fit || ''}`}>{lead.fit === 'sin_coincidencia' ? 'Sin coincidencia' : lead.fit || '—'}</span>{' '}
            Ruta: <span className="tag">{ROUTES[lead.route] || '—'}</span>
          </p>
          {m ? (
            <p className="small">
              <b>DENUE:</b> {m.legal_name || lead.company_name}<br />
              <b>Giro:</b> {m.giro || '—'} ({m.scian || 's/c'})<br />
              <b>Personal:</b> {m.estrato ? ESTRATOS[m.estrato] : '—'}<br />
              <b>Ubicación:</b> {[m.municipality, m.state].filter(Boolean).join(', ') || '—'}
            </p>
          ) : <p className="small muted">Sin coincidencia clara en el DENUE. Verifícalo a mano antes de decidir; no es motivo de descarte.</p>}
          <label htmlFor="fit">Corregir encaje</label>
          <select id="fit" value={lead.fit || ''} onChange={(e) => patch({ fit: e.target.value }, 'encaje', `Encaje → ${e.target.value}`)}>
            {['A', 'B', 'C', 'sin_coincidencia'].map((x) => <option key={x} value={x}>{x === 'sin_coincidencia' ? 'Sin coincidencia' : x}</option>)}
          </select>
          <label htmlFor="route">Ruta</label>
          <select id="route" value={lead.route || ''} onChange={(e) => patch({ route: e.target.value }, 'ruta', `Ruta → ${e.target.value}`)}>
            <option value="" disabled>—</option>
            {Object.entries(ROUTES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {lead.source.startsWith('prospeccion') && company && (() => {
        const next = SEQUENCE[company.seq_step];
        if (!settings.outbound_legal_ok) return <div className="notice warn">Mensajes de prospección bloqueados: falta activar en Ajustes el visto bueno del abogado.</div>;
        if (!next) return <div className="notice">Secuencia de contacto terminada. Decide si se descarta o se retoma más adelante.</div>;
        const text = draftMessage(next.step, company, settings);
        return (
          <div className="card">
            <h2>Siguiente paso: {next.label}</h2>
            <pre className="draft">{text}</pre>
            <p className="small muted">Borrador. Revísalo y envíalo desde tu correo o teléfono; la app todavía no envía mensajes.</p>
            <div className="row">
              <div className="fit"><button className="ghost" onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copiado' : 'Copiar mensaje'}</button></div>
              <div className="fit"><button onClick={async () => {
                await supabase.from('companies').update({ seq_step: company.seq_step + 1, status: 'en_secuencia' }).eq('id', company.id);
                await patch({ first_response_at: lead.first_response_at || new Date().toISOString(), status: lead.status === 'nuevo' ? 'en_contacto' : lead.status }, 'contacto', next.label);
              }}>Ya lo envié</button></div>
            </div>
          </div>
        );
      })()}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Gestión</h2>
        <div className="row">
          <div>
            <label htmlFor="status">Estado</label>
            <select id="status" value={lead.status} onChange={(e) => patch({ status: e.target.value }, 'estado', `Estado → ${e.target.value}`)}>
              {Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="assigned">Responsable</label>
            <input id="assigned" defaultValue={lead.assigned_to || ''} onBlur={(e) => e.target.value !== (lead.assigned_to || '') && patch({ assigned_to: e.target.value }, 'asignado', e.target.value)} />
          </div>
          <div>
            <label htmlFor="reason">Motivo (rechazo o descarte)</label>
            <input id="reason" defaultValue={lead.status_reason || ''} onBlur={(e) => e.target.value !== (lead.status_reason || '') && patch({ status_reason: e.target.value }, 'motivo', e.target.value)} />
          </div>
        </div>
        <p style={{ marginTop: 14 }}>
          {lead.first_response_at
            ? <span className="tag A">Primera respuesta: {fmtDate(lead.first_response_at)}</span>
            : <button onClick={() => patch({ first_response_at: new Date().toISOString(), status: lead.status === 'nuevo' ? 'en_contacto' : lead.status }, 'primera_respuesta', 'Marcada por una persona')}>Marcar primera respuesta enviada</button>}
        </p>
        <p className="small">
          <b>HubSpot:</b> {lead.hubspot_status}{lead.hubspot_id ? ` · contacto ${lead.hubspot_id}` : ''}{' '}
          {lead.hubspot_status !== 'enviado' && (
            <button className="ghost sm" onClick={async () => { try { const r = await authFetch('/api/hubspot', { id }); setMsg(r.status === 'sin_configurar' ? 'Falta HUBSPOT_ACCESS_TOKEN en Vercel.' : ''); load(); } catch (e) { setMsg(e.message); } }}>Enviar a HubSpot</button>
          )}
        </p>
        <p className="small muted">Atribución: utm_source={lead.utm_source || '—'} · utm_medium={lead.utm_medium || '—'} · campaña={lead.utm_campaign || '—'} · gclid={lead.gclid ? 'sí' : 'no'} · referente={lead.referrer || '—'}</p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Bitácora</h2>
        <div className="row">
          <div><input aria-label="Nota" placeholder="Agregar nota…" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="fit"><button disabled={!note.trim()} onClick={async () => { await supabase.from('lead_events').insert({ lead_id: id, actor: user.email, type: 'nota', detail: note.trim() }); setNote(''); load(); }}>Guardar</button></div>
        </div>
        <table style={{ marginTop: 10 }}>
          <tbody>
            {events.map((e) => <tr key={e.id}><td className="small muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.at)}</td><td className="small">{e.type}</td><td className="small">{e.detail}</td><td className="small muted">{e.actor}</td></tr>)}
          </tbody>
        </table>
      </div>
    </>
  );
}
