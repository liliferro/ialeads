-- ialeads · esquema inicial (piloto único)
-- Todas las tablas con RLS. El público solo puede usar las funciones submit_lead y enrich_lead.

create table public.allowed_emails (
  email text primary key,
  role text not null default 'mood' check (role in ('mood','cliente')),
  created_at timestamptz not null default now()
);

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_emails where lower(email) = lower(coalesce(auth.jwt()->>'email','')));
$$;
revoke all on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;

create table public.settings (
  id int primary key default 1 check (id = 1),
  client_name text not null default 'Cliente piloto',
  product_line text not null default '',
  icp_scian text[] not null default '{}',      -- prefijos SCIAN que encajan; vacío = cualquiera
  icp_states text[] not null default '{}',     -- estados que encajan; vacío = cualquiera
  estrato_min int not null default 4,          -- 4 = 31 a 50 personas
  estrato_max int not null default 6,          -- 6 = 101 a 250 personas
  cpl_max_mxn numeric,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  legal_name text,
  domain text,
  website text,
  denue_id text unique,
  scian text,
  giro text,
  estrato int,
  state text,
  municipality text,
  phone text,
  email text,
  fit text check (fit in ('A','B','C','sin_coincidencia')),
  origins text[] not null default '{}',        -- denue, web, entrante
  source_url text,
  status text not null default 'nueva' check (status in ('nueva','verificada','en_secuencia','respondio','calificada','descartada')),
  discard_reason text,
  contact_name text,
  contact_role text,
  seq_step int not null default 0,
  next_action_at date,
  sequence_paused boolean not null default false,
  notes text
);
create index companies_name_idx on public.companies (lower(name));
create index companies_domain_idx on public.companies (domain);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null default 'directo' check (source in ('seo','geo','pauta_google','pauta_chatgpt','prospeccion_denue','prospeccion_web','referido','directo','otro')),
  utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
  gclid text, landing_page text, referrer text,
  name text not null,
  company_name text,
  state text,
  municipality text,
  email text,
  phone text,
  preferred_channel text,
  need text not null,
  intent text not null default 'informacion' check (intent in ('cotizacion','informacion')),
  consent_followup boolean not null default false,
  consent_whatsapp boolean not null default false,
  privacy_accepted_at timestamptz not null,
  company_id uuid references public.companies(id) on delete set null,
  fit text check (fit in ('A','B','C','sin_coincidencia')),
  match_confidence text check (match_confidence in ('alta','dudosa')),
  denue_match jsonb,
  route text check (route in ('vendedor','sdr','verificar','menudeo','descartado')),
  status text not null default 'nuevo' check (status in ('nuevo','en_contacto','calificado','oportunidad_aceptada','rechazado','descartado')),
  status_reason text,
  first_response_at timestamptz,
  assigned_to text,
  hubspot_id text,
  hubspot_status text not null default 'pendiente',
  enrich_token uuid default gen_random_uuid()
);
create index leads_created_idx on public.leads (created_at desc);
create index leads_company_idx on public.leads (company_id);

create table public.lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  at timestamptz not null default now(),
  actor text,
  type text not null,
  detail text
);
create index lead_events_lead_idx on public.lead_events (lead_id);

create table public.suppressions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('email','dominio','telefono')),
  value text not null,
  reason text,
  unique (kind, value)
);

create table public.content_pieces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  target_query text,
  format text,
  status text not null default 'backlog' check (status in ('backlog','brief','borrador','revision','aprobado','publicado')),
  url text,
  approved_by text,
  published_at date,
  notes text
);

create table public.ad_spend (
  id bigint generated always as identity primary key,
  day date not null,
  source text not null check (source in ('pauta_google','pauta_chatgpt')),
  campaign text,
  amount_mxn numeric not null check (amount_mxn >= 0),
  clicks int
);

-- RLS
alter table public.allowed_emails enable row level security;
alter table public.settings enable row level security;
alter table public.companies enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.suppressions enable row level security;
alter table public.content_pieces enable row level security;
alter table public.ad_spend enable row level security;

create policy members_all on public.allowed_emails for all to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy members_all on public.settings for all to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy members_all on public.companies for all to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy members_all on public.leads for all to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy members_all on public.lead_events for all to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy members_all on public.suppressions for all to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy members_all on public.content_pieces for all to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy members_all on public.ad_spend for all to authenticated using ((select public.is_member())) with check ((select public.is_member()));

-- Encaje con el ICP a partir de los datos del DENUE (regla inicial, ajustable)
create or replace function public.compute_fit(p_scian text, p_estrato int, p_state text) returns text
language plpgsql stable security definer set search_path = public as $$
declare s public.settings; pts int := 0;
begin
  select * into s from public.settings where id = 1;
  if cardinality(s.icp_scian) = 0 or exists (select 1 from unnest(s.icp_scian) x where coalesce(p_scian,'') like x || '%') then pts := pts + 1; end if;
  if p_estrato is not null and p_estrato between s.estrato_min and s.estrato_max then pts := pts + 1; end if;
  if cardinality(s.icp_states) = 0 or exists (select 1 from unnest(s.icp_states) x where lower(x) = lower(coalesce(p_state,''))) then pts := pts + 1; end if;
  return case when pts = 3 then 'A' when pts = 2 then 'B' else 'C' end;
end $$;
revoke all on function public.compute_fit(text,int,text) from public, anon;
grant execute on function public.compute_fit(text,int,text) to authenticated;

-- Entrada pública: crea el lead con los campos del formulario
create or replace function public.submit_lead(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.leads; v_recent int;
begin
  if coalesce(trim(p->>'name'),'') = '' or coalesce(trim(p->>'need'),'') = '' then raise exception 'Faltan nombre o necesidad'; end if;
  if coalesce(trim(p->>'email'),'') = '' and coalesce(trim(p->>'phone'),'') = '' then raise exception 'Falta un medio de contacto'; end if;
  if coalesce((p->>'privacy_accepted')::boolean, false) is not true then raise exception 'Falta aceptar el aviso de privacidad'; end if;
  if length(p::text) > 8000 then raise exception 'Solicitud demasiado larga'; end if;
  select count(*) into v_recent from public.leads where created_at > now() - interval '1 hour'
    and ((email is not null and lower(email) = lower(p->>'email')) or (phone is not null and phone = p->>'phone'));
  if v_recent >= 5 then raise exception 'Demasiadas solicitudes; intenta más tarde'; end if;
  insert into public.leads (source, utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, landing_page, referrer,
    name, company_name, state, municipality, email, phone, preferred_channel, need, intent,
    consent_followup, consent_whatsapp, privacy_accepted_at)
  values (
    case when p->>'source' in ('seo','geo','pauta_google','pauta_chatgpt','prospeccion_denue','prospeccion_web','referido','directo','otro') then p->>'source' else 'directo' end,
    left(p->>'utm_source',200), left(p->>'utm_medium',200), left(p->>'utm_campaign',200), left(p->>'utm_term',200), left(p->>'utm_content',200),
    left(p->>'gclid',300), left(p->>'landing_page',500), left(p->>'referrer',500),
    left(trim(p->>'name'),200), nullif(left(trim(p->>'company_name'),200),''), nullif(left(trim(p->>'state'),100),''), nullif(left(trim(p->>'municipality'),100),''),
    nullif(lower(left(trim(p->>'email'),200)),''), nullif(left(trim(p->>'phone'),40),''), left(p->>'preferred_channel',40), left(trim(p->>'need'),2000),
    case when p->>'intent' = 'cotizacion' then 'cotizacion' else 'informacion' end,
    coalesce((p->>'consent_followup')::boolean,false), coalesce((p->>'consent_whatsapp')::boolean,false), now())
  returning * into v;
  insert into public.lead_events (lead_id, actor, type, detail) values (v.id, 'sistema', 'creado', 'Fuente: ' || v.source);
  return jsonb_build_object('id', v.id, 'token', v.enrich_token);
end $$;

-- Segundo paso (lo llama el servidor): datos del DENUE, encaje, ruta, fusión por empresa y estado de HubSpot
create or replace function public.enrich_lead(p_id uuid, p_token uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.leads; m jsonb := p->'match'; v_fit text; v_route text; v_company uuid; v_domain text; v_free boolean;
begin
  select * into v from public.leads where id = p_id and enrich_token = p_token and created_at > now() - interval '15 minutes';
  if not found then raise exception 'Lead no encontrado o enlace vencido'; end if;

  if p ? 'hubspot_status' then
    update public.leads set hubspot_status = left(p->>'hubspot_status',60), hubspot_id = coalesce(p->>'hubspot_id', hubspot_id) where id = p_id;
    insert into public.lead_events (lead_id, actor, type, detail) values (p_id, 'sistema', 'hubspot', left(p->>'hubspot_status',60));
    return jsonb_build_object('ok', true);
  end if;

  if m is not null and jsonb_typeof(m) = 'object' then
    v_fit := public.compute_fit(m->>'scian', nullif(m->>'estrato','')::int, coalesce(m->>'state', v.state));
  else
    v_fit := 'sin_coincidencia';
  end if;

  v_route := case
    when v.company_name is null then 'menudeo'
    when v_fit in ('A','B') and coalesce(p->>'confidence','') = 'alta' and v.intent = 'cotizacion' then 'vendedor'
    when v_fit in ('A','B') and coalesce(p->>'confidence','') = 'alta' then 'sdr'
    else 'verificar' end;

  -- Fusión por empresa
  if v.company_name is not null then
    v_domain := nullif(split_part(coalesce(v.email,''), '@', 2), '');
    v_free := v_domain in ('gmail.com','hotmail.com','outlook.com','yahoo.com','yahoo.com.mx','live.com','live.com.mx','icloud.com','prodigy.net.mx','msn.com');
    if v_free then v_domain := null; end if;
    select id into v_company from public.companies
      where (m->>'denue_id' is not null and denue_id = m->>'denue_id')
         or lower(name) = lower(v.company_name)
         or (v_domain is not null and domain = v_domain)
      order by (denue_id is not null) desc limit 1;
    if v_company is null then
      insert into public.companies (name, legal_name, domain, website, denue_id, scian, giro, estrato, state, municipality, fit, origins)
      values (v.company_name, m->>'legal_name', v_domain, m->>'website', m->>'denue_id', m->>'scian', m->>'giro', nullif(m->>'estrato','')::int,
              coalesce(m->>'state', v.state), coalesce(m->>'municipality', v.municipality), v_fit, array['entrante'])
      returning id into v_company;
    else
      update public.companies set
        origins = (select array(select distinct unnest(origins || array['entrante']))),
        sequence_paused = true,
        domain = coalesce(domain, v_domain)
      where id = v_company;
    end if;
  end if;

  update public.leads set fit = v_fit, route = v_route, denue_match = m,
    match_confidence = case when m is null then null when p->>'confidence' = 'alta' then 'alta' else 'dudosa' end,
    company_id = v_company where id = p_id;
  insert into public.lead_events (lead_id, actor, type, detail) values (p_id, 'sistema', 'filtrado', 'Encaje ' || v_fit || ' · ruta ' || v_route);
  return jsonb_build_object('fit', v_fit, 'route', v_route);
end $$;

revoke all on function public.submit_lead(jsonb) from public;
revoke all on function public.enrich_lead(uuid,uuid,jsonb) from public;
grant execute on function public.submit_lead(jsonb) to anon, authenticated;
grant execute on function public.enrich_lead(uuid,uuid,jsonb) to anon, authenticated;
