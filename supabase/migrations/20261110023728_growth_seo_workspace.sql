create table public.growth_seo_work (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.growth_organizations(id),
 kind text not null check(kind in ('plan','foundation','issue','search','performance','draft','research')),
 entity_key text not null check(length(entity_key) between 1 and 1000),
 version integer not null check(version>0),
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<1500000),
 created_by uuid not null,created_at timestamptz not null default now(),
 unique(organization_id,kind,entity_key,version)
);
create index growth_seo_work_org_date on public.growth_seo_work(organization_id,created_at desc);
alter table public.growth_seo_work enable row level security;
revoke all on public.growth_seo_work from public,anon,authenticated;
grant select on public.growth_seo_work to authenticated;
grant select,insert on public.growth_seo_work to service_role;
create policy growth_seo_work_read on public.growth_seo_work for select to authenticated using(growth_private.member_role(organization_id) is not null);

create or replace function growth_private.content_command(p_org uuid,p_action text,p_id uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_role text:=growth_private.member_role(p_org);v_item public.growth_content;
begin
 if v_role is null or v_role not in ('admin','sales') then raise exception 'forbidden' using errcode='42501';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>100000 then raise exception 'invalid_payload';end if;
 if p_action in ('create','save') then
  if coalesce(length(btrim(p_data->>'title')),0) not between 3 and 200 or length(coalesce(p_data->>'body',''))>60000 or length(coalesce(p_data->>'sources',''))>10000 or length(coalesce(p_data->>'target_url',''))>1000 then raise exception 'invalid_content';end if;
 end if;
 if p_action='create' then
  if p_data->>'seo_key' is not null then
   if (p_data->>'seo_key' not in ('elegir','formatos','espesor','instalar','limpiar','precio','comparar','cotizar','categoria','artes') and not exists(select 1 from public.growth_seo_work w where w.organization_id=p_org and w.kind='draft' and 'workspace-'||w.entity_key=p_data->>'seo_key' and w.data->>'target_url'=p_data->>'target_url' and w.data->>'audit_id'=p_data->'seo_context'->>'audit_id')) or not exists(select 1 from public.growth_seo_audits a where a.id=(p_data->'seo_context'->>'audit_id')::uuid and a.organization_id=p_org and a.report->'inventory' ? (p_data->>'target_url')) then raise exception 'invalid_seo_context';end if;
   select * into v_item from public.growth_content where organization_id=p_org and seo_key=p_data->>'seo_key';
   if found then return to_jsonb(v_item);end if;
  end if;
  insert into public.growth_content(organization_id,title,body,sources,target_url) values(p_org,btrim(p_data->>'title'),coalesce(p_data->>'body',''),coalesce(p_data->>'sources',''),coalesce(p_data->>'target_url','')) returning * into v_item;
  if p_data->>'seo_key' is not null then update public.growth_content set seo_key=p_data->>'seo_key',seo_context=p_data->'seo_context' where id=v_item.id returning * into v_item;end if;
 else
  select * into v_item from public.growth_content where organization_id=p_org and id=p_id for update;
  if not found then raise exception 'not_found';end if;
  if (p_data->>'version')::integer is distinct from v_item.version then raise exception 'version_conflict';end if;
  if p_action='save' then
   update public.growth_content set title=btrim(p_data->>'title'),body=coalesce(p_data->>'body',''),sources=coalesce(p_data->>'sources',''),target_url=coalesce(p_data->>'target_url',''),version=version+1,seo_reviewed_version=null,status='borrador',approved_version=null,approved_by=null,approved_at=null,updated_at=now() where id=p_id returning * into v_item;
  elsif p_action='review' then
   if length(btrim(v_item.body))<100 or length(btrim(v_item.sources))<10 then raise exception 'content_and_sources_required';end if;
   update public.growth_content set status='revision',approved_version=null,approved_by=null,approved_at=null,updated_at=now() where id=p_id returning * into v_item;
  elsif p_action='approve' then
   if v_role<>'admin' then raise exception 'forbidden';end if;
   if v_item.seo_key is not null and p_data->>'seo_reviewed' is distinct from 'true' then raise exception 'seo_review_required';end if;
   if v_item.status<>'revision' or p_data->>'verified' is distinct from 'true' then raise exception 'review_required';end if;
   update public.growth_content set status='aprobado',seo_reviewed_version=case when seo_key is not null then version else null end,approved_version=version,approved_by=auth.uid(),approved_at=now(),updated_at=now() where id=p_id returning * into v_item;
  else raise exception 'unknown_action';end if;
 end if;
 insert into public.growth_events(organization_id,actor_id,action,detail) values(p_org,auth.uid(),'content_'||p_action,jsonb_build_object('content_id',v_item.id,'version',v_item.version));
 return to_jsonb(v_item);
end $$;
revoke all on function growth_private.content_command(uuid,text,uuid,jsonb) from public,anon;
grant execute on function growth_private.content_command(uuid,text,uuid,jsonb) to authenticated;
create or replace function public.growth_content_command(p_org uuid,p_action text,p_id uuid default null,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select growth_private.content_command(p_org,p_action,p_id,p_data) $$;
revoke all on function public.growth_content_command(uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.growth_content_command(uuid,text,uuid,jsonb) to authenticated;

