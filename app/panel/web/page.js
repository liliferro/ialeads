'use client';

import { useState } from 'react';
import { usePanel } from '../ctx';
import CompanyList from '../CompanyList';
import { PageHead, Icon, ProspectTabs } from '@/components/ui';
import { ESTADOS_MX, domainOf } from '@/lib/shared';

export default function Web() {
  const { supabase, authFetch } = usePanel();
  const [urls, setUrls] = useState('');
  const [estado, setEstado] = useState('');
  const [busy, setBusy] = useState('');
  const [log, setLog] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Lee el sitio público de cada empresa, saca sus datos de contacto y la guarda como cuenta.
  async function extraer(e) {
    e.preventDefault();
    const list = [...new Set(urls.split(/[\s,]+/).map((u) => u.trim()).filter(Boolean))].slice(0, 25);
    if (!list.length) return;
    const out = [];
    const { data: existing } = await supabase.from('companies').select('id,domain,origins').not('domain', 'is', null).limit(5000);
    const byDomain = new Map((existing || []).map((c) => [c.domain, c]));
    for (let i = 0; i < list.length; i++) {
      setBusy(`Leyendo ${i + 1} de ${list.length}…`);
      try {
        const d = await authFetch('/api/scrape', { url: list[i] });
        const domain = domainOf(d.website);
        const hit = byDomain.get(domain);
        if (hit) {
          if (!hit.origins.includes('web')) await supabase.from('companies').update({ origins: [...hit.origins, 'web'], source_url: d.source_url }).eq('id', hit.id);
          out.push({ ok: true, name: d.name, note: 'Ya existía: se fusionó con la cuenta guardada' });
        } else {
          const { error } = await supabase.from('companies').insert({
            name: d.name, website: d.website, domain, email: d.email, phone: d.phone, giro: d.description || null,
            state: estado || null, source_url: d.source_url, origins: ['web'],
          });
          if (error) throw new Error(error.message);
          byDomain.set(domain, { origins: ['web'] });
          out.push({ ok: true, name: d.name, note: [d.email && 'correo', d.phone && 'teléfono'].filter(Boolean).join(' y ') || 'sin datos de contacto publicados' });
        }
      } catch (err) {
        out.push({ ok: false, name: list[i], note: err.message });
      }
      setLog([...out]);
    }
    setBusy('');
    setUrls('');
    setRefreshKey((k) => k + 1);
  }

  return (
    <>
      <PageHead title="Prospección" sub="Empresas que no están en el DENUE o están mal clasificadas: la app lee su sitio y saca el contacto.">
        <ProspectTabs active="web" />
      </PageHead>

      <form className="card" onSubmit={extraer}>
        <h2>Extraer de sitios web</h2>
        <label htmlFor="urls">Sitios de las empresas (uno por línea, hasta 25)</label>
        <textarea id="urls" value={urls} onChange={(e) => setUrls(e.target.value)} placeholder={'empresa-uno.com.mx\nwww.empresa-dos.mx'} />
        <div className="row">
          <div>
            <label htmlFor="estado">Estado (opcional)</label>
            <select id="estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Sin asignar</option>
              {ESTADOS_MX.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="fit"><button disabled={!!busy || !urls.trim()}><Icon name="globe" />{busy || 'Leer sitios y guardar'}</button></div>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>Solo toma el nombre, la descripción y el contacto que la propia empresa publica (correos del dominio de la empresa, nunca personales). Cada cuenta guarda la página de donde salió el dato.</p>
      </form>

      {log.length > 0 && (
        <div className="tablewrap" style={{ marginBottom: 16 }}>
          <table>
            <thead><tr><th>Empresa</th><th>Resultado</th></tr></thead>
            <tbody>
              {log.map((l, i) => <tr key={i}><td><b>{l.name}</b></td><td>{l.ok ? <span className="tag ok">Guardada</span> : <span className="tag bad">No se pudo</span>} <span className="small muted">{l.note}</span></td></tr>)}
            </tbody>
          </table>
        </div>
      )}

      <h2>Cuentas de origen web</h2>
      <p className="small muted">Entran como «Nueva» y sin encaje: una persona las revisa y clasifica antes de contactarlas.</p>
      <CompanyList origin="web" refreshKey={refreshKey} />
    </>
  );
}
