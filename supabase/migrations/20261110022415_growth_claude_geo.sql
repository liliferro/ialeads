alter table public.growth_geo_observations drop constraint growth_geo_observations_method_check;
alter table public.growth_geo_observations add constraint growth_geo_observations_method_check check(method in ('manual','openai_api','anthropic_api'));
