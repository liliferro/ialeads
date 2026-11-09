-- Permite al formulario público saber qué giros busca el cliente (dato no sensible)
-- para comprobar contra el DENUE si la empresa del lead pertenece a ellos.
create or replace function public.icp_prefixes() returns text[]
language sql stable security definer set search_path = public as $$
  select icp_scian from public.settings where id = 1;
$$;
revoke all on function public.icp_prefixes() from public;
grant execute on function public.icp_prefixes() to anon, authenticated;
