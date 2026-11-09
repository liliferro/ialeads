// Datos de demostración para recorrer la app completa frente a un cliente.
// Todo lo que se inserta lleva is_demo = true y se borra de un clic en Ajustes.
// Son empresas y personas inventadas: no usar como datos reales.

const day = (n) => new Date(Date.now() - n * 864e5);

const EMPRESAS = [
  ['Gimnasio Titán Fitness', '713943', 'Centros de acondicionamiento físico', 3, 'Jalisco', 'Guadalajara', 'A'],
  ['Club Deportivo Las Águilas', '713941', 'Clubes deportivos', 5, 'Nuevo León', 'Monterrey', 'A'],
  ['Autopartes del Bajío', '336390', 'Fabricación de autopartes', 6, 'Guanajuato', 'Silao', 'A'],
  ['Empaques y Cartón del Norte', '322210', 'Fabricación de envases de cartón', 5, 'Nuevo León', 'Apodaca', 'A'],
  ['Alimentos La Hacienda', '311990', 'Elaboración de alimentos', 5, 'Jalisco', 'Zapopan', 'A'],
  ['Centro Logístico Querétaro', '493111', 'Almacenes generales de depósito', 4, 'Querétaro', 'El Marqués', 'B'],
  ['Maquinados Industriales RG', '332710', 'Maquinado de piezas metálicas', 4, 'Querétaro', 'Querétaro', 'B'],
  ['Academia de Box Guerrero', '611621', 'Escuelas de deporte', 2, 'Ciudad de México', 'Iztapalapa', 'B'],
  ['Plásticos Técnicos de Occidente', '326199', 'Fabricación de productos de plástico', 6, 'Jalisco', 'El Salto', 'A'],
  ['Taller Automotriz Hermanos Ruiz', '811111', 'Reparación mecánica de automóviles', 2, 'Puebla', 'Puebla', 'C'],
  ['Bebidas Refrescantes del Golfo', '312111', 'Elaboración de refrescos', 7, 'Veracruz', 'Veracruz', 'B'],
  ['Colegio Montes Verdes', '611171', 'Escuelas de varios niveles', 4, 'México', 'Metepec', 'C'],
];

const PERSONAS = ['Mariana Ortiz', 'Jorge Salinas', 'Paola Méndez', 'Ricardo Luna', 'Fernanda Ríos', 'Héctor Vargas', 'Daniela Cruz', 'Luis Carrillo', 'Andrea Pineda', 'Óscar Benítez', 'Karla Treviño', 'Emilio Santos'];
const NECESIDADES = [
  'Cotización de piso para área de pesas, aproximadamente 180 m².',
  'Necesitamos tapetes antifatiga para línea de ensamble, 60 estaciones.',
  'Piso para zona de carga y pasillos de almacén, 400 m².',
  'Información de opciones para área de juegos infantiles.',
  'Cotización de loseta para sala de entrenamiento funcional, 90 m².',
  'Buscamos proveedor para renovar piso de producción, entrega en enero.',
];
const FUENTES = ['seo', 'seo', 'geo', 'pauta_google', 'pauta_google', 'pauta_google', 'pauta_chatgpt', 'prospeccion_denue', 'prospeccion_denue', 'prospeccion_web', 'referido', 'directo'];
const ESTADOS = ['nuevo', 'en_contacto', 'en_contacto', 'calificado', 'calificado', 'oportunidad_aceptada', 'oportunidad_aceptada', 'rechazado', 'nuevo', 'en_contacto', 'oportunidad_aceptada', 'descartado'];

export async function loadDemo(supabase) {
  const companies = EMPRESAS.map(([name, scian, giro, estrato, state, municipality, fit], i) => ({
    name: `${name} (demo)`, scian, giro, estrato, state, municipality, fit,
    origins: [i % 3 === 2 ? 'web' : 'denue'],
    source_url: i % 3 === 2 ? 'https://ejemplo.com/directorio' : null,
    status: ['nueva', 'verificada', 'en_secuencia', 'en_secuencia', 'respondio', 'calificada'][i % 6],
    seq_step: [0, 0, 1, 2, 2, 3][i % 6],
    contact_name: PERSONAS[i], contact_role: ['Compras', 'Gerente de planta', 'Dueño', 'Mantenimiento'][i % 4],
    email: `contacto${i + 1}@demo.ejemplo`, phone: `55 5000 00${String(10 + i)}`,
    next_action_at: [0, 0, 1, 2, 0, 0][i % 6] ? day(-[0, 0, 1, 2, 0, 0][i % 6]).toISOString().slice(0, 10) : null,
    is_demo: true,
  }));
  const { data: inserted, error: e1 } = await supabase.from('companies').insert(companies).select('id,name,fit,state,municipality');
  if (e1) throw e1;

  const leads = [];
  for (let i = 0; i < 28; i++) {
    const c = inserted[i % inserted.length];
    const source = FUENTES[i % FUENTES.length];
    const status = ESTADOS[(i * 5) % ESTADOS.length];
    const created = day(1 + ((i * 7) % 29));
    const sinEmpresa = i % 9 === 8;
    const fit = sinEmpresa ? 'sin_coincidencia' : c.fit;
    leads.push({
      created_at: created.toISOString(), source,
      utm_source: source.startsWith('pauta') ? (source === 'pauta_google' ? 'google' : 'chatgpt') : null,
      utm_medium: source.startsWith('pauta') ? 'cpc' : null,
      utm_campaign: source.startsWith('pauta') ? ['pisos-gimnasio', 'antifatiga-industrial'][i % 2] : null,
      gclid: source === 'pauta_google' ? `DEMO-gclid-${i}` : null,
      name: PERSONAS[i % PERSONAS.length], company_name: sinEmpresa ? null : c.name,
      state: c.state, municipality: c.municipality,
      email: `persona${i + 1}@demo.ejemplo`, phone: `33 4000 00${String(10 + i)}`,
      preferred_channel: ['correo', 'llamada', 'whatsapp'][i % 3],
      need: NECESIDADES[i % NECESIDADES.length], intent: i % 4 === 3 ? 'informacion' : 'cotizacion',
      consent_followup: i % 5 !== 0, consent_whatsapp: i % 3 === 2, privacy_accepted_at: created.toISOString(),
      company_id: sinEmpresa ? null : c.id, fit, match_confidence: sinEmpresa ? null : 'alta',
      route: sinEmpresa ? 'menudeo' : ['A', 'B'].includes(fit) ? (i % 4 === 3 ? 'sdr' : 'vendedor') : 'verificar',
      status, status_reason: status === 'rechazado' ? 'Volumen menor al mínimo' : status === 'descartado' ? 'Fuera de zona' : null,
      first_response_at: status === 'nuevo' ? null : new Date(created.getTime() + (20 + ((i * 37) % 300)) * 6e4).toISOString(),
      assigned_to: status === 'nuevo' ? null : ['Vendedor 1', 'Vendedor 2', 'SDR Mood'][i % 3],
      hubspot_status: 'demo', is_demo: true,
    });
  }
  const { error: e2 } = await supabase.from('leads').insert(leads);
  if (e2) throw e2;

  const spend = [];
  for (let d = 1; d <= 30; d++) {
    spend.push({ day: day(d).toISOString().slice(0, 10), source: 'pauta_google', campaign: 'pisos-gimnasio', amount_mxn: 380 + ((d * 53) % 240), clicks: 22 + ((d * 7) % 30), is_demo: true });
    if (d % 2 === 0) spend.push({ day: day(d).toISOString().slice(0, 10), source: 'pauta_chatgpt', campaign: 'antifatiga-industrial', amount_mxn: 250 + ((d * 31) % 160), clicks: 8 + ((d * 5) % 14), is_demo: true });
  }
  const { error: e3 } = await supabase.from('ad_spend').insert(spend);
  if (e3) throw e3;

  const piezas = [
    ['Qué piso de hule conviene para un gimnasio', 'piso de hule para gimnasio', 'guia', 'publicado'],
    ['Tapetes antifatiga: cuándo son obligatorios y cómo elegirlos', 'tapete antifatiga industrial', 'guia', 'publicado'],
    ['Loseta de hule vs. rollo: comparativa de costo por m²', 'loseta de hule o rollo', 'comparativa', 'aprobado'],
    ['Piso para área de pesas: espesores recomendados', 'espesor piso área de pesas', 'faq', 'revision'],
    ['Caso: renovación de piso en planta de autopartes', 'piso industrial planta', 'caso', 'borrador'],
    ['Preguntas frecuentes sobre instalación', 'cómo instalar piso de hule', 'faq', 'backlog'],
  ].map(([title, target_query, format, status], i) => ({
    title, target_query, format, status,
    url: status === 'publicado' ? `https://ejemplo.com/blog/pieza-${i + 1}` : null,
    approved_by: ['publicado', 'aprobado'].includes(status) ? 'demo' : null,
    published_at: status === 'publicado' ? day(10 + i * 4).toISOString().slice(0, 10) : null,
    is_demo: true,
  }));
  const { error: e4 } = await supabase.from('content_pieces').insert(piezas);
  if (e4) throw e4;
  return { companies: companies.length, leads: leads.length };
}

export async function clearDemo(supabase) {
  for (const t of ['leads', 'ad_spend', 'content_pieces', 'companies']) {
    const { error } = await supabase.from(t).delete().eq('is_demo', true);
    if (error) throw error;
  }
}
