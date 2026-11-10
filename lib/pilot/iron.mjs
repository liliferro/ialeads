export function searchFilters(input={}) {
 const out={actividades:['713943'],pagina:0,porPagina:25,excluirPublico:true};
 for(const k of ['estados','municipios','actividades'])if(input[k]!==undefined){if(!Array.isArray(input[k])||input[k].length>32||input[k].some(v=>typeof v!=='string'||!v.trim()||v.length>100))throw new Error('Filtros inválidos.');out[k]=input[k].map(v=>v.trim());}
 if(!out.actividades.length)out.actividades=['713943'];
 if(out.actividades.some(v=>!/^\d{3,6}$/.test(v)))throw new Error('Selecciona un código de actividad SCIAN.');
 if(input.nombre){if(typeof input.nombre!=='string'||input.nombre.length>100)throw new Error('Nombre inválido.');out.nombre=input.nombre.trim();}
 if(input.estratos!==undefined){if(!Array.isArray(input.estratos)||input.estratos.some(v=>!Number.isInteger(v)||v<1||v>7))throw new Error('Tamaño inválido.');out.estratos=input.estratos;}
 for(const k of ['conTelefono','conEmail','conWeb','emailCorporativo'])if(input[k]!==undefined){if(typeof input[k]!=='boolean')throw new Error('Filtro de contacto inválido.');out[k]=input[k];}
 for(const k of ['pagina','porPagina'])if(input[k]!==undefined){if(!Number.isInteger(input[k])||input[k]<(k==='pagina'?0:1)||input[k]>(k==='pagina'?1000:50))throw new Error('Página inválida.');out[k]=input[k];}
 return out;
}
export function parseIron(data){
 if(!data||!Array.isArray(data.leads)||!Number.isFinite(data.total))throw new Error('Iron devolvió una respuesta inesperada. Revisa los filtros.');
 return {total:data.total,hayMas:data.hayMas===true,avisos:Array.isArray(data.avisos)?data.avisos.map(String):[],procedencia:typeof data.procedencia?.aviso==='string'?data.procedencia.aviso:'Fuente: INEGI DENUE. Procesamiento: Iron.',items:data.leads.map(r=>({denue_id:String(r.id??''),name:String(r.nombre??'').slice(0,300),legal_name:r.razon_social??'',activity:r.actividad??'',state:r.entidad??'',municipality:r.municipio??'',size:r.tamano??'',phone:r.telefono??'',email:r.email??'',website:r.web??'',address:r.direccion??'',postal_code:r.cp??''})).filter(r=>r.denue_id&&r.name)};
}
export async function searchIron(filters,transport=fetch){
 const response=await transport('https://leads.iron-ai.com/api/agente/buscar_leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(searchFilters(filters)),signal:AbortSignal.timeout(15000),cache:'no-store'});
 if(!response.ok)throw new Error(response.status===429?'Iron alcanzó su límite de consultas. Intenta más tarde.':'No se pudo consultar Iron. Intenta más tarde.');
 return parseIron(await response.json());
}
export function safeWebsite(value){try{const url=new URL(/^https?:\/\//i.test(value)?value:`https://${value}`);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&url.hostname.includes('.')?url.href:null;}catch{return null;}}
