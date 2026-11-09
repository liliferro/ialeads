'use client';

import { useState } from 'react';
import { usePanel } from '../ctx';
import CompanyList from '../CompanyList';
import { domainOf } from '@/lib/shared';

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',' || ch === ';' || ch === '\t') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] || '').trim()])));
}

const get = (o, keys) => { for (const k of keys) if (o[k]) return String(o[k]).trim(); return null; };

export default function Web() {
  const { supabase } = usePanel();
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function importar() {
    setMsg(null);
    let items;
    try {
      const t = text.trim();
      items = t.startsWith('[') || t.startsWith('{') ? [].concat(JSON.parse(t)) : parseCsv(t);
    } catch { return setMsg({ bad: true, text: 'No se pudo leer el contenido. Usa CSV con encabezados o un arreglo JSON.' }); }

    const parsed = items.map((o) => {
      const lower = Object.fromEntries(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v]));
      const website = get(lower, ['sitio', 'web', 'website', 'url', 'sitio_web']);
      const email = get(lower, ['correo', 'email']);
      return {
        name: get(lower, ['nombre', 'empresa', 'name', 'company']),
        website, email,
        phone: get(lower, ['telefono', 'teléfono', 'phone']),
        state: get(lower, ['estado', 'state']),
        municipality: get(lower, ['municipio', 'ciudad', 'city']),
        giro: get(lower, ['giro', 'actividad', 'descripcion', 'descripción']),
        source_url: get(lower, ['url_fuente', 'fuente', 'source_url', 'source']),
        domain: domainOf(website) || null,
        origins: ['web'],
      };
    });
    const valid = parsed.filter((r) => r.name && r.source_url);
    const sinFuente = parsed.length - valid.length;
    if (!valid.length) return setMsg({ bad: true, text: 'Ninguna fila trae nombre y url_fuente. La URL de donde salió el dato es obligatoria.' });

    // Fusión por empresa: si el dominio o el nombre ya existe, solo se le agrega el origen "web".
    const { data: existing } = await supabase.from('companies').select('id,name,domain,origins').limit(5000);
    const byDomain = new Map((existing || []).filter((c) => c.domain).map((c) => [c.domain, c]));
    const byName = new Map((existing || []).map((c) => [c.name.toLowerCase(), c]));
    const fresh = [];
    let merged = 0;
    const seen = new Set();
    for (const r of valid) {
      const key = r.domain || r.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const hit = (r.domain && byDomain.get(r.domain)) || byName.get(r.name.toLowerCase());
      if (hit) {
        if (!hit.origins.includes('web')) { await supabase.from('companies').update({ origins: [...hit.origins, 'web'], source_url: r.source_url }).eq('id', hit.id); merged++; }
      } else fresh.push(r);
    }
    const { error } = fresh.length ? await supabase.from('companies').insert(fresh) : { error: null };
    if (error) return setMsg({ bad: true, text: error.message });
    setMsg({ text: `${fresh.length} cuentas nuevas, ${merged} fusionadas con cuentas existentes${sinFuente ? `, ${sinFuente} filas omitidas por no traer nombre o url_fuente` : ''}.` });
    setText('');
    setRefreshKey((k) => k + 1);
  }

  return (
    <>
      <h1>Cuentas · origen web</h1>
      <p className="muted">Segundo origen de prospección: empresas halladas en la web pública (por ejemplo con ScrapeGraphAI). La extracción se corre fuera de la app; aquí se pega el resultado.</p>

      <div className="card">
        <label htmlFor="pega">Pega CSV o JSON</label>
        <textarea id="pega" style={{ minHeight: 140, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '.85rem' }} value={text} onChange={(e) => setText(e.target.value)} placeholder={'nombre,sitio,correo,telefono,estado,municipio,giro,url_fuente\nEmpaques del Norte,empaquesdelnorte.mx,ventas@empaquesdelnorte.mx,,Nuevo León,Monterrey,Fabricación de empaques,https://directorio.ejemplo/empaques'} />
        <p className="small muted">Columnas: <code>nombre</code> y <code>url_fuente</code> son obligatorias (hay que poder decir de dónde salió cada dato). Solo datos de contacto de la empresa publicados por ella misma; nada de correos personales ni datos de perfiles de redes.</p>
        {msg && <div className={`notice ${msg.bad ? 'bad' : 'ok'}`} role="status">{msg.text}</div>}
        <button disabled={!text.trim()} onClick={importar}>Importar</button>
      </div>

      <h2>Cuentas de origen web</h2>
      <p className="small muted">Entran como «Nueva» y sin encaje: una persona las verifica y las clasifica antes de cualquier contacto.</p>
      <CompanyList origin="web" refreshKey={refreshKey} />
    </>
  );
}
