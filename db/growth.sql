-- Additive schema: the legacy ialeads tables and policies remain unchanged.
create schema if not exists growth_private;
revoke all on schema growth_private from public, anon;
grant usage on schema growth_private to authenticated, service_role;

create table public.growth_organizations (
 id uuid primary key default gen_random_uuid(), slug text not null unique,
 name text not null, domain text not null, product text not null,
 hubspot_portal_id text, public_capture_enabled boolean not null default false,
 created_at timestamptz not null default now()
);
create table growth_private.access (
 organization_id uuid not null references public.growth_organizations(id),
 email text not null check(email=lower(email)), role text not null check(role in ('admin','sales','viewer')),
 active boolean not null default true, primary key(organization_id,email)
);
alter table growth_private.access enable row level security;
revoke all on growth_private.access from public, anon, authenticated;

create function growth_private.member_role(p_org uuid) returns text language sql stable security definer set search_path='' as $$
 select a.role from growth_private.access a join auth.users u on lower(u.email)=a.email
 where a.organization_id=p_org and a.active and u.id=(select auth.uid()) and u.email_confirmed_at is not null
$$;
revoke all on function growth_private.member_role(uuid) from public,anon;
grant execute on function growth_private.member_role(uuid) to authenticated,service_role;

create table public.growth_requests (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.growth_organizations(id),
 idempotency_key uuid not null, payload_hash text not null,
 name text not null, company text not null default '', email text not null, phone text not null default '',
 need text not null, product text not null, surface_m2 numeric check(surface_m2>0 and surface_m2<=1000000),
 use_area text not null default '', postal_code text not null default '', required_date date,
 source text not null check(source in ('seo','geo','pauta_google','pauta_chatgpt','prospeccion_denue','prospeccion_web','referido','directo','otro')),
 attribution jsonb not null default '{}', consent_at timestamptz not null, privacy_version text not null,
 status text not null default 'nuevo' check(status in ('nuevo','en_contacto','calificado','oportunidad_aceptada','cotizacion','ganado','perdido','descartado')),
 owner_name text not null default '', reason text not null default '', amount_mxn numeric check(amount_mxn>=0),
 version integer not null default 1, first_response_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,idempotency_key), unique(organization_id,id)
);
create index growth_requests_org_created on public.growth_requests(organization_id,created_at desc);
create index growth_requests_org_email on public.growth_requests(organization_id,email,created_at desc);
create table public.growth_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.growth_organizations(id),
 request_id uuid, actor_id uuid, action text not null, detail jsonb not null default '{}',created_at timestamptz not null default now(),
 foreign key(organization_id,request_id) references public.growth_requests(organization_id,id)
);
create index growth_events_org_request on public.growth_events(organization_id,request_id,created_at desc);
create table public.growth_suppressions (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.growth_organizations(id),
 kind text not null check(kind in ('email','domain')),value text not null,reason text not null,
 created_at timestamptz not null default now(),unique(organization_id,kind,value)
);
create table public.growth_outbox (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.growth_organizations(id),
 request_id uuid not null, status text not null default 'awaiting_approval' check(status in ('awaiting_approval','ready','running','retry','completed','blocked','manual_review')),
 approved_version integer, approved_by uuid,approved_at timestamptz,payload jsonb,
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 lease_token uuid,lease_expires_at timestamptz, phase text not null default 'contact',
 hubspot_contact_id text,hubspot_note_id text,last_error text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,request_id),foreign key(organization_id,request_id) references public.growth_requests(organization_id,id)
);
create index growth_outbox_org_status on public.growth_outbox(organization_id,status,next_attempt_at);

alter table public.growth_organizations enable row level security;
alter table public.growth_requests enable row level security;
alter table public.growth_events enable row level security;
alter table public.growth_suppressions enable row level security;
alter table public.growth_outbox enable row level security;
create policy growth_org_read on public.growth_organizations for select to authenticated using(growth_private.member_role(id) is not null);
create policy growth_request_read on public.growth_requests for select to authenticated using(growth_private.member_role(organization_id) is not null);
create policy growth_event_read on public.growth_events for select to authenticated using(growth_private.member_role(organization_id) is not null);
create policy growth_suppression_read on public.growth_suppressions for select to authenticated using(growth_private.member_role(organization_id) is not null);
create policy growth_outbox_read on public.growth_outbox for select to authenticated using(growth_private.member_role(organization_id) is not null);
revoke all on public.growth_organizations,public.growth_requests,public.growth_events,public.growth_suppressions,public.growth_outbox from public,anon,authenticated;
grant select on public.growth_organizations,public.growth_requests,public.growth_events,public.growth_suppressions to authenticated;
grant select(id,organization_id,request_id,status,approved_version,approved_by,approved_at,attempts,next_attempt_at,phase,hubspot_contact_id,hubspot_note_id,last_error,created_at,updated_at) on public.growth_outbox to authenticated;
grant all on public.growth_organizations,public.growth_requests,public.growth_events,public.growth_suppressions,public.growth_outbox to service_role;

create function growth_private.suppressed(p_org uuid,p_email text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.growth_suppressions where organization_id=p_org and ((kind='email' and value=lower(p_email)) or (kind='domain' and value=split_part(lower(p_email),'@',2))))
$$;
revoke all on function growth_private.suppressed(uuid,text) from public,anon,authenticated;

create function growth_private.command(p_org uuid,p_action text,p_id uuid,p_data jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 v_role text:=growth_private.member_role(p_org);
 v_service boolean:=coalesce((select auth.jwt()->>'role')='service_role',false);
 v_req public.growth_requests; v_job public.growth_outbox; v_org public.growth_organizations;
 v_email text; v_hash text; v_id uuid; v_status text; v_snapshot jsonb; v_lease uuid;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>20000 then raise exception 'invalid_payload' using errcode='22023'; end if;
 select * into v_org from public.growth_organizations where id=p_org;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 if p_action in ('claim','checkpoint','finish','capture_public') then
   if not v_service then raise exception 'forbidden' using errcode='42501'; end if;
 elsif v_role is null or v_role not in ('admin','sales') then raise exception 'forbidden' using errcode='42501';
 end if;

 if p_action in ('create','capture_public') then
   if p_action='capture_public' and not v_org.public_capture_enabled then raise exception 'capture_disabled' using errcode='42501'; end if;
   if p_key is null or (p_data->>'consent') is distinct from 'true' or coalesce(p_data->>'privacy_version','')='' then raise exception 'consent_required' using errcode='22023'; end if;
   v_email:=lower(btrim(p_data->>'email'));
   if v_email is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(v_email)>254
      or coalesce(length(btrim(p_data->>'name')),0) not between 2 and 120
      or coalesce(length(btrim(p_data->>'need')),0) not between 10 and 5000
      or length(coalesce(p_data->>'company',''))>200 or length(coalesce(p_data->>'phone',''))>40
      or coalesce(p_data->>'source','') not in ('seo','geo','pauta_google','pauta_chatgpt','prospeccion_denue','prospeccion_web','referido','directo','otro')
   then raise exception 'invalid_request' using errcode='22023'; end if;
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_org::text,0));
   v_hash:=md5(p_data::text);
   select * into v_req from public.growth_requests where organization_id=p_org and idempotency_key=p_key;
   if found then
      if v_req.payload_hash<>v_hash then raise exception 'idempotency_conflict' using errcode='23505'; end if;
      return jsonb_build_object('id',v_req.id,'duplicate',true);
   end if;
   if growth_private.suppressed(p_org,v_email) then raise exception 'contact_suppressed' using errcode='42501'; end if;
   if (select count(*) from public.growth_requests where organization_id=p_org and created_at>now()-interval '1 hour')>=100
     or (select count(*) from public.growth_requests where organization_id=p_org and email=v_email and created_at>now()-interval '1 hour')>=5
     then raise exception 'rate_limit' using errcode='P0001'; end if;
   insert into public.growth_requests(organization_id,idempotency_key,payload_hash,name,company,email,phone,need,product,surface_m2,use_area,postal_code,required_date,source,attribution,consent_at,privacy_version)
   values(p_org,p_key,v_hash,btrim(p_data->>'name'),btrim(coalesce(p_data->>'company','')),v_email,btrim(coalesce(p_data->>'phone','')),btrim(p_data->>'need'),v_org.product,
     nullif(p_data->>'surface_m2','')::numeric,left(coalesce(p_data->>'use_area',''),120),left(coalesce(p_data->>'postal_code',''),12),nullif(p_data->>'required_date','')::date,
     p_data->>'source',coalesce(p_data->'attribution','{}'),now(),left(p_data->>'privacy_version',100)) returning * into v_req;
   insert into public.growth_outbox(organization_id,request_id) values(p_org,v_req.id);
   insert into public.growth_events(organization_id,request_id,actor_id,action,detail) values(p_org,v_req.id,auth.uid(),'created',jsonb_build_object('source',v_req.source,'entry',p_action));
   return jsonb_build_object('id',v_req.id,'duplicate',false);
 end if;

 if p_action='suppress' then
   if v_role<>'admin' then raise exception 'forbidden' using errcode='42501'; end if;
   if p_data->>'kind' not in ('email','domain') or coalesce(length(btrim(p_data->>'value')),0)<3 or coalesce(length(btrim(p_data->>'reason')),0)<3 then raise exception 'invalid_suppression'; end if;
   insert into public.growth_suppressions(organization_id,kind,value,reason) values(p_org,p_data->>'kind',lower(btrim(p_data->>'value')),left(p_data->>'reason',500)) on conflict do nothing;
   update public.growth_outbox j set status='blocked',last_error='contact_suppressed',updated_at=now() from public.growth_requests r where j.organization_id=p_org and r.id=j.request_id and r.organization_id=p_org and growth_private.suppressed(p_org,r.email) and j.status in ('awaiting_approval','ready','retry');
   insert into public.growth_events(organization_id,actor_id,action,detail) values(p_org,auth.uid(),'suppressed',jsonb_build_object('kind',p_data->>'kind','value',lower(btrim(p_data->>'value'))));
   return jsonb_build_object('ok',true);
 end if;

 if p_action in ('update','note','approve') then
   select * into v_req from public.growth_requests where organization_id=p_org and id=p_id for update;
   if not found then raise exception 'not_found' using errcode='P0002'; end if;
   if p_action='note' then
      if coalesce(length(btrim(p_data->>'text')),0) not between 1 and 4000 then raise exception 'invalid_note'; end if;
      insert into public.growth_events(organization_id,request_id,actor_id,action,detail) values(p_org,p_id,auth.uid(),'note',jsonb_build_object('text',btrim(p_data->>'text')));
      return jsonb_build_object('ok',true);
   end if;
   select * into v_job from public.growth_outbox where organization_id=p_org and request_id=p_id for update;
   if v_job.status in ('running','manual_review') then raise exception 'sync_locked'; end if;
   if p_action='update' then
     if (p_data->>'version')::integer is distinct from v_req.version then raise exception 'version_conflict' using errcode='40001'; end if;
     v_status:=coalesce(p_data->>'status',v_req.status);
     if v_status in ('perdido','descartado') and coalesce(length(btrim(p_data->>'reason')),0)<3 then raise exception 'reason_required'; end if;
     update public.growth_requests set status=v_status,owner_name=left(coalesce(p_data->>'owner_name',owner_name),120),reason=left(coalesce(p_data->>'reason',reason),1000),
       amount_mxn=case when p_data ? 'amount_mxn' then nullif(p_data->>'amount_mxn','')::numeric else amount_mxn end,
       first_response_at=case when p_data->>'responded'='true' then coalesce(first_response_at,now()) else first_response_at end,
       version=version+1,updated_at=now() where organization_id=p_org and id=p_id;
     if v_job.status<>'completed' then update public.growth_outbox set status='awaiting_approval',approved_by=null,approved_at=null,approved_version=null,payload=null,updated_at=now() where id=v_job.id; end if;
   else
     if v_role<>'admin' then raise exception 'forbidden' using errcode='42501'; end if;
     if (p_data->>'version')::integer is distinct from v_req.version then raise exception 'version_conflict' using errcode='40001'; end if;
     if v_org.hubspot_portal_id is null then raise exception 'portal_not_configured'; end if;
     if growth_private.suppressed(p_org,v_req.email) then raise exception 'contact_suppressed'; end if;
     if v_job.status='completed' then raise exception 'already_synced'; end if;
     v_snapshot:=to_jsonb(v_req)-'payload_hash'-'idempotency_key';
     update public.growth_outbox set status='ready',approved_by=auth.uid(),approved_at=now(),approved_version=v_req.version,payload=v_snapshot||jsonb_build_object('hubspot_portal_id',v_org.hubspot_portal_id,'organization_name',v_org.name),next_attempt_at=now(),last_error=null,updated_at=now() where id=v_job.id;
   end if;
   insert into public.growth_events(organization_id,request_id,actor_id,action,detail) values(p_org,p_id,auth.uid(),p_action,jsonb_build_object('version',v_req.version));
   return jsonb_build_object('ok',true);
 end if;

 if p_action in ('claim','checkpoint','finish') then
   select * into v_job from public.growth_outbox where organization_id=p_org and id=p_id for update;
   if not found then raise exception 'not_found'; end if;
   if p_action='claim' then
     if v_job.status='running' and v_job.lease_expires_at<now() then
       update public.growth_outbox set status='manual_review',last_error='lease_expired_check_remote_before_retry',lease_token=null,updated_at=now() where id=p_id;
       return jsonb_build_object('status','manual_review');
     end if;
     if v_job.status not in ('ready','retry') or v_job.next_attempt_at>now() then return jsonb_build_object('status','not_ready'); end if;
     select * into v_req from public.growth_requests where organization_id=p_org and id=v_job.request_id;
     if growth_private.suppressed(p_org,v_req.email) then
        update public.growth_outbox set status='blocked',last_error='contact_suppressed' where id=p_id; return jsonb_build_object('status','blocked');
     end if;
     if v_job.approved_version<>v_req.version or v_job.approved_by is null or v_job.attempts>=5 then raise exception 'approval_or_attempt_limit'; end if;
     v_lease:=gen_random_uuid();
     update public.growth_outbox set status='running',lease_token=v_lease,lease_expires_at=now()+interval '5 minutes',attempts=attempts+1,updated_at=now() where id=p_id;
     return jsonb_build_object('status','running','lease',v_lease,'payload',v_job.payload,'contact_id',v_job.hubspot_contact_id,'phase',v_job.phase,'attempt',v_job.attempts+1);
   end if;
   if v_job.status<>'running' or v_job.lease_token is distinct from (p_data->>'lease')::uuid or v_job.lease_expires_at<now() then raise exception 'invalid_lease'; end if;
   if p_action='checkpoint' then
     if p_data->>'phase' not in ('contact_resolved','note_creating') then raise exception 'invalid_phase'; end if;
     if growth_private.suppressed(p_org,v_job.payload->>'email') then raise exception 'contact_suppressed'; end if;
     update public.growth_outbox set phase=p_data->>'phase',hubspot_contact_id=coalesce(p_data->>'contact_id',hubspot_contact_id),updated_at=now() where id=p_id;
   else
     v_status:=p_data->>'status';
     if v_status not in ('completed','retry','blocked','manual_review') then raise exception 'invalid_status'; end if;
     if v_status='completed' and (coalesce(p_data->>'note_id','')='' or v_job.hubspot_contact_id is null) then raise exception 'incomplete_sync'; end if;
     update public.growth_outbox set status=case when v_status='retry' and attempts>=5 then 'blocked' else v_status end,
       hubspot_note_id=p_data->>'note_id',last_error=left(p_data->>'error',200),lease_token=null,lease_expires_at=null,
       next_attempt_at=now()+make_interval(secs=>least(3600,greatest(30,coalesce((p_data->>'retry_seconds')::integer,60)))),updated_at=now() where id=p_id;
     insert into public.growth_events(organization_id,request_id,action,detail) values(p_org,v_job.request_id,'sync_'||v_status,jsonb_build_object('job_id',p_id));
   end if;
   return jsonb_build_object('ok',true);
 end if;
 raise exception 'unknown_action';
end $$;
revoke all on function growth_private.command(uuid,text,uuid,jsonb,uuid) from public,anon;
grant execute on function growth_private.command(uuid,text,uuid,jsonb,uuid) to authenticated,service_role;

create function public.growth_command(p_org uuid,p_action text,p_id uuid default null,p_data jsonb default '{}',p_key uuid default null) returns jsonb
language sql security invoker set search_path='' as $$ select growth_private.command(p_org,p_action,p_id,p_data,p_key) $$;
revoke all on function public.growth_command(uuid,text,uuid,jsonb,uuid) from public,anon;
grant execute on function public.growth_command(uuid,text,uuid,jsonb,uuid) to authenticated,service_role;
