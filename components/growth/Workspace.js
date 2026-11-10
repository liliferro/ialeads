'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { act, VERSION } from '@/lib/growth/engine.mjs';
import { createSeed } from '@/lib/growth/seed.mjs';
import { ensurePilot } from '@/lib/growth/pilot.mjs';
import './growth.css';

const Context=createContext(null);
const KEY='mood-growth-demo-v1';
export const useGrowth=()=>useContext(Context);
export function download(name, body, type='text/plain;charset=utf-8') {
  const url=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function Glyph({name='grid',size=20}) {
  const paths={grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',search:'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16 M16 16l6 6',leads:'M3 5h18v15H3z M3 12h5l2 3h4l2-3h5',globe:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M2 12h20 M12 2c-6 6-6 14 0 20 M12 2c6 6 6 14 0 20',doc:'M5 2h9l5 5v15H5z M14 2v6h5 M8 12h8 M8 16h8',chart:'M4 3v18h18 M8 17v-5 M13 17V8 M18 17V4',check:'M4 12l5 5L20 5',gear:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',arrow:'M4 12h16 M14 6l6 6-6 6',target:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10',plug:'M8 2v5 M16 2v5 M5 7h14v3a7 7 0 0 1-14 0z M12 17v5',clock:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 6v6l4 3'};
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.grid}/></svg>;
}
export const NAV=[['VISIÓN GENERAL',[['resumen','Resumen','grid']]],['MOTOR COMERCIAL',[['cuentas','Encontrar empresas','search'],['leads','Leads y seguimiento','leads'],['comercial','Pipeline comercial','target']]],['VISIBILIDAD',[['visibilidad','SEO y GEO','globe'],['contenido','Estudio de contenido','doc'],['pauta','Campañas y pauta','chart']]],['OPERACIÓN',[['operacion','Plan de trabajo','check'],['reportes','Reportes','chart'],['integraciones','Conexiones','plug'],['ajustes','Configuración','gear']]]];
export default function Workspace({children}) {
  const path=usePathname(),[state,setState]=useState(null),[tenant,setTenant]=useState('matdepot'),[toast,setToast]=useState(null),[storageError,setStorageError]=useState('');
  useEffect(()=>{
    try {const raw=localStorage.getItem(KEY);const saved=raw?JSON.parse(raw):null;if(saved && (saved.version!==VERSION || !saved.tenants?.norte || !saved.tenants?.envase))throw new Error('Formato incompatible');const hydrated=ensurePilot(saved||createSeed());setState(hydrated);const t=localStorage.getItem(KEY+'-client');if(hydrated.tenants[t])setTenant(t);}
    catch {setStorageError('No se pudo recuperar el guardado anterior. Se cargó un escenario nuevo.');setState(createSeed());}
  },[]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(null),5500);return()=>clearTimeout(t);},[toast]);
  function commit(next) {try{localStorage.setItem(KEY,JSON.stringify(next));setStorageError('');}catch{setStorageError('No se pudo guardar en este navegador. Exporta un respaldo antes de cerrar.');}setState(next);}
  function dispatch(action) {try{const next=act(state,tenant,action);commit(next);setToast({text:next.tenants[tenant].events[0].detail});return true;}catch(e){setToast({text:e.message,error:true});return false;}}
  const selectTenant=value=>{setTenant(value);try{localStorage.setItem(KEY+'-client',value);}catch{};};
  if(!state)return <div className="growth-loading"><span className="growth-logo">m.</span><p>Preparando tu espacio de crecimiento…</p></div>;
  const data=state.tenants[tenant];
  const context={state,data,tenant,dispatch,notify:text=>setToast({text}),reset:()=>{const defaults=createSeed();commit({...defaults,seq:Math.max(defaults.seq,state.seq),tenants:{...defaults.tenants,matdepot:state.tenants.matdepot}});setToast({text:'Los dos escenarios ficticios se restauraron. Se conservó el espacio MatDepot.'});}};
  const title=NAV.flatMap(g=>g[1]).find(([slug])=>path.endsWith('/'+slug))?.[1]||'Captura de leads';
  return <Context.Provider value={context}><div className="growth-app">
    <a href="#growth-main" className="growth-skip">Ir al contenido</a>
    <aside className="growth-side"><Link href="/demo/resumen" className="growth-brand"><span className="growth-logo">m.</span><span>mood<span className="growth-brand-sub">GROWTH OS</span></span></Link>
      <div className="growth-workspace"><span className="growth-overline">ESPACIO DE TRABAJO</span><label className="sr-only" htmlFor="client-switch">Cliente</label><select id="client-switch" value={tenant} onChange={e=>selectTenant(e.target.value)}>{Object.entries(state.tenants).map(([id,t])=><option key={id} value={id}>{t.profile.name}{t.profile.mode==='pilot'?' · piloto':''}</option>)}</select><span className="growth-demo-dot">{data.profile.mode==='pilot'?'Piloto · conexiones pendientes':'Cliente de demostración'}</span></div>
      <nav aria-label="Navegación principal">{NAV.map(([group,items])=><div key={group} className="growth-navgroup"><p>{group}</p>{items.map(([slug,name,icon])=><Link key={slug} href={'/demo/'+slug} aria-current={path.endsWith('/'+slug)?'page':undefined}><Glyph name={icon}/>{name}{slug==='contenido'&&<span className="growth-count">{data.content.filter(c=>c.status==='revision').length}</span>}</Link>)}</div>)}</nav>
      <div className="growth-side-foot"><span className="growth-avatar">LF</span><div><b>Equipo Mood</b><small>Administrador · demo local</small></div></div>
    </aside>
    <div className="growth-body"><header className="growth-top"><div><span>Mood Agency</span><i>/</i><b>{title}</b></div><div className="growth-top-right"><span className="growth-tag mint">Demostración</span><span className="growth-avatar small">LF</span></div></header>
      <div className="growth-demo-bar"><span>{data.profile.mode==='pilot'?<><b>MatDepot · preparación del piloto.</b> Sin conexiones ni resultados reales cargados. Guardado local; usa solo datos de prueba.</>:<><b>Explora con confianza.</b> Empresas y resultados ficticios. Tus cambios se guardan en este navegador.</>}</span><Link href="/demo/captura">Probar formulario <span aria-hidden="true">↗</span></Link></div>
      <main id="growth-main" className="growth-main">{storageError&&<p role="alert" className="growth-alert">{storageError}</p>}<div key={tenant}>{children}</div></main>
      <footer className="growth-footer">Mood Growth OS · De la oportunidad al crecimiento.<span>Demo local · Sin envíos ni publicaciones externas</span></footer>
    </div>{toast&&<div className={'growth-toast'+(toast.error?' error':'')} role={toast.error?'alert':'status'}>{toast.text}<button aria-label="Cerrar aviso" onClick={()=>setToast(null)}>×</button></div>}
  </div></Context.Provider>;
}
export function Head({eyebrow,title,description,children}) {return <div className="growth-head"><div><p className="growth-overline">{eyebrow||'MOOD INDUSTRIAL GROWTH'}</p><h1>{title}</h1><p>{description}</p></div><div className="growth-actions">{children}</div></div>;}
export function Tag({children,tone=''}){return <span className={'growth-tag '+tone}>{children}</span>;}
export function Card({title,subtitle,children,action,className=''}){return <section className={'growth-card '+className}>{title&&<div className="growth-card-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>}{children}</section>;}
export function Empty({children}){return <div className="growth-empty"><Glyph name="search" size={28}/><p>{children}</p></div>;}
export function Metric({label,value,note,accent=false}){return <div className={'growth-metric'+(accent?' accent':'')}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;}
