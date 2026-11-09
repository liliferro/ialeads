'use client';

import { useState } from 'react';
import { usePanel } from '../ctx';
import CompanyList from '../CompanyList';
import { ESTADOS_MX, ESTRATOS, computeFit, domainOf } from '@/lib/shared';

export default function Cuentas() {
  const { supabase, settings, authFetch } = usePanel();
  const [q, setQ] = useState({ nombre: '', estado: settings.icp_states?.[0] || '', sectores: '', conTelefono: false, conEmail: false, conWeb: false });
  const [estratos, setEstratos] = useState(() => {
    const out = [];
    for (let i = settings.estrato_min; i <= settings.estrato_max; i++) out.push(i);
    return out;
  });
  const [res, setRes] = useState(null);
  const [picked, setPicked] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function search(e) {
    e.preventDefault();
    setBusy(true); setMsg(null); setRes(null); setPicked({});
    try {
      const r = await authFetch('/api/denue', {
        nombre: q.nombre || undefined,
        estados: q.estado ? [q.estado] : undefined,
        sectores: q.sectores ? q.sectores.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        estratos: estratos.length ? estratos : undefined,
        conTelefono: q.conTelefono || undefined,
        conEmail: q.conEmail || undefined,
        conWeb: q.conWeb || undefined,
        porPagina: 50,
      });
      setRes(r);
    } catch (err) {
      setMsg({ bad: true, text: err.message });
    }
    setBusy(false);
  }

  async function importPicked() {
    const chosen = res.items.filter((_, i) => picked[i]);
    const rows = chosen.map((c) => ({
      name: c.name, legal_name: c.legal_name, denue_id: c.denue_id, scian: c.scian, giro: c.giro, estrato: c.estrato,
      state: c.state, municipality: c.municipality, phone: c.phone, email: c.email, website: c.website,
      domain: domainOf(c.website) || null, fit: computeFit(settings, c), origins: ['denue'],
    }));
    const withId = rows.filter((r) => r.denue_id);
    const withoutId = rows.filter((r) => !r.denue_id);
    let error = null;
    if (withId.length) ({ error } = await supabase.from('companies').upsert(withId, { onConflict: 'denue_id', ignoreDuplicates: true }));
    if (!error && withoutId.length) ({ error } = await supabase.from('companies').insert(withoutId));
    setMsg(error ? { bad: true, text: error.message } : { text: `${rows.length} cuentas importadas (las que ya existían se omitieron).` });
    setPicked({});
    setRefreshKey((k) => k + 1);
  }

  const nPicked = Object.values(picked).filter(Boolean).length;

  return (
    <>
      <h1>Cuentas · origen DENUE</h1>
      <p className="muted">Busca en la herramienta del DENUE, importa las que encajan y dales seguimiento. Estas listas no se suben como audiencias de pauta.</p>

      <form className="card" onSubmit={search}>
        <div className="row">
          <div><label htmlFor="nombre">Nombre contiene</label><input id="nombre" value={q.nombre} onChange={(e) => setQ({ ...q, nombre: e.target.value })} /></div>
          <div>
            <label htmlFor="estado">Estado</label>
            <select id="estado" value={q.estado} onChange={(e) => setQ({ ...q, estado: e.target.value })}>
              <option value="">Todos</option>
              {ESTADOS_MX.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label htmlFor="sectores">Sectores (separados por coma)</label><input id="sectores" value={q.sectores} onChange={(e) => setQ({ ...q, sectores: e.target.value })} placeholder="como los nombra la herramienta" /></div>
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: '12px 0 0' }}>
          <legend style={{ fontWeight: 600, fontSize: '.88rem' }}>Personal ocupado</legend>
          <div className="row" style={{ gap: 4 }}>
            {Object.entries(ESTRATOS).map(([k, v]) => (
              <label key={k} className="check fit" style={{ margin: '6px 10px 0 0' }}>
                <input type="checkbox" checked={estratos.includes(Number(k))} onChange={(e) => setEstratos(e.target.checked ? [...estratos, Number(k)].sort() : estratos.filter((x) => x !== Number(k)))} />{v}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="row" style={{ gap: 4, marginTop: 8 }}>
          {[['conTelefono', 'Con teléfono'], ['conEmail', 'Con correo'], ['conWeb', 'Con sitio web']].map(([k, l]) => (
            <label key={k} className="check fit" style={{ margin: '6px 14px 0 0' }}><input type="checkbox" checked={q[k]} onChange={(e) => setQ({ ...q, [k]: e.target.checked })} />{l}</label>
          ))}
        </div>
        <p style={{ marginTop: 14 }}><button disabled={busy}>{busy ? 'Buscando…' : 'Buscar en DENUE'}</button></p>
      </form>

      {msg && <div className={`notice ${msg.bad ? 'bad' : 'ok'}`} role="status">{msg.text}</div>}

      {res && (
        <>
          <div className="row" style={{ alignItems: 'center' }}>
            <div><b>{res.items.length}</b> resultados mostrados{res.total ? ` de ${res.total}` : ''}</div>
            <div className="fit"><button disabled={!nPicked} onClick={importPicked}>Importar {nPicked || ''} seleccionadas</button></div>
          </div>
          <div className="tablewrap" style={{ margin: '10px 0' }}>
            <table>
              <thead><tr><th><input type="checkbox" aria-label="Seleccionar todas" onChange={(e) => setPicked(e.target.checked ? Object.fromEntries(res.items.map((_, i) => [i, true])) : {})} /></th><th>Empresa</th><th>Giro</th><th>Personal</th><th>Ubicación</th><th>Contacto</th><th>Encaje</th></tr></thead>
              <tbody>
                {res.items.length === 0 && <tr><td colSpan={7} className="muted">Sin resultados con estos filtros.</td></tr>}
                {res.items.map((c, i) => {
                  const fit = computeFit(settings, c);
                  return (
                    <tr key={i}>
                      <td><input type="checkbox" aria-label={`Seleccionar ${c.name}`} checked={!!picked[i]} onChange={(e) => setPicked({ ...picked, [i]: e.target.checked })} /></td>
                      <td><b>{c.name}</b>{c.legal_name && <div className="muted small">{c.legal_name}</div>}</td>
                      <td className="small">{c.giro || '—'}</td>
                      <td>{c.estrato ? ESTRATOS[c.estrato] : '—'}</td>
                      <td className="small">{[c.municipality, c.state].filter(Boolean).join(', ') || '—'}</td>
                      <td className="small">{[c.phone && 'tel', c.email && 'correo', c.website && 'web'].filter(Boolean).join(' · ') || 'sin datos'}</td>
                      <td><span className={`tag ${fit}`}>{fit}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <details className="small muted">
            <summary>Diagnóstico del mapeo de campos</summary>
            <p>Campos que devolvió la herramienta en el primer registro: <code>{res.sampleKeys?.join(', ') || '(ninguno)'}</code>. Si ves columnas vacías arriba que sí existen aquí, hay que ajustar <code>lib/denue.js</code>.</p>
          </details>
        </>
      )}

      <h2>Cuentas importadas</h2>
      <CompanyList origin="denue" refreshKey={refreshKey} />
    </>
  );
}
