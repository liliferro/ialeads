-- Marca los registros de demostración para poder borrarlos de un clic.
alter table public.leads add column if not exists is_demo boolean not null default false;
alter table public.companies add column if not exists is_demo boolean not null default false;
alter table public.content_pieces add column if not exists is_demo boolean not null default false;
alter table public.ad_spend add column if not exists is_demo boolean not null default false;
