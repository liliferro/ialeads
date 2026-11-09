'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePanel } from '../ctx';
import CompanyList from '../CompanyList';
import { PageHead, Chips, SectorPicker, Icon, ProspectTabs } from '@/components/ui';
import { ESTADOS_MX, ESTRATOS, computeFit, domainOf } from '@/lib/shared';
import { SECTORES, sectorIdsFromScian } from '@/lib/sectores';
import { giroFilters } from '@/lib/giro';

const TAM = Object.entries(ESTRATOS).map(([k, v]) => ({ id: Number(k), label: `${v} personas` }));
const CON = [{ id: 'conTelefono', label: 'Con teléfono' }, { id: 'conEmail', label: 'Con correo' }, { id: 'conWeb', label: 'Con sitio web' }];

export default function Cuentas() {
  const { supabase, settings, authFetch } = usePanel();
  const [sectores, setSectores] = useState(() => sectorIdsFromScian(settings.icp_scian));
  const [estado, setEstado] = useState(settings.icp_states?.[0] || '');
  const [tam, setTam] = useState(() => TAM.map((t) => t.id).filter((n) => n >= settings.estrato_min && n <= settings.estrato_max));
  const [con, setCon] = useState(['conTelefono']);
  const [limite, setLimite] = useState(100);
  const [soloAB, setSoloAB] = useState(true);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  const [mercado, setMercado] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const filtros = () => ({
    estados: estado ? [estado] : undefined,
    estratos: tam.length ? tam : undefined,
    ...Object.fromEntries(con.map((k) => [k, true])),
  });
  // La herramienta filtra por giro en la consulta: una consulta por cada sector elegido.
  const grupos = () => (sectores.length ? SECTORES.filter((x) => sectores.includes(x.id)) : [{ id: 'todos', label: 'Todos los giros', scian: [] }]);
  const giro = (g) => {
    const { sectores: sec, actividades } = giroFilters(g.scian);
    return { ...(actividades.length ? { actividades } : {}), ...(sec.length ? { sectores: sec } : {}) };
  };

  // Cuenta cuántas empresas hay con estos filtros, sin guardar nada.
  async function dimensionar() {
    setResult(null); setMercado(null);
    try {
      const out = [];
      for (const g of grupos()) {
        setBusy(`Contando: ${g.label}…`);
        const r = await authFetch('/api/denue', { ...filtros(), ...giro(g), porPagina: 1 });
        out.push({ label: g.label, total: Number(r.total) || 0 });
      }
      setMercado(out);
    } catch (err) { setResult({ ok: false, text: err.message }); }
    setBusy('');
  }

  // Trae las cuentas de la base del DENUE, las clasifica y las guarda, todo en un paso.
  async function extraer(e) {
    e.preventDefault();
    setResult(null);
    const found = new Map();
    try {
      const gs = grupos();
      const porGrupo = Math.max(100, Math.ceil(limite / gs.length / 100) * 100);
      for (const g of gs) {
        for (let pagina = 0; pagina < porGrupo / 100; pagina++) {
          setBusy(`Consultando: ${g.label}${pagina ? ` (página ${pagina + 1})` : ''}…`);
          const r = await authFetch('/api/denue', { ...filtros(), ...giro(g), pagina, porPagina: 100 });
          for (const i of r.items) {
            const key = i.denue_id || `${i.name}|${i.municipality}`;
            if (!found.has(key)) found.set(key, { ...i, scian: g.scian[0] || null });
          }
          if (!r.hayMas || !r.items.length) break;
        }
      }
      const todas = [...found.values()];
      const rows = todas
        .map((c) => ({
          name: c.name, legal_name: c.legal_name, denue_id: c.denue_id, scian: c.scian, giro: c.giro, estrato: c.estrato,
          state: c.state, municipality: c.municipality, phone: c.phone, email: c.email, website: c.website,
          domain: domainOf(c.website) || null, fit: computeFit(settings, c), origins: ['denue'],
        }))
        .filter((r) => !soloAB || ['A', 'B'].includes(r.fit));

      setBusy('Guardando cuentas…');
      let error = null;
      for (let i = 0; i < rows.length && !error; i += 200) {
        ({ error } = await supabase.from('companies').upsert(rows.slice(i, i + 200), { onConflict: 'denue_id', ignoreDuplicates: true }));
      }
      if (error) throw new Error(error.message);
      const by = (f) => rows.filter((r) => r.fit === f).length;
      setResult({ ok: true, revisadas: todas.length, guardadas: rows.length, A: by('A'), B: by('B'), C: by('C') });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setResult({ ok: false, text: err.message });
    }
    setBusy('');
  }

  return (
    <>
      <PageHead title="Prospección" sub="Elige a quién le quieres vender y la app trae, clasifica y guarda las cuentas.">
        <ProspectTabs active="denue" />
      </PageHead>

      <form className="card" onSubmit={extraer}>
        <h2>¿A quién buscamos?</h2>
        <label>Sectores</label>
        <SectorPicker value={sectores} onChange={setSectores} />
        <p className="small muted" style={{ marginTop: 6 }}>{sectores.length ? `${sectores.length} sectores elegidos.` : 'Sin elegir sector se traen todos los giros.'}</p>

        <div className="grid2">
          <div>
            <label htmlFor="estado">Estado</label>
            <select id="estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todo el país</option>
              {ESTADOS_MX.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="limite">Cuántas traer</label>
            <select id="limite" value={limite} onChange={(e) => setLimite(Number(e.target.value))}>
              {[100, 300, 500, 1000].map((n) => <option key={n} value={n}>Hasta {n} empresas</option>)}
            </select>
          </div>
        </div>

        <label>Tamaño de la empresa</label>
        <Chips options={TAM} value={tam} onChange={setTam} label="Tamaño" />
        <label>Solo empresas</label>
        <Chips options={CON} value={con} onChange={setCon} label="Datos de contacto" />

        <label className="check" style={{ marginTop: 14 }}>
          <input type="checkbox" checked={soloAB} onChange={(e) => setSoloAB(e.target.checked)} />
          <span>Guardar solo las de encaje A y B (las que mejor coinciden con tu cliente ideal).</span>
        </label>

        <p style={{ marginTop: 16, marginBottom: 0 }}>
          <button disabled={!!busy}><Icon name="bolt" />{busy || 'Extraer cuentas'}</button>{' '}
          <button type="button" className="ghost" disabled={!!busy} onClick={dimensionar}><Icon name="search" />Ver tamaño del mercado</button>
        </p>
      </form>

      {result && !result.ok && <div className="notice bad" role="alert">No se pudo extraer: {result.text}. Revisa la conexión en <Link href="/panel/integraciones">Integraciones</Link>.</div>}
      {mercado && (
        <div className="card">
          <h2>Tamaño del mercado con estos filtros</h2>
          <div className="bars">
            {mercado.map((m) => (
              <div className="bar" key={m.label}>
                <span>{m.label}</span>
                <div className="track"><div className="fill" style={{ width: `${(m.total / Math.max(1, ...mercado.map((x) => x.total))) * 100}%` }} /></div>
                <span className="v">{m.total.toLocaleString('es-MX')}</span>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>Empresas registradas en el DENUE. Fuente: INEGI, vía Leads INEGI (Iron); las clasificaciones son aproximadas.</p>
        </div>
      )}
      {result?.ok && (
        <div className="notice ok" role="status">
          Se encontraron <b>{result.revisadas}</b> empresas y se guardaron <b>{result.guardadas}</b>: {result.A} de encaje A, {result.B} de encaje B{result.C ? ` y ${result.C} de encaje C` : ''}. Las que ya existían no se duplicaron.
        </div>
      )}

      <h2>Cuentas en seguimiento</h2>
      <CompanyList origin="denue" refreshKey={refreshKey} />
    </>
  );
}
