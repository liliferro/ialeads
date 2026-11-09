'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePanel } from '../ctx';
import CompanyList from '../CompanyList';
import { PageHead, Chips, SectorPicker, Icon, ProspectTabs } from '@/components/ui';
import { ESTADOS_MX, ESTRATOS, computeFit, domainOf } from '@/lib/shared';
import { sectorIdsFromScian, matchesSectors } from '@/lib/sectores';

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
  const [refreshKey, setRefreshKey] = useState(0);

  // Trae las cuentas de la base del DENUE, las clasifica y las guarda, todo en un paso.
  async function extraer(e) {
    e.preventDefault();
    setResult(null);
    const found = new Map();
    let sinCodigo = false;
    try {
      const paginas = Math.ceil(limite / 100);
      for (let pagina = 1; pagina <= paginas; pagina++) {
        setBusy(`Consultando la base… página ${pagina} de ${paginas}`);
        const r = await authFetch('/api/denue', {
          estados: estado ? [estado] : undefined,
          estratos: tam.length ? tam : undefined,
          ...Object.fromEntries(con.map((k) => [k, true])),
          pagina, porPagina: 100,
        });
        if (!r.items.length) break;
        if (r.items.every((i) => !i.scian)) sinCodigo = true;
        for (const i of r.items) found.set(i.denue_id || `${i.name}|${i.municipality}`, i);
        if (r.items.length < 100) break;
      }
      const todas = [...found.values()];
      const delSector = sinCodigo ? todas : todas.filter((c) => matchesSectors(c.scian, sectores));
      const rows = delSector
        .map((c) => ({
          name: c.name, legal_name: c.legal_name, denue_id: c.denue_id, scian: c.scian, giro: c.giro, estrato: c.estrato,
          state: c.state, municipality: c.municipality, phone: c.phone, email: c.email, website: c.website,
          domain: domainOf(c.website) || null, fit: computeFit(settings, c), origins: ['denue'],
        }))
        .filter((r) => !soloAB || ['A', 'B'].includes(r.fit));

      setBusy('Guardando cuentas…');
      const withId = rows.filter((r) => r.denue_id);
      const withoutId = rows.filter((r) => !r.denue_id);
      let error = null;
      if (withId.length) ({ error } = await supabase.from('companies').upsert(withId, { onConflict: 'denue_id', ignoreDuplicates: true }));
      if (!error && withoutId.length) ({ error } = await supabase.from('companies').insert(withoutId));
      if (error) throw new Error(error.message);
      const by = (f) => rows.filter((r) => r.fit === f).length;
      setResult({ ok: true, revisadas: todas.length, delSector: delSector.length, guardadas: rows.length, A: by('A'), B: by('B'), C: by('C'), sinCodigo });
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
            <label htmlFor="limite">Cuántas revisar</label>
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
          <button disabled={!!busy}><Icon name="bolt" />{busy || 'Extraer cuentas'}</button>
        </p>
      </form>

      {result && !result.ok && <div className="notice bad" role="alert">No se pudo extraer: {result.text}. Revisa la conexión en <Link href="/panel/integraciones">Integraciones</Link>.</div>}
      {result?.ok && (
        <div className="notice ok" role="status">
          Se revisaron <b>{result.revisadas}</b> empresas, <b>{result.delSector}</b> de los sectores elegidos. Se guardaron <b>{result.guardadas}</b>: {result.A} de encaje A, {result.B} de encaje B{result.C ? ` y ${result.C} de encaje C` : ''}. Las que ya existían no se duplicaron.
          {result.sinCodigo && <><br />Aviso: la herramienta no devolvió el código de actividad, así que no se pudo filtrar por sector.</>}
        </div>
      )}

      <h2>Cuentas en seguimiento</h2>
      <CompanyList origin="denue" refreshKey={refreshKey} />
    </>
  );
}
