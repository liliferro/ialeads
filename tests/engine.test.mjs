import {test} from 'node:test';
import assert from 'node:assert/strict';
import {act,fit,sourceMetrics,qa,exportContent,reportHTML} from '../lib/growth/engine.mjs';
import {createSeed} from '../lib/growth/seed.mjs';
import {ensurePilot} from '../lib/growth/pilot.mjs';
test('pilot migration preserves existing work and adds no fictional performance data',()=>{
 const old=createSeed();delete old.tenants.matdepot;old.tenants.norte.leads[0].owner='Cambio de usuario';
 const updated=ensurePilot(old);assert.equal(updated.tenants.norte.leads[0].owner,'Cambio de usuario');
 assert.equal(updated.tenants.matdepot.profile.domain,'www.matdepotmex.com');assert.equal(updated.tenants.matdepot.profile.domainVerified,true);
 for(const table of ['leads','companies','campaigns','content','keywords','issues','observations','usage'])assert.equal(updated.tenants.matdepot[table].length,0);
 updated.tenants.matdepot.profile.crm='Elección del usuario';assert.equal(ensurePilot(updated).tenants.matdepot.profile.crm,'Elección del usuario');
});
const now='2026-11-09T16:00:00.000Z';
test('confirmed pilot scope migrates without losing leads, notes or custom tasks',()=>{
 const s=createSeed(),p=s.tenants.matdepot;p.profile.configRevision=1;p.profile.domain='matdepotmx.com';p.profile.product='Por confirmar';p.leads.push({id:'kept',notes:['keep me']});p.tasks.push({id:'custom',title:'Trabajo del usuario',done:true});
 const migrated=ensurePilot(s);assert.equal(migrated.tenants.matdepot.profile.product,'Pisos para gimnasios');assert.equal(migrated.tenants.matdepot.profile.domain,'www.matdepotmex.com');assert.deepEqual(migrated.tenants.matdepot.leads,p.leads);assert.equal(migrated.tenants.matdepot.tasks.at(-1).title,'Trabajo del usuario');assert.equal(ensurePilot(migrated),migrated);
});
test('account conversion preserves origin, prevents duplicates and leaves another client untouched',()=>{
 const s=createSeed(),before=structuredClone(s.tenants.envase);const n=act(s,'norte',{type:'convert',id:'norte-c3'},now);
 assert.equal(n.tenants.norte.leads[0].source,'prospeccion_denue');assert.equal(n.tenants.norte.leads[0].companyId,'norte-c3');assert.deepEqual(n.tenants.envase,before);assert.equal(s.tenants.norte.leads.length,18);
 assert.throws(()=>act(n,'norte',{type:'convert',id:'norte-c3'}),/ya tiene/);
 assert.throws(()=>act(n,'envase',{type:'convert',id:'norte-c4'}),/no encontrado/);
});
test('email and domain suppression block conversion and contact registration',()=>{
 let s=createSeed();s=act(s,'norte',{type:'suppress',kind:'email',value:'COMPRAS3@NORTE.EXAMPLE',reason:'Baja'});
 assert.throws(()=>act(s,'norte',{type:'convert',id:'norte-c3'}),/exclusiones/);
 s=act(s,'norte',{type:'suppress',kind:'dominio',value:'norte.example',reason:'No contactar'});
 assert.throws(()=>act(s,'norte',{type:'respond',id:'norte-l0'}),/excluido/);
});
test('fit counts sector, size and state independently',()=>{
 const p=createSeed().tenants.norte.profile;assert.equal(fit({sector:'Manufactura',state:'Jalisco',size:4},p),'A');assert.equal(fit({sector:'Manufactura',state:'Puebla',size:4},p),'B');assert.equal(fit({sector:'Servicios',state:'Puebla',size:1},p),'C');
});
test('editorial approval is tied to version and cannot be bypassed',()=>{
 let s=createSeed(),id='norte-p1';assert.throws(()=>act(s,'norte',{type:'publish',id}),/requiere revisión/);
 assert.throws(()=>act(s,'norte',{type:'approve',id}),/revisión factual/);
 s=act(s,'norte',{type:'review',id,confirmed:true});s=act(s,'norte',{type:'approve',id});s=act(s,'norte',{type:'publish',id});
 assert.equal(s.tenants.norte.content[0].status,'publicado');assert.equal(s.tenants.norte.content[0].publications.length,1);
 assert.throws(()=>act(s,'norte',{type:'publish',id}),/ya tiene/);
 s=act(s,'norte',{type:'content',id,patch:{body:'Texto cambiado que necesita una nueva revisión editorial y fuentes verificadas antes de volver a aprobar esta versión para publicar.'}});
 assert.equal(s.tenants.norte.content[0].approvedVersion,null);assert.equal(s.tenants.norte.content[0].reviewed,false);assert.throws(()=>act(s,'norte',{type:'publish',id}),/requiere revisión/);
});
test('unresolved factual placeholders block approval',()=>{
 const c={title:'Ejemplo',body:'Texto largo '.repeat(20)+'[VERIFICAR]',sources:[{url:'https://example.com',verified:true}],reviewed:true};assert.ok(qa(c).some(x=>x.includes('pendientes')));
});
test('job budget is enforced globally across clients and never charged when paused',()=>{
 let s=createSeed();s.tenants.norte.budget=5000;s.tenants.envase.budget=5000;
 s=act(s,'norte',{type:'job',cost:3000});s=act(s,'envase',{type:'job',cost:1500});
 assert.match(s.tenants.envase.jobs[0].status,/Pausado/);assert.equal(s.tenants.envase.jobs[0].cost,0);assert.equal(s.tenants.envase.usage.length,2);
 assert.throws(()=>act(s,'norte',{type:'job',cost:-20}),/inválido/);
});
test('paid cost per opportunity uses opportunities from the same source',()=>{
 const d=createSeed().tenants.norte,r=sourceMetrics(d);const g=r.find(r=>r.key==='pauta_google'),c=r.find(r=>r.key==='pauta_chatgpt');
 assert.equal(g.accepted,0);assert.equal(g.cpo,null);assert.equal(c.accepted,3);assert.equal(c.cpo,700);assert.equal(r.find(r=>r.key==='seo').spend,null);
});
test('capture requires consent, validates input and retains attribution',()=>{
 const p={name:'Ana',company:'Demo',email:'ana@demo.example',need:'Cotizar',source:'seo',consent:false};const s=createSeed();assert.throws(()=>act(s,'norte',{type:'capture',payload:p}),/aviso/);
 const n=act(s,'norte',{type:'capture',payload:{...p,consent:true}},now);assert.equal(n.tenants.norte.leads[0].source,'seo');assert.equal(n.tenants.norte.leads[0].route,'verificar');assert.equal(n.tenants.norte.leads[0].consentAt,now);
 assert.throws(()=>act(n,'norte',{type:'capture',payload:{...p,consent:true}}),/ya está registrado/);
});
test('lost/rejected lead needs a reason and logs action',()=>{
 const s=createSeed();assert.throws(()=>act(s,'norte',{type:'lead',id:'norte-l0',patch:{status:'rechazado'}}),/motivo/);
 const n=act(s,'norte',{type:'lead',id:'norte-l0',patch:{status:'rechazado',reason:'Sin encaje'}},now);assert.equal(n.tenants.norte.events[0].at,now);
});
test('HTML exports escape user text and clearly label simulated data',()=>{
 const d=createSeed().tenants.norte,c=d.content[0];c.title='<script>alert(1)</script>';c.body='<img src=x onerror=alert(1)>';const html=exportContent(c);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.match(html,/&lt;script&gt;/);assert.match(reportHTML(d),/DEMONSTRACIÓN/);
});
test('rollback removes active publication and requires new approval',()=>{let s=createSeed(),id='norte-p1';for(const a of [{type:'review',confirmed:true},{type:'approve'},{type:'publish'},{type:'rollback'}])s=act(s,'norte',{id,...a});assert.equal(s.tenants.norte.content[0].status,'revision');assert.throws(()=>act(s,'norte',{type:'publish',id}),/requiere revisión/);});
test('brief creation is idempotent and cross-client writes fail',()=>{let s=createSeed();s=act(s,'norte',{type:'brief',id:'norte-k0'});assert.throws(()=>act(s,'norte',{type:'brief',id:'norte-k0'}),/ya tiene/);assert.throws(()=>act(s,'envase',{type:'issue',id:'norte-a0'}),/no encontrado/);});
