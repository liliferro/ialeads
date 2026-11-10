create table public.growth_content (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.growth_organizations(id),
 title text not null,target_url text not null default '',body text not null default '',sources text not null default '',
 status text not null default 'borrador' check(status in ('borrador','revision','aprobado')),
 version integer not null default 1,approved_version integer,approved_by uuid,approved_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index growth_content_org_updated on public.growth_content(organization_id,updated_at desc);
alter table public.growth_content enable row level security;
revoke all on public.growth_content from public,anon,authenticated;
grant select on public.growth_content to authenticated;
grant all on public.growth_content to service_role;
create policy growth_content_read on public.growth_content for select to authenticated using(growth_private.member_role(organization_id) is not null);
create function growth_private.content_command(p_org uuid,p_action text,p_id uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_role text:=growth_private.member_role(p_org);v_item public.growth_content;
begin
 if v_role is null or v_role not in ('admin','sales') then raise exception 'forbidden' using errcode='42501';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>100000 then raise exception 'invalid_payload';end if;
 if p_action in ('create','save') then
  if coalesce(length(btrim(p_data->>'title')),0) not between 3 and 200 or length(coalesce(p_data->>'body',''))>60000 or length(coalesce(p_data->>'sources',''))>10000 or length(coalesce(p_data->>'target_url',''))>1000 then raise exception 'invalid_content';end if;
 end if;
 if p_action='create' then
  insert into public.growth_content(organization_id,title,body,sources,target_url) values(p_org,btrim(p_data->>'title'),coalesce(p_data->>'body',''),coalesce(p_data->>'sources',''),coalesce(p_data->>'target_url','')) returning * into v_item;
 else
  select * into v_item from public.growth_content where organization_id=p_org and id=p_id for update;
  if not found then raise exception 'not_found';end if;
  if (p_data->>'version')::integer is distinct from v_item.version then raise exception 'version_conflict';end if;
  if p_action='save' then
   update public.growth_content set title=btrim(p_data->>'title'),body=coalesce(p_data->>'body',''),sources=coalesce(p_data->>'sources',''),target_url=coalesce(p_data->>'target_url',''),version=version+1,status='borrador',approved_version=null,approved_by=null,approved_at=null,updated_at=now() where id=p_id returning * into v_item;
  elsif p_action='review' then
   if length(btrim(v_item.body))<100 or length(btrim(v_item.sources))<10 then raise exception 'content_and_sources_required';end if;
   update public.growth_content set status='revision',approved_version=null,approved_by=null,approved_at=null,updated_at=now() where id=p_id returning * into v_item;
  elsif p_action='approve' then
   if v_role<>'admin' then raise exception 'forbidden';end if;
   if v_item.status<>'revision' or p_data->>'verified' is distinct from 'true' then raise exception 'review_required';end if;
   update public.growth_content set status='aprobado',approved_version=version,approved_by=auth.uid(),approved_at=now(),updated_at=now() where id=p_id returning * into v_item;
  else raise exception 'unknown_action';end if;
 end if;
 insert into public.growth_events(organization_id,actor_id,action,detail) values(p_org,auth.uid(),'content_'||p_action,jsonb_build_object('content_id',v_item.id,'version',v_item.version));
 return to_jsonb(v_item);
end $$;
revoke all on function growth_private.content_command(uuid,text,uuid,jsonb) from public,anon;
grant execute on function growth_private.content_command(uuid,text,uuid,jsonb) to authenticated;
create function public.growth_content_command(p_org uuid,p_action text,p_id uuid default null,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select growth_private.content_command(p_org,p_action,p_id,p_data) $$;
revoke all on function public.growth_content_command(uuid,text,uuid,jsonb) from public,anon;
grant execute on function public.growth_content_command(uuid,text,uuid,jsonb) to authenticated;
