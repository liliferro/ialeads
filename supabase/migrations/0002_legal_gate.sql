-- Candado legal: los borradores de prospección no se muestran hasta que el abogado dé el visto bueno.
alter table public.settings add column if not exists outbound_legal_ok boolean not null default false;
alter table public.settings add column if not exists sender_name text not null default '';
