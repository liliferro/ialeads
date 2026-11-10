import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
let db;const orgA=randomUUID(),orgB=randomUUID(),admin=randomUUID(),other=randomUUID(),viewer=randomUUID();
const payload=()=>({name:'Ana de prueba',company:'Gimnasio de prueba',email:`${randomUUID()}@test.example`,need:'Necesito piso para un gimnasio de prueba.',source:'seo',consent:true,privacy_version:'test-v1',surface_m2:120});
async function as(user,role='authenticated'){await db.exec(`reset role;set role ${role};`);await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user,role})]);}
async function command(action,data={},id=null,key=null,org=orgA){return (await db.query('select public.growth_command($1,$2,$3,$4,$5) as result',[org,action,id,JSON.stringify(data),key])).rows[0].result;}
before(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;grant usage on schema auth to authenticated,service_role,anon;grant execute on all functions in schema auth to authenticated,service_role,anon;`);
 await db.exec(await readFile(new URL('../db/growth.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../db/prospects.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../db/reports.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../db/content.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261110015905_growth_seo.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261110022415_growth_claude_geo.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261110023728_growth_seo_workspace.sql',import.meta.url),'utf8'));
 await db.query("insert into auth.users values ($1,'admin@test.example',now()),($2,'other@test.example',now()),($3,'viewer@test.example',now())",[admin,other,viewer]);
 await db.query("insert into public.growth_organizations(id,slug,name,domain,product,hubspot_portal_id) values ($1,'a','A','a.example','Gym','50738398'),($2,'b','B','b.example','Other','123')",[orgA,orgB]);
 await db.query("insert into growth_private.access values($1,'admin@test.example','admin',true),($2,'other@test.example','admin',true),($1,'viewer@test.example','viewer',true)",[orgA,orgB]);
});
after(async()=>{await db.close();});
test('SEO drafts require tenant evidence, remain unique and require a version-bound overlap review',async()=>{
 await as(null,'service_role');const url='https://www.matdepotmex.com/blog/mejor-piso-para-gimnasio.html';
 const audit=(await db.query('insert into growth_seo_audits(organization_id,report) values($1,$2) returning id',[orgA,JSON.stringify({inventory:[url],pages:[]})])).rows[0].id;
 await as(admin);const content=(action,data={},id=null)=>db.query('select growth_content_command($1,$2,$3,$4) as item',[orgA,action,id,JSON.stringify(data)]);
 const draft={title:'Revisión SEO del gimnasio',target_url:url,body:'Texto para revisión. '.repeat(15),sources:url,seo_key:'elegir',seo_context:{audit_id:audit,keyword:'piso gimnasio'}};
 const item=(await content('create',draft)).rows[0].item;assert.equal(item.seo_key,'elegir');assert.equal((await content('create',draft)).rows[0].item.id,item.id);
 await content('review',{version:1},item.id);await assert.rejects(content('approve',{version:1,verified:true},item.id),/seo_review_required/);
 assert.equal((await content('approve',{version:1,verified:true,seo_reviewed:true},item.id)).rows[0].item.seo_reviewed_version,1);
 assert.equal((await content('save',{...draft,version:1},item.id)).rows[0].item.seo_reviewed_version,null);
 await as(other);assert.equal((await db.query('select * from growth_seo_audits')).rows.length,0);
 await assert.rejects(db.query('insert into growth_seo_audits(organization_id,report) values($1,$2)',[orgB,'{}']),/permission denied/);
});
test('SEO workspace history is tenant-private, immutable, and generated drafts retain review gating',async()=>{
 await as(null,'service_role');const target='https://www.matdepotmex.com/categorias/gimnasios.html';const audit=(await db.query('insert into growth_seo_audits(organization_id,report) values($1,$2) returning id',[orgA,JSON.stringify({inventory:[target]})])).rows[0].id;
 const key=randomUUID();await db.query("insert into growth_seo_work(organization_id,kind,entity_key,version,data,created_by) values($1,'draft',$2,1,$3,$4)",[orgA,key,JSON.stringify({target_url:target,audit_id:audit}),admin]);
 await assert.rejects(db.query("update growth_seo_work set version=2"),/permission denied/);
 await as(other);assert.equal((await db.query('select * from growth_seo_work')).rows.length,0);
 await as(admin);assert.equal((await db.query('select * from growth_seo_work')).rows.length,1);await assert.rejects(db.query("insert into growth_seo_work(organization_id,kind,entity_key,version,data,created_by) values($1,'plan','forged',1,'{}',$2)",[orgA,admin]),/permission denied/);
 const data={title:'Borrador de gimnasio',target_url:target,body:'Texto pendiente de revisión. '.repeat(8),sources:target,seo_key:'workspace-'+key,seo_context:{audit_id:audit}};
 const item=(await db.query('select growth_content_command($1,\'create\',null,$2) as item',[orgA,JSON.stringify(data)])).rows[0].item;
 assert.equal(item.seo_key,data.seo_key);await db.query("select growth_content_command($1,'review',$2,$3)",[orgA,item.id,JSON.stringify({version:1})]);
 await assert.rejects(db.query("select growth_content_command($1,'approve',$2,$3)",[orgA,item.id,JSON.stringify({version:1,verified:true})]),/seo_review_required/);
 await assert.rejects(db.query('select growth_content_command($1,\'create\',null,$2)',[orgA,JSON.stringify({...data,seo_key:'workspace-'+randomUUID()})]),/invalid_seo_context/);
});
test('GEO manual observations enforce tenant, role, provenance and future-date constraints',async()=>{
 const insert=(org=orgA,method='manual',actor=admin,date='2026-01-01')=>db.query("insert into growth_geo_observations(organization_id,engine,model,prompt,response,evidence_url,market,observed_at,created_by,method) values($1,'Claude','not reported','Una consulta de prueba','Una respuesta de prueba con evidencia','https://example.com/evidence','México',$2,$3,$4)",[org,date,actor,method]);
 await as(admin);await insert();await assert.rejects(insert(orgB),/row-level security/);await assert.rejects(insert(orgA,'openai_api'),/row-level security/);await assert.rejects(insert(orgA,'manual',other),/row-level security/);await assert.rejects(insert(orgA,'manual',admin,'2099-01-01'),/row-level security/);
 await as(viewer);await assert.rejects(insert(orgA,'manual',viewer),/row-level security/);await as(other);assert.equal((await db.query('select * from growth_geo_observations')).rows.length,0);
});
test('AI reservations are server-only, deduplicate and bound costs across failed attempts',async()=>{
 await as(admin);await assert.rejects(db.query('select growth_reserve_ai($1,$2,$3)',[orgA,admin,randomUUID()]),/permission denied/);
 await as(null,'service_role');const key=randomUUID();const reserve=k=>db.query('select growth_reserve_ai($1,$2,$3)',[orgA,admin,k]);await reserve(key);await assert.rejects(reserve(key),/already_reserved/);
 for(let i=0;i<9;i++)await reserve(randomUUID());await db.query("update growth_ai_runs set status='failed' where organization_id=$1",[orgA]);await assert.rejects(reserve(randomUUID()),/ai_limit/);
 await as(other);assert.equal((await db.query('select * from growth_ai_runs')).rows.length,0);
});
test('editorial approval binds version, cannot cross tenants and edits invalidate approval',async()=>{const content=(action,data={},id=null)=>db.query('select growth_content_command($1,$2,$3,$4) as item',[orgA,action,id,JSON.stringify(data)]);await as(admin);const draft={title:'Piso de gimnasio',body:'Descripción verificada de los materiales y condiciones del piso para gimnasio. Revisar las medidas con el catálogo vigente antes de publicar.',sources:'https://www.matdepotmex.com/'};const id=(await content('create',draft)).rows[0].item.id;await assert.rejects(content('approve',{version:1,verified:true},id),/review_required/);await content('review',{version:1},id);await content('approve',{version:1,verified:true},id);const saved=(await content('save',{...draft,version:1},id)).rows[0].item;assert.equal(saved.status,'borrador');assert.equal(saved.approved_version,null);await assert.rejects(content('save',{...draft,version:1},id),/version_conflict/);await as(other);assert.equal((await db.query('select * from growth_content')).rows.length,0);await assert.rejects(content('review',{version:2},id),/forbidden/);await as(viewer);await assert.rejects(content('create',draft),/forbidden/);});
test('reports are private to members and only server can write',async()=>{await as(null,'service_role');await db.query("insert into growth_reports(organization_id,source,account_id,date_from,date_to,rows,method) values($1,'searchconsole','test','2026-10-01','2026-10-28','[]','assisted_import')",[orgA]);await as(admin);assert.equal((await db.query('select * from growth_reports')).rows.length,1);await assert.rejects(db.query("update growth_reports set rows='[]'"),/permission denied/);await as(other);assert.equal((await db.query('select * from growth_reports')).rows.length,0);await as(null,'anon');await assert.rejects(db.query('select * from growth_reports'),/permission denied/);});
test('prospects persist independently, deduplicate by client and enforce RLS',async()=>{
 await as(admin);const insert=(org=orgA)=>db.query("insert into growth_prospects(organization_id,denue_id,name,details) values($1,'iron-test','Gym test','{}') returning id",[org]);
 const id=(await insert()).rows[0].id;await assert.rejects(insert(),/duplicate key/);
 await assert.rejects(db.query('update growth_prospects set organization_id=$1 where id=$2',[orgB,id]),/permission denied/);
 await db.query("update growth_prospects set status='prioritario',notes='Revisado' where id=$1",[id]);
 await as(other);assert.equal((await db.query('select id from growth_prospects where id=$1',[id])).rows.length,0);await assert.rejects(insert(),/row-level security/);await insert(orgB);
 await as(viewer);await assert.rejects(insert(),/row-level security/);assert.equal((await db.query("update growth_prospects set notes='viewer' where id=$1 returning id",[id])).rows.length,0);
 await as(null,'anon');await assert.rejects(db.query('select * from growth_prospects'),/permission denied/);
 await as(admin);assert.equal((await db.query('select notes from growth_prospects where id=$1',[id])).rows[0].notes,'Revisado');
 assert.equal((await db.query('select count(*)::int as n from growth_requests')).rows[0].n,0);
});
test('durable request, approval and event are atomic; key replay is idempotent',async()=>{
 await as(admin);const p=payload(),key=randomUUID();const a=await command('create',p,null,key);const b=await command('create',p,null,key);assert.equal(a.id,b.id);assert.equal(b.duplicate,true);
 await assert.rejects(command('create',{...p,need:'changed payload'},null,key),/idempotency_conflict/);
 const jobs=await db.query('select id,status from growth_outbox where request_id=$1',[a.id]);assert.equal(jobs.rows.length,1);assert.equal(jobs.rows[0].status,'awaiting_approval');
 const events=await db.query('select action from growth_events where request_id=$1',[a.id]);assert.deepEqual(events.rows.map(x=>x.action),['created']);
});
test('RLS and command checks prevent cross-client reads, writes, and moves',async()=>{
 await as(admin);const a=await command('create',payload(),null,randomUUID());await as(other);
 assert.equal((await db.query('select * from growth_requests where id=$1',[a.id])).rows.length,0);
 assert.equal((await db.query('select * from growth_organizations where id=$1',[orgA])).rows.length,0);
 await assert.rejects(command('update',{version:1,status:'ganado'},a.id),/forbidden/);
 await assert.rejects(db.query('update growth_requests set organization_id=$1 where id=$2',[orgB,a.id]),/permission denied/);
});
test('viewers cannot write, anonymous cannot read or call the RPC',async()=>{
 await as(viewer);await assert.rejects(command('create',payload(),null,randomUUID()),/forbidden/);
 await as(null,'anon');await assert.rejects(db.query('select * from growth_requests'),/permission denied/);await assert.rejects(command('create',payload(),null,randomUUID()),/permission denied/);
});
test('consent and rate limits are enforced inside the database',async()=>{
 await as(admin);const p=payload();delete p.consent;await assert.rejects(command('create',p,null,randomUUID()),/consent_required/);p.consent=true;
 for(let i=0;i<5;i++)await command('create',p,null,randomUUID());await assert.rejects(command('create',p,null,randomUUID()),/rate_limit/);
});
test('approval uses exact version; concurrent edits invalidate approval',async()=>{
 await as(admin);const r=await command('create',payload(),null,randomUUID());await command('approve',{version:1},r.id);
 await command('update',{version:1,status:'calificado'},r.id);await assert.rejects(command('update',{version:1,status:'ganado'},r.id),/version_conflict/);
 const job=(await db.query('select id,status,approved_version from growth_outbox where request_id=$1',[r.id])).rows[0];assert.equal(job.status,'awaiting_approval');assert.equal(job.approved_version,null);
 await as(null,'service_role');assert.equal((await command('claim',{},job.id)).status,'not_ready');
});
test('only workers claim, lease is exclusive, notes required for success',async()=>{
 await as(admin);const r=await command('create',payload(),null,randomUUID());await command('approve',{version:1},r.id);const job=(await db.query('select id from growth_outbox where request_id=$1',[r.id])).rows[0];
 await assert.rejects(command('claim',{},job.id),/forbidden/);await as(null,'service_role');const lease=await command('claim',{},job.id);assert.equal(lease.status,'running');assert.equal((await command('claim',{},job.id)).status,'not_ready');
 await assert.rejects(command('finish',{lease:randomUUID(),status:'completed',note_id:'9'},job.id),/invalid_lease/);
 await assert.rejects(command('finish',{lease:lease.lease,status:'completed'},job.id),/incomplete_sync/);
 await command('checkpoint',{lease:lease.lease,phase:'contact_resolved',contact_id:'42'},job.id);await command('checkpoint',{lease:lease.lease,phase:'note_creating'},job.id);await command('finish',{lease:lease.lease,status:'completed',note_id:'99'},job.id);
 await as(admin);const done=(await db.query('select status,hubspot_contact_id,hubspot_note_id from growth_outbox where id=$1',[job.id])).rows[0];assert.equal(done.status,'completed');assert.equal(done.hubspot_note_id,'99');
 await assert.rejects(db.query('select lease_token,payload from growth_outbox'),/permission denied/);
});
test('expired leases require remote reconciliation instead of repeating a note',async()=>{
 await as(admin);const r=await command('create',payload(),null,randomUUID());await command('approve',{version:1},r.id);const job=(await db.query('select id from growth_outbox where request_id=$1',[r.id])).rows[0];
 await as(null,'service_role');await command('claim',{},job.id);await db.query("update growth_outbox set lease_expires_at=now()-interval '1 second' where id=$1",[job.id]);assert.equal((await command('claim',{},job.id)).status,'manual_review');
});
test('suppression blocks contact capture and blocks already approved jobs',async()=>{
 await as(admin);const p=payload(),r=await command('create',p,null,randomUUID());await command('approve',{version:1},r.id);await command('suppress',{kind:'email',value:p.email,reason:'Baja solicitada'});
 await assert.rejects(command('create',p,null,randomUUID()),/contact_suppressed/);const job=(await db.query('select status from growth_outbox where request_id=$1',[r.id])).rows[0];assert.equal(job.status,'blocked');
});
test('public intake stays disabled even for a privileged server call',async()=>{await as(null,'service_role');await assert.rejects(command('capture_public',payload(),null,randomUUID()),/capture_disabled/);});
