create table public.growth_prospects (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.growth_organizations(id),
 denue_id text not null check(length(denue_id) between 1 and 40),
 name text not null check(length(name) between 1 and 300),
 details jsonb not null check(jsonb_typeof(details)='object' and octet_length(details::text)<20000),
 search_filters jsonb not null default '{}' check(jsonb_typeof(search_filters)='object' and octet_length(search_filters::text)<5000),
 source text not null default 'INEGI DENUE / Iron' check(source='INEGI DENUE / Iron'),
 status text not null default 'por_revisar' check(status in ('por_revisar','prioritario','descartado')),
 notes text not null default '' check(length(notes)<=4000),
 created_by uuid not null default auth.uid(),
 fetched_at timestamptz not null default now(),
 unique(organization_id,denue_id)
);
alter table public.growth_prospects enable row level security;
revoke all on public.growth_prospects from public,anon,authenticated;
grant select on public.growth_prospects to authenticated;
grant insert(organization_id,denue_id,name,details,search_filters) on public.growth_prospects to authenticated;
grant update(status,notes) on public.growth_prospects to authenticated;
grant all on public.growth_prospects to service_role;
create policy growth_prospect_read on public.growth_prospects for select to authenticated using(growth_private.member_role(organization_id) is not null);
create policy growth_prospect_insert on public.growth_prospects for insert to authenticated with check(growth_private.member_role(organization_id) in ('admin','sales') and created_by=(select auth.uid()));
create policy growth_prospect_update on public.growth_prospects for update to authenticated using(growth_private.member_role(organization_id) in ('admin','sales')) with check(growth_private.member_role(organization_id) in ('admin','sales'));
