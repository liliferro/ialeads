-- Los prospectos de salida pasan al embudo de leads sin haber llenado el formulario,
-- así que no tienen fecha de aceptación del aviso de privacidad.
alter table public.leads alter column privacy_accepted_at drop not null;
