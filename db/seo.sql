create table public.growth_seo_audits (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.growth_organizations(id),
 created_at timestamptz not null default now(),report jsonb not null check(jsonb_typeof(report)='object' and octet_length(report::text)<3000000)
);
create index growth_seo_audits_org_date on public.growth_seo_audits(organization_id,created_at desc);
alter table public.growth_seo_audits enable row level security;
revoke all on public.growth_seo_audits from public,anon,authenticated;
grant select on public.growth_seo_audits to authenticated;
grant all on public.growth_seo_audits to service_role;
create policy growth_seo_audit_read on public.growth_seo_audits for select to authenticated using(growth_private.member_role(organization_id) is not null);

alter table public.growth_content add column seo_key text,add column seo_context jsonb,add column seo_reviewed_version integer;
create unique index growth_content_seo_key on public.growth_content(organization_id,seo_key) where seo_key is not null;

create table public.growth_geo_observations (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.growth_organizations(id),
 engine text not null check(engine in ('ChatGPT','Claude','Gemini','Perplexity')),model text not null check(length(model) between 1 and 120),
 prompt text not null check(length(prompt) between 10 and 2000),response text not null check(length(response) between 20 and 40000),
 citations text not null default '' check(length(citations)<8000),evidence_url text not null check(length(evidence_url)<1500 and evidence_url ~ '^https://'),
 market text not null check(length(market) between 2 and 100),observed_at timestamptz not null,
 method text not null default 'manual' check(method in ('manual','openai_api')),usage jsonb,created_by uuid not null default auth.uid(),created_at timestamptz not null default now()
);
create index growth_geo_org_date on public.growth_geo_observations(organization_id,observed_at desc);
alter table public.growth_geo_observations enable row level security;
revoke all on public.growth_geo_observations from public,anon,authenticated;
grant select,insert on public.growth_geo_observations to authenticated;
grant all on public.growth_geo_observations to service_role;
create policy growth_geo_read on public.growth_geo_observations for select to authenticated using(growth_private.member_role(organization_id) is not null);
create policy growth_geo_create on public.growth_geo_observations for insert to authenticated with check(growth_private.member_role(organization_id) in ('admin','sales') and created_by=auth.uid() and observed_at<=now() and observed_at>='2020-01-01' and method='manual');

create table public.growth_ai_runs (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.growth_organizations(id),
 requested_by uuid not null,request_key uuid not null,created_at timestamptz not null default now(),
 status text not null default 'reserved' check(status in ('reserved','completed','failed')),usage jsonb,error_code text,
 unique(organization_id,request_key)
);
alter table public.growth_ai_runs enable row level security;
revoke all on public.growth_ai_runs from public,anon,authenticated;
grant select on public.growth_ai_runs to authenticated;
grant all on public.growth_ai_runs to service_role;
create policy growth_ai_runs_read on public.growth_ai_runs for select to authenticated using(growth_private.member_role(organization_id) is not null);
create function public.growth_reserve_ai(p_org uuid,p_user uuid,p_key uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_org::text,0));
 if exists(select 1 from public.growth_ai_runs where organization_id=p_org and request_key=p_key) then raise exception 'already_reserved';end if;
 if (select count(*) from public.growth_ai_runs where organization_id=p_org and created_at>=now()-interval '24 hours')>=10 or
    (select count(*) from public.growth_ai_runs where organization_id=p_org and created_at>=date_trunc('month',now() at time zone 'America/Mexico_City') at time zone 'America/Mexico_City')>=100 then raise exception 'ai_limit';end if;
 insert into public.growth_ai_runs(organization_id,requested_by,request_key) values(p_org,p_user,p_key) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.growth_reserve_ai(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.growth_reserve_ai(uuid,uuid,uuid) to service_role;
