create table public.growth_reports (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.growth_organizations(id),
 source text not null check(source in ('googleanalytics4','searchconsole')),
 account_id text not null, date_from date not null,date_to date not null check(date_to>=date_from),
 rows jsonb not null check(jsonb_typeof(rows)='array' and octet_length(rows::text)<2000000),
 fetched_at timestamptz not null default now(),
 method text not null check(method in ('assisted_import','server_api')),
 unique(organization_id,source,date_from,date_to)
);
alter table public.growth_reports enable row level security;
revoke all on public.growth_reports from public,anon,authenticated;
grant select on public.growth_reports to authenticated;
grant all on public.growth_reports to service_role;
create policy growth_report_read on public.growth_reports for select to authenticated using(growth_private.member_role(organization_id) is not null);
