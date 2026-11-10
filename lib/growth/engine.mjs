export const VERSION = 1;
export const SOURCES = { prospeccion_denue: 'Prospección DENUE', prospeccion_web: 'Prospección web', seo: 'SEO', geo: 'GEO', pauta_google: 'Google Ads', pauta_chatgpt: 'ChatGPT Ads', referido: 'Referidos', directo: 'Directo' };
export const LEAD_STAGES = ['nuevo', 'en_contacto', 'calificado', 'oportunidad_aceptada', 'rechazado', 'descartado'];
export const DEAL_STAGES = ['Diagnóstico', 'Mapa de mercado', 'Propuesta', 'Implementación', 'Operación', 'Perdido'];
export const CONTENT_STAGES = ['brief', 'borrador', 'revision', 'aprobado', 'publicado'];
export const label = value => String(value || '').replaceAll('_', ' ');
export const money = value => value == null ? 'Sin dato' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
export function fit(company, profile) {
  const scores = [!profile.sectors.length || profile.sectors.includes(company.sector), company.size >= profile.min && company.size <= profile.max, !profile.states.length || profile.states.includes(company.state)];
  return ['C', 'C', 'B', 'A'][scores.filter(Boolean).length];
}
export function sourceMetrics(data) {
  return Object.entries(SOURCES).map(([key, name]) => {
    const leads = data.leads.filter(l => l.source === key);
    const accepted = leads.filter(l => l.status === 'oportunidad_aceptada').length;
    const spend = data.campaigns.filter(c => c.source === key).reduce((n,c) => n + c.spend, 0);
    const paid = key.startsWith('pauta_');
    return { key, name, total: leads.length, accepted, spend: paid ? spend : null, cpo: paid && accepted ? spend / accepted : null };
  });
}
export function isSuppressed(data, contact) {
  const email = (contact.email || '').trim().toLowerCase();
  const phone = (contact.phone || '').replace(/\D/g, '');
  return data.suppressions.some(s => s.kind === 'email' ? email === s.value : s.kind === 'dominio' ? email.split('@')[1] === s.value : phone && phone === s.value.replace(/\D/g, ''));
}
export function qa(item) {
  const errors = [];
  if (!item.title?.trim()) errors.push('Falta título.');
  if ((item.body || '').trim().length < 100) errors.push('El borrador necesita al menos 100 caracteres.');
  if (!item.sources?.some(s => s.url && s.verified)) errors.push('Confirma al menos una fuente de ejemplo.');
  if (!item.reviewed) errors.push('Falta la revisión factual del editor.');
  if (/\[PENDIENTE\]|\[VERIFICAR\]/i.test(item.body || '')) errors.push('Resuelve las afirmaciones pendientes.');
  return errors;
}
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export function exportContent(item) {
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="robots" content="noindex"><title>${esc(item.title)}</title><body><p>Demostración · contenido pendiente de validación para uso real</p><h1>${esc(item.title)}</h1>${item.body.split(/\n\n/).map(p => `<p>${esc(p).replaceAll('\n','<br>')}</p>`).join('')}<h2>Fuentes de ejemplo</h2><ul>${item.sources.map(s => `<li>${esc(s.url)} — ${s.verified ? 'revisada en simulación' : 'pendiente'}</li>`).join('')}</ul></body></html>`;
}
export function report(data) {
  return { mode: 'DEMONSTRACION: todos los resultados son ficticios', generatedAt: new Date().toISOString(), client: data.profile.name, domain: data.profile.domain, sources: sourceMetrics(data), leads: data.leads.length, accepted: data.leads.filter(l=>l.status==='oportunidad_aceptada').length, content: data.content.map(c=>({title:c.title,status:c.status,version:c.version})), tasks: data.tasks, issues: data.issues, budget: data.budget, usage: data.usage, limitations: ['Sin conexión a Search Console, GA4, CRM ni CMS.', 'El muestreo IA es una ilustración, no representa búsquedas reales.', 'No se incluyen horas de trabajo en el costo por oportunidad.', 'Separación de datos local para demostración; no es aislamiento de seguridad.'] };
}
export function reportHTML(data) {
  const r = report(data);
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Reporte ${esc(r.client)}</title><style>body{font:16px/1.6 system-ui;max-width:960px;margin:50px auto;padding:20px;color:#182b28}table{width:100%;border-collapse:collapse}td,th{padding:12px;border-bottom:1px solid #ddd;text-align:left}small{color:#566}</style><h1>${esc(r.client)} · Informe de crecimiento</h1><p><b>DEMONSTRACIÓN · datos ficticios</b></p><p>Generado ${esc(r.generatedAt)}. Periodo ilustrativo: últimos 30 días.</p><h2>Resultado comercial</h2><p>${r.leads} leads · ${r.accepted} oportunidades aceptadas</p><table><tr><th>Fuente</th><th>Leads</th><th>Aceptadas</th><th>Gasto</th><th>Costo/oportunidad</th></tr>${r.sources.map(s=>`<tr><td>${esc(s.name)}</td><td>${s.total}</td><td>${s.accepted}</td><td>${s.spend===null?'No registrado':money(s.spend)}</td><td>${money(s.cpo)}</td></tr>`).join('')}</table><h2>Contenido</h2><ul>${r.content.map(c=>`<li>${esc(c.title)} · ${esc(label(c.status))} · v${c.version}</li>`).join('')}</ul><h2>Próximas acciones</h2><ul>${r.tasks.filter(t=>!t.done).map(t=>`<li>${esc(t.title)} · ${esc(t.owner)} · ${esc(t.due)}</li>`).join('')}</ul><h2>Límites de interpretación</h2><ul>${r.limitations.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></html>`;
}
export function act(state, tenantId, action, clock = new Date().toISOString()) {
  if (!state.tenants[tenantId]) throw new Error('Cliente no encontrado.');
  const next = structuredClone(state), d = next.tenants[tenantId];
  const id = () => `item-${next.seq++}`;
  const find = (table, key) => { const item = d[table].find(x=>x.id===key); if (!item) throw new Error('Registro no encontrado en este cliente.'); return item; };
  let detail = '';
  switch(action.type) {
    case 'convert': {
      const c = find('companies',action.id);
      if (isSuppressed(d,c)) throw new Error('Este contacto está en la lista de exclusiones.');
      if (d.leads.some(l=>l.companyId===c.id)) throw new Error('La empresa ya tiene un lead.');
      d.leads.unshift({id:id(),companyId:c.id,company:c.name,name:c.contact,email:c.email,phone:c.phone,source:c.origin==='web'?'prospeccion_web':'prospeccion_denue',status:'nuevo',fit:fit(c,d.profile),route:'sdr',need:'Validar necesidad y encontrar al decisor.',owner:'Equipo Mood',value:0,createdAt:clock,firstResponseAt:null,notes:[]});
      c.status='En seguimiento'; detail=`${c.name}: empresa convertida en lead`; break;
    }
    case 'lead': {
      const l=find('leads',action.id);
      const p=action.patch;
      if (p.status && !LEAD_STAGES.includes(p.status)) throw new Error('Estado inválido.');
      if (['rechazado','descartado'].includes(p.status) && !p.reason?.trim()) throw new Error('Indica el motivo del cierre.');
      if (p.value !== undefined && (!Number.isFinite(p.value)||p.value<0)) throw new Error('El valor debe ser positivo.');
      for(const k of ['company','name','email','phone','need','owner','reason']) if(p[k]!==undefined && (typeof p[k]!=='string'||p[k].length>(k==='need'?4000:250))) throw new Error('Revisa los datos del contacto.');
      for(const k of ['company','name','need','owner']) if(p[k]!==undefined&&!p[k].trim()) throw new Error('Completa los campos obligatorios.');
      if(p.email!==undefined){p.email=p.email.trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(p.email))throw new Error('Correo inválido.');if(p.email!==l.email.toLowerCase()&&d.leads.some(x=>x.id!==l.id&&x.email.toLowerCase()===p.email))throw new Error('Este correo ya está registrado.');}
      for (const k of ['status','owner','reason','value','company','name','email','phone','need']) if(p[k]!==undefined) l[k]=typeof p[k]==='string'?p[k].trim():p[k];
      detail=`${l.company}: seguimiento actualizado`; break;
    }
    case 'respond': { const l=find('leads',action.id); if(isSuppressed(d,l)) throw new Error('Contacto excluido.'); l.firstResponseAt ||= clock; if(l.status==='nuevo') l.status='en_contacto'; detail=`${l.company}: primera respuesta registrada (simulación)`; break; }
    case 'note': { const l=find('leads',action.id); if(!action.text?.trim()) throw new Error('Escribe una nota.'); l.notes.unshift({id:id(),text:action.text.trim(),at:clock}); detail=`Nota en ${l.company}`; break; }
    case 'capture': {
      const p=action.payload;
      if(!p.name?.trim()||!p.company?.trim()||!p.need?.trim()||!/^\S+@\S+\.\S+$/.test(p.email||'')||!p.consent) throw new Error('Completa los datos y acepta el aviso de demostración.');
      if(!SOURCES[p.source]) throw new Error('Fuente inválida.');
      if(isSuppressed(d,p)) throw new Error('Contacto excluido.');
      if(d.leads.some(l=>l.email.toLowerCase()===p.email.trim().toLowerCase())) throw new Error('Este correo ya está registrado.');
      d.leads.unshift({id:id(),companyId:null,company:p.company.trim(),name:p.name.trim(),email:p.email.trim().toLowerCase(),phone:'',need:p.need.trim(),source:p.source,status:'nuevo',fit:'sin_coincidencia',route:'verificar',owner:'Sin asignar',value:0,createdAt:clock,firstResponseAt:null,consentAt:clock,notes:[]}); detail='Formulario de demostración recibido'; break;
    }
    case 'suppress': {
      let value=action.value.trim().toLowerCase();
      if(!['email','dominio','telefono'].includes(action.kind)||!value||!action.reason?.trim()) throw new Error('Completa la exclusión y su motivo.');
      if(action.kind==='email'&&!/^\S+@\S+\.\S+$/.test(value)) throw new Error('Correo inválido.');
      if(action.kind==='dominio'&&!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value)) throw new Error('Escribe solo el dominio.');
      if(action.kind==='telefono') { value=value.replace(/\D/g,''); if(value.length<10) throw new Error('Teléfono inválido.'); }
      if(d.suppressions.some(s=>s.kind===action.kind&&s.value===value)) throw new Error('La exclusión ya existe.');
      d.suppressions.unshift({id:id(),kind:action.kind,value,reason:action.reason,at:clock}); detail=`Exclusión registrada: ${value}`; break;
    }
    case 'brief': {
      const k=find('keywords',action.id);
      if(d.content.some(c=>c.keywordId===k.id)) throw new Error('Esta oportunidad ya tiene un brief.');
      d.content.unshift({id:id(),keywordId:k.id,title:k.term,format:'Guía técnica',status:'brief',version:1,approvedVersion:null,approvedBy:null,reviewed:false,body:'',brief:`Objetivo: responder a «${k.term}» para ${d.profile.name}.\nAudiencia: compras y mantenimiento industrial.\nEstructura: necesidad, criterios de elección, preguntas al proveedor y solicitud de cotización.\nEvidencia: ficha técnica y revisión del cliente. No afirmar certificaciones sin respaldo.`,sources:[{url:`https://${d.profile.domain}/ficha-tecnica`,verified:false}],scheduledAt:'',publications:[]}); detail=`Brief creado: ${k.term}`; break;
    }
    case 'draft': { const c=find('content',action.id); if(c.body) throw new Error('El borrador ya tiene texto. Edítalo para conservar tu trabajo.'); c.body=`${c.title}\n\nElegir una solución industrial comienza por conocer el uso, la superficie disponible y las condiciones de operación. Antes de comparar opciones, documenta estas necesidades con tu equipo.\n\nPrepara un listado de medidas, frecuencia de uso y requisitos de limpieza. Solicita al proveedor la ficha técnica y confirma la compatibilidad para tu aplicación.\n\nCompara instalación, mantenimiento y condiciones de entrega. Evita dar por confirmada una certificación sin revisar la evidencia del fabricante.\n\nSolicita una cotización con las medidas y necesidades de tu proyecto.\n\nTexto de plantilla para demostración, sin generación por IA ni validación técnica real.`; c.status='borrador'; c.version++; c.approvedVersion=null; c.reviewed=false; detail=`Plantilla de borrador creada: ${c.title}`; break; }
    case 'content': {
      const c=find('content',action.id), p=action.patch;
      if(p.title !== undefined && !p.title.trim()) throw new Error('El título es obligatorio.');
      for (const k of ['title','body','brief','scheduledAt']) if(p[k]!==undefined)c[k]=p[k];
      c.version++; c.approvedVersion=null;c.approvedBy=null;c.reviewed=false;c.sources.forEach(s=>s.verified=false);c.status='borrador'; detail=`Versión ${c.version} guardada; aprobación invalidada`; break;
    }
    case 'review': { const c=find('content',action.id); c.reviewed=!!action.confirmed;c.sources.forEach(s=>s.verified=!!action.confirmed);c.approvedVersion=null;c.approvedBy=null;c.status='revision';detail=`Revisión editorial ${action.confirmed?'confirmada':'retirada'} en simulación`;break; }
    case 'approve': { const c=find('content',action.id); const errors=qa(c);if(errors.length)throw new Error(errors.join(' ')); c.approvedVersion=c.version;c.approvedBy='Editor Mood (demo)';c.status='aprobado';detail=`Aprobada v${c.version}: ${c.title}`;break; }
    case 'publish': { const c=find('content',action.id);if(c.approvedVersion!==c.version||qa(c).length)throw new Error('La versión actual requiere revisión y aprobación.');if(c.publications.some(p=>p.version===c.version))throw new Error('Esta versión ya tiene una publicación simulada.');c.publications.push({id:id(),version:c.version,at:clock,body:c.body});c.status='publicado';detail=`Publicación simulada de ${c.title}, v${c.version}. No se envió a ningún CMS.`;break; }
    case 'rollback': {const c=find('content',action.id);if(c.status!=='publicado')throw new Error('No hay una publicación activa.');c.status='revision';c.approvedVersion=null;c.approvedBy=null;detail=`Publicación simulada retirada: ${c.title}`;break;}
    case 'task': { const t=find('tasks',action.id);t.done=!t.done;detail=`Tarea ${t.done?'completada':'reabierta'}: ${t.title}`;break; }
    case 'addTask': { if(!action.title?.trim()||!action.due||!action.owner?.trim())throw new Error('Completa tarea, responsable y fecha.');d.tasks.unshift({id:id(),title:action.title.trim(),owner:action.owner.trim(),due:action.due,phase:action.phase||'DO',done:false});detail='Tarea creada';break; }
    case 'deal': {const deal=find('deals',action.id);if(!DEAL_STAGES.includes(action.stage))throw new Error('Etapa inválida.');deal.stage=action.stage;detail=`${deal.company}: ${action.stage}`;break;}
    case 'addDeal': {if(!action.company?.trim()||!Number.isFinite(action.value)||action.value<0)throw new Error('Completa empresa y valor válido.');d.deals.unshift({id:id(),company:action.company.trim(),value:action.value,stage:'Diagnóstico',owner:action.owner||'Mood'});detail='Oportunidad comercial creada';break;}
    case 'campaign': {const p=action.payload;if(!p.name?.trim()||!['pauta_google','pauta_chatgpt'].includes(p.source)||!Number.isFinite(p.spend)||p.spend<0||!Number.isInteger(p.clicks)||p.clicks<0)throw new Error('Completa campaña, gasto y clics válidos.');d.campaigns.unshift({id:id(),...p});detail=`Gasto de demostración registrado: ${p.name}`;break;}
    case 'issue': {const i=find('issues',action.id);i.resolved=!i.resolved;detail=`Hallazgo ${i.resolved?'resuelto':'reabierto'}: ${i.title}`;break;}
    case 'job': {
      const cost=action.cost ?? 0;
      if(!Number.isFinite(cost)||cost<0)throw new Error('Costo inválido.');
      const total=Object.values(next.tenants).reduce((n,t)=>n+t.usage.reduce((s,u)=>s+u.amount,0),0);
      const own=d.usage.reduce((n,u)=>n+u.amount,0);
      const paused=total+cost>next.globalBudget||own+cost>d.budget;
      d.jobs.unshift({id:id(),type:action.jobType||'Diagnóstico de ejemplo',status:paused?'Pausado por presupuesto':'Completado (simulación)',at:clock,cost:paused?0:cost});
      if(!paused)d.usage.push({id:id(),amount:cost,provider:'Simulador local',at:clock});
      detail=paused?'Trabajo pausado por límite de presupuesto':'Trabajo simulado completado con evidencia de ejemplo';break;
    }
    case 'profile': { const p=action.patch;if(!p.name?.trim()||!p.domain?.trim())throw new Error('Nombre y dominio son obligatorios.');if(!Number.isFinite(p.budget)||p.budget<0||p.budget>next.globalBudget)throw new Error('El límite del cliente no puede superar $5,000 MXN.');d.profile.name=p.name.trim();d.profile.domain=p.domain.trim();d.profile.states=p.states;d.profile.sectors=p.sectors;d.budget=p.budget;detail='Perfil y presupuesto actualizados';break; }
    default: throw new Error('Acción no reconocida.');
  }
  d.events.unshift({id:id(),at:clock,actor:'Equipo Mood · demo',type:action.type,detail});
  return next;
}
