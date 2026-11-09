// Cliente de la herramienta del DENUE (leads.iron-ai.com).
// Forma de la respuesta verificada el 9 nov 2026:
//   { total, pagina, porPagina, hayMas, leads: [{ id, nombre, razon_social, actividad, sector,
//     estrato, entidad, municipio, telefono, email, email_corporativo, web, num_sucursales, ... }] }
// La respuesta NO trae el código SCIAN de 6 dígitos: el filtro por giro se hace en la consulta
// (parámetros `actividades` o `sectores`), no sobre el resultado. La paginación empieza en 0.

import { giroFilters } from './giro';

const BASE = process.env.DENUE_API_BASE || 'https://leads.iron-ai.com/api/agente';

const text = (v) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'object') return text(v.nombre ?? v.descripcion ?? v.name ?? v.codigo ?? null);
  return String(v).trim() || null;
};
const pick = (o, keys) => {
  for (const k of keys) {
    const v = text(o?.[k]);
    if (v) return v;
  }
  return null;
};

function estratoFromCount(n) {
  if (n <= 5) return 1;
  if (n <= 10) return 2;
  if (n <= 30) return 3;
  if (n <= 50) return 4;
  if (n <= 100) return 5;
  if (n <= 250) return 6;
  return 7;
}

export function estratoFrom(v) {
  if (v === undefined || v === null || v === '') return null;
  const s = String(typeof v === 'object' ? text(v) : v).trim();
  if (/^[1-7]$/.test(s)) return Number(s);
  const n = parseInt((s.match(/\d+/) || [])[0], 10);
  return Number.isNaN(n) ? null : estratoFromCount(n);
}

function findArray(json, depth = 0) {
  if (Array.isArray(json)) return json;
  if (!json || typeof json !== 'object' || depth > 3) return [];
  for (const k of ['resultados', 'results', 'leads', 'data', 'items', 'registros', 'rows', 'resultado']) {
    if (Array.isArray(json[k])) return json[k];
    if (json[k] && typeof json[k] === 'object') {
      const inner = findArray(json[k], depth + 1);
      if (inner.length) return inner;
    }
  }
  for (const v of Object.values(json)) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v;
  }
  return [];
}

export function normalizeRecord(r) {
  return {
    denue_id: pick(r, ['id', 'clee', 'denue_id', 'id_denue', 'idDenue']),
    name: pick(r, ['nombre', 'nom_estab', 'nombre_establecimiento', 'establecimiento', 'name', 'nombreComercial']),
    legal_name: pick(r, ['razon_social', 'raz_social', 'razonSocial']),
    scian: pick(r, ['codigo_act', 'codigo_actividad', 'codigoActividad', 'scian', 'clase_actividad_id', 'actividad_id', 'codigo']),
    giro: pick(r, ['actividad', 'nombre_act', 'clase_actividad', 'nombreActividad', 'giro', 'sector']),
    estrato: estratoFrom(r?.estrato ?? r?.per_ocu ?? r?.personal_ocupado ?? r?.empleados ?? r?.tamano),
    state: pick(r, ['estado', 'entidad', 'entidad_federativa', 'nom_ent']),
    municipality: pick(r, ['municipio', 'nom_mun']),
    phone: pick(r, ['telefono', 'tel', 'phone']),
    email: pick(r, ['email', 'correo', 'correoelec', 'correo_electronico']),
    sector2: pick(r, ['sector']),
    sucursales: Number(r?.num_sucursales) || null,
    email_corporativo: r?.email_corporativo === true,
    website: pick(r, ['web', 'sitio_web', 'sitioWeb', 'www', 'sitio', 'pagina_web', 'website']),
  };
}

export async function callDenue(tool, params) {
  const clean = {};
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && !v.length) continue;
    clean[k] = v;
  }
  const res = await fetch(`${BASE}/${tool}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(clean),
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  const body = await res.text();
  let json = null;
  try { json = JSON.parse(body); } catch { /* respuesta no JSON */ }
  return { ok: res.ok && json !== null, status: res.status, json, bodyPreview: json ? null : body.slice(0, 300) };
}

export async function searchDenue(params) {
  const r = await callDenue('buscar_leads', params);
  if (!r.ok) return { ok: false, status: r.status, items: [], sampleKeys: [], detail: r.bodyPreview };
  const raw = findArray(r.json);
  return {
    ok: true,
    status: r.status,
    items: raw.map(normalizeRecord).filter((x) => x.name),
    total: r.json?.total ?? raw.length,
    hayMas: r.json?.hayMas === true,
    avisos: r.json?.avisos || [],
    sampleKeys: raw[0] ? Object.keys(raw[0]) : Object.keys(r.json || {}),
  };
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(s\.?a\.?p?\.?i?\.?|de|c\.?v\.?|s\.? ?de ?r\.?l\.?|sociedad anonima|capital variable)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Busca la empresa de un lead entrante. Solo devuelve coincidencia cuando es clara;
// si hay duda, no asigna nada y el lead cae en "verificar" para que lo revise una persona.
export async function matchCompany(companyName, state, icp = []) {
  if (!companyName) return { match: null, confidence: null, candidates: 0 };
  let r = await searchDenue({ nombre: companyName, estados: state ? [state] : undefined, porPagina: 5 });
  if ((!r.ok || !r.items.length) && state) r = await searchDenue({ nombre: companyName, porPagina: 5 });
  if (!r.ok) return { match: null, confidence: null, candidates: 0, error: `DENUE respondió ${r.status}` };
  const target = norm(companyName);
  const exact = r.items.filter((i) => norm(i.name) === target || norm(i.legal_name) === target);
  let match = null;
  if (exact.length === 1) match = exact[0];
  else if (r.items.length === 1 && target.length >= 4 && (norm(r.items[0].name).includes(target) || target.includes(norm(r.items[0].name)))) match = r.items[0];
  if (!match) return { match: null, confidence: r.items.length ? 'dudosa' : null, candidates: r.items.length };

  // La respuesta no trae el código de giro: se pregunta de nuevo filtrando por los giros del
  // cliente ideal. Si la misma empresa aparece, pertenece a ellos.
  if (icp.length) {
    const { sectores, actividades } = giroFilters(icp);
    for (const [key, list] of [['actividades', actividades], ['sectores', sectores]]) {
      if (!list.length || match.scian) continue;
      try {
        const check = await searchDenue({ nombre: companyName, [key]: list, porPagina: 10 });
        if (check.ok && check.items.some((i) => i.denue_id === match.denue_id)) match = { ...match, scian: list[0] };
      } catch { /* sin verificación de giro */ }
    }
  }
  return { match, confidence: 'alta', candidates: r.items.length };
}
