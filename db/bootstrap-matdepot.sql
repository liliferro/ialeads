with org as (
 insert into public.growth_organizations(slug,name,domain,product,hubspot_portal_id)
 values('matdepot','MatDepot','www.matdepotmex.com','Pisos para gimnasios','50738398')
 on conflict(slug) do update set slug=excluded.slug returning id
)
insert into growth_private.access(organization_id,email,role)
select id,'lilianaferro@mood-agency.com','admin' from org on conflict do nothing;
