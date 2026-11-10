import {load} from 'cheerio';
import {XMLParser} from 'fast-xml-parser';
export const SITE='https://www.matdepotmex.com';
export function safeSiteUrl(value,base=SITE){try{const u=new URL(value,base);if(u.protocol!=='https:'||!['www.matdepotmex.com','matdepotmex.com'].includes(u.hostname)||u.port||u.username||u.password||u.search)return null;u.hash='';return u.href;}catch{return null;}}
export async function readSite(url,{fetcher=fetch,deadline=Date.now()+45000}={}){
 let target=safeSiteUrl(url);if(!target)throw new Error('outside_site');
 for(let n=0;n<4;n++){
  if(Date.now()>deadline)throw new Error('time_limit');
  const res=await fetcher(target,{redirect:'manual',headers:{'User-Agent':'MoodAudit/1.0'},signal:AbortSignal.timeout(Math.max(1,Math.min(6000,deadline-Date.now())))});
  if([301,302,303,307,308].includes(res.status)){const next=safeSiteUrl(res.headers.get('location')||'',target);await res.body?.cancel();if(!next)throw new Error('outside_site');target=next;continue;}
  if(Number(res.headers.get('content-length'))>2000000){await res.body?.cancel();throw new Error('too_large');}
  const reader=res.body?.getReader();let size=0,text='';const decoder=new TextDecoder();
  if(reader){try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>2000000)throw new Error('too_large');text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{await reader.cancel();}}
  return {url:target,status:res.status,text,robots:res.headers.get('x-robots-tag')||'',type:res.headers.get('content-type')||''};
 }throw new Error('redirect_limit');
}
export function sitemapEntries(xml){
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('unsafe_xml');
 const doc=new XMLParser({ignoreAttributes:true,processEntities:false}).parse(xml),list=x=>x?(Array.isArray(x)?x:[x]):[];
 return {urls:list(doc.urlset?.url).map(x=>safeSiteUrl(x.loc)).filter(Boolean),sitemaps:list(doc.sitemapindex?.sitemap).map(x=>safeSiteUrl(x.loc)).filter(Boolean)};
}
export function robotsAllows(text,url){
 // Conservative: honor every non-empty Disallow, including agent-specific rules.
 const path=new URL(url).pathname;
 return !text.split(/\r?\n/).some(line=>{const m=line.split('#')[0].match(/^\s*disallow\s*:\s*(\S+)/i);if(!m)return false;const rule=m[1];const end=rule.endsWith('$');const re=rule.replace(/\$$/,'').split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*');return new RegExp('^'+re+(end?'$':'')).test(path);});
}
export function inspectHtml(page){
 const $=load(page.text);const text=s=>$(s).first().text().replace(/\s+/g,' ').trim();
 const meta=name=>$(`meta[name="${name}"]`).map((_,el)=>$(el).attr('content')||'').get().join(' ');
 const title=text('title'),description=meta('description'),h1=$('h1').map((_,el)=>$(el).text().trim()).get();
 const canonical=safeSiteUrl($('link[rel="canonical"]').attr('href')||'',page.url);
 const canonicalPresent=!!$('link[rel="canonical"]').attr('href');
 const robotTags=meta('robots')+' '+page.robots;
 const schemas=[];let schemaErrors=0;
 $('script[type="application/ld+json"]').each((_,el)=>{try{const obj=JSON.parse($(el).text());const collect=x=>{if(!x||typeof x!=='object')return;if(x['@type'])schemas.push(...[x['@type']].flat().filter(t=>typeof t==='string'));if(Array.isArray(x))x.forEach(collect);if(x['@graph'])collect(x['@graph']);};collect(obj);}catch{schemaErrors++;}});
 const links=[...new Set($('a[href]').map((_,el)=>safeSiteUrl($(el).attr('href'),page.url)).get().filter(Boolean))];
 const images=$('img').length,missingAlt=$('img').filter((_,el)=>$(el).attr('alt')===undefined).length;
 $('script,style,nav,header,footer,noscript').remove();const body=text('main')||text('body');
 const checks=[
  ['http','Respuesta HTTP',page.status===200,`HTTP ${page.status}`,'Corregir la respuesta o el destino de las redirecciones.'],
  ['title','Título presente',!!title,title||'No encontrado','Definir un título que distinga esta intención de las demás páginas.'],
  ['description','Descripción presente',!!description,description||'No encontrada','Redactar una descripción específica y verificable.'],
  ['h1','Un H1 principal',h1.length===1,`${h1.length} H1`,'Revisar la jerarquía de encabezados.'],
  ['canonical','Canonical del dominio',canonicalPresent&&!!canonical,canonicalPresent?(canonical||'Fuera del dominio / no válida'):'No encontrada','Revisar la URL canónica; su presencia no prueba indexación.'],
  ['indexable','Sin directiva noindex',!/\b(noindex|none)\b/i.test(robotTags),robotTags||'Sin directiva restrictiva observada','Confirmar si la exclusión del índice es intencional.'],
  ['links','Enlaces internos presentes',links.length>0,`${links.length} destinos internos`,'Añadir enlaces útiles hacia contenidos relacionados.'],
  ['schema','JSON-LD presente y parseable',schemas.length>0&&schemaErrors===0,`${schemas.join(', ')||'Sin tipos detectados'}; errores JSON: ${schemaErrors}`,'Validar el significado y las propiedades con el comprobador de resultados enriquecidos.'],
  ['alt','Atributo alt en imágenes',images===0?null:missingAlt===0,`${missingAlt} sin alt de ${images}`,'Revisar textos alternativos descriptivos y alt vacío para imágenes decorativas.']
 ].map(([id,label,pass,evidence,action])=>({id,label,status:pass===null?'no_aplica':pass?'verificado':'revisar',evidence,action}));
 return {url:page.url,status:page.status,checkedAt:new Date().toISOString(),title,description,h1,canonical:canonicalPresent?canonical:null,schemas:[...new Set(schemas)],schemaErrors,links,words:body.split(/\s+/).filter(Boolean).length,checks};
}
export async function auditSite(previous=null,options={}){
 const deadline=Date.now()+45000,read=url=>readSite(url,{...options,deadline});
 let report=previous?structuredClone(previous):{startedAt:new Date().toISOString(),sitemap:SITE+'/sitemap.xml',inventory:[],pages:[],errors:[],limited:false};
 if(!previous){
  const robots=await read(SITE+'/robots.txt');report.robots={url:robots.url,status:robots.status,text:robots.text.slice(0,12000)};
  if(robots.status!==200&&robots.status!==404)throw new Error('robots_unavailable');
  const queue=[report.sitemap],seen=new Set(),urls=new Set();
  while(queue.length&&seen.size<6&&Date.now()<deadline-15000){const url=queue.shift();if(seen.has(url))continue;seen.add(url);try{const res=await read(url);if(res.status!==200)throw new Error('sitemap_http');const data=sitemapEntries(res.text);data.urls.forEach(u=>urls.add(u));queue.push(...data.sitemaps.filter(u=>!seen.has(u)));}catch{report.errors.push({url,error:'No se pudo leer el sitemap.'});}}
  report.limited=queue.length>0||urls.size>200;report.inventory=[...urls].slice(0,200);if(!report.inventory.length)throw new Error('empty_sitemap');
  report.inventory.sort((a,b)=>Number(/gimnas|blog|crossfit/.test(b))-Number(/gimnas|blog|crossfit/.test(a)));
 }
 const done=new Set(report.pages.map(p=>p.requestedUrl||p.url));const pending=report.inventory.filter(u=>!done.has(u)).slice(0,15);
 for(let i=0;i<pending.length&&Date.now()<deadline-6500;i+=3){const pages=await Promise.all(pending.slice(i,i+3).map(async url=>{
  if(!robotsAllows(report.robots.text,url))return {url,requestedUrl:url,error:'No consultada: regla Disallow en robots.txt.',checks:[]};
  try{const res=await read(url);if(!res.type.includes('text/html'))throw new Error('not_html');return {...inspectHtml(res),requestedUrl:url};}catch{return {url,requestedUrl:url,error:'No se pudo analizar: respuesta, tamaño o tiempo de espera.',checks:[]};}
 }));report.pages.push(...pages);}
 report.updatedAt=new Date().toISOString();return report;
}
export {overlapCandidates,auditSummary} from './seo-shared.mjs';
