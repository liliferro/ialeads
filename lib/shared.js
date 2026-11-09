// Catálogos y reglas compartidas entre el formulario, las rutas y el panel.

export const SOURCES = {
  seo: 'SEO',
  geo: 'GEO (asistentes de IA)',
  pauta_google: 'Pauta Google',
  pauta_chatgpt: 'Pauta ChatGPT',
  prospeccion_denue: 'Prospección DENUE',
  prospeccion_web: 'Prospección web',
  referido: 'Referido',
  directo: 'Directo',
  otro: 'Otro',
};

export const ROUTES = { vendedor: 'Vendedor', sdr: 'SDR', verificar: 'Verificar', menudeo: 'Menudeo', descartado: 'Descartado' };
export const LEAD_STATUS = {
  nuevo: 'Nuevo',
  en_contacto: 'En contacto',
  calificado: 'Calificado',
  oportunidad_aceptada: 'Oportunidad aceptada',
  rechazado: 'Rechazado por ventas',
  descartado: 'Descartado',
};
export const COMPANY_STATUS = {
  nueva: 'Nueva',
  verificada: 'Verificada',
  en_secuencia: 'En secuencia',
  respondio: 'Respondió',
  calificada: 'Calificada',
  descartada: 'Descartada',
};
export const CONTENT_STATUS = ['backlog', 'brief', 'borrador', 'revision', 'aprobado', 'publicado'];
export const ESTRATOS = { 1: '0–5', 2: '6–10', 3: '11–30', 4: '31–50', 5: '51–100', 6: '101–250', 7: '251+' };

export const ESTADOS_MX = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
  'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
  'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro',
  'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
  'Veracruz', 'Yucatán', 'Zacatecas',
];

const AI_HOSTS = /(chatgpt\.com|chat\.openai\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|claude\.ai)/i;
const SEARCH_HOSTS = /(google\.|bing\.com|duckduckgo\.com|yahoo\.)/i;

// Deduce la fuente del lead a partir de los parámetros de llegada. La fuente es obligatoria:
// si no hay señal, queda como "directo" en lugar de inventar un origen.
export function inferSource({ utm_source, utm_medium, gclid, referrer }) {
  const src = String(utm_source || '').toLowerCase();
  const med = String(utm_medium || '').toLowerCase();
  const ref = String(referrer || '');
  const paid = /(cpc|ppc|paid|ads|pauta)/.test(med);
  if (gclid || (paid && /google/.test(src))) return 'pauta_google';
  if (paid && /(chatgpt|openai)/.test(src)) return 'pauta_chatgpt';
  if (/denue/.test(src)) return 'prospeccion_denue';
  if (/(prospeccion|outbound|web_prospeccion)/.test(src)) return 'prospeccion_web';
  if (/(referido|referral)/.test(src) || /referido/.test(med)) return 'referido';
  if (AI_HOSTS.test(src) || AI_HOSTS.test(ref)) return 'geo';
  if (med === 'organic' || SEARCH_HOSTS.test(ref)) return 'seo';
  if (src) return 'otro';
  return 'directo';
}

// Misma regla que la función compute_fit de la base de datos.
export function computeFit(settings, { scian, estrato, state }) {
  if (!settings) return null;
  let pts = 0;
  const sc = settings.icp_scian || [];
  const st = settings.icp_states || [];
  if (!sc.length || sc.some((x) => String(scian || '').startsWith(x))) pts += 1;
  if (estrato && estrato >= settings.estrato_min && estrato <= settings.estrato_max) pts += 1;
  if (!st.length || st.some((x) => x.toLowerCase() === String(state || '').toLowerCase())) pts += 1;
  return pts === 3 ? 'A' : pts === 2 ? 'B' : 'C';
}

export function domainOf(value) {
  if (!value) return null;
  const s = String(value).trim().toLowerCase();
  const host = s.includes('@') ? s.split('@')[1] : s.replace(/^https?:\/\//, '').split('/')[0];
  const d = (host || '').replace(/^www\./, '');
  return d && d.includes('.') ? d : null;
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—');
export const fmtMoney = (n) => (n === null || n === undefined || Number.isNaN(n) ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n));

// Secuencia saliente: la app solo propone el borrador; una persona lo envía.
export const SEQUENCE = [
  { step: 1, label: 'Correo 1 · presentación', wait: 3 },
  { step: 2, label: 'Llamada de seguimiento', wait: 4 },
  { step: 3, label: 'Correo 2 · caso de uso', wait: 7 },
  { step: 4, label: 'Correo de cierre', wait: 0 },
];

export function draftMessage(step, company, settings) {
  const who = company.contact_name ? `Hola ${company.contact_name.split(' ')[0]}:` : 'Hola:';
  const cliente = settings?.client_name || '[cliente]';
  const linea = settings?.product_line || '[línea de producto]';
  const firma = settings?.sender_name || '[nombre de quien envía]';
  const baja = 'Si prefiere no recibir más mensajes, responda "baja" y lo retiramos de inmediato.';
  if (step === 2) {
    return `GUION DE LLAMADA\n\n1. Presentarse: ${firma}, de ${cliente}.\n2. Motivo: seguimiento al correo sobre ${linea}.\n3. Pregunta: ¿quién ve hoy las compras de este tipo de producto en ${company.name}?\n4. Si no es buen momento: pedir mejor horario o correo directo.\n5. Si pide no ser contactado: registrar la exclusión hoy mismo.`;
  }
  const bodies = {
    1: `Le escribo de ${cliente}. Trabajamos ${linea} para empresas como ${company.name}${company.giro ? ` (${company.giro.toLowerCase()})` : ''}.\n\n¿Es usted la persona indicada para ver este tema, o me puede orientar con quién hablar?`,
    3: `Retomo mi mensaje anterior. Con gusto le comparto opciones y tiempos de entrega de ${linea} para ${company.name}, sin compromiso.\n\n¿Le sirve una llamada de 15 minutos esta semana?`,
    4: `No quiero insistir de más: este es mi último mensaje. Si más adelante necesitan ${linea}, con gusto les cotizamos.`,
  };
  const subjects = { 1: `${linea} para ${company.name}`, 3: `Seguimiento: ${linea}`, 4: `Cierro el tema por ahora` };
  return `ASUNTO: ${subjects[step]}\n\n${who}\n\n${bodies[step]}\n\nSaludos,\n${firma}\n${cliente}\n\n${baja}`;
}
