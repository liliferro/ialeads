# Piloto MatDepot: acceso y estado real

Actualizado el 9 de noviembre de 2026.

## Abrir

Con la aplicación iniciada, abrir http://127.0.0.1:3210/piloto. El recorrido /demo sigue siendo una demostración que guarda datos ficticios en el navegador.

En /piloto, crear el acceso con lilianaferro@mood-agency.com, confirmar el correo e iniciar sesión. La cuenta de HubSpot no sustituye este acceso. No se ha creado un usuario ni enviado un correo de registro por el asistente. El correo está autorizado como administrador del piloto; no se ha invitado a MatDepot.

## Implementado y aplicado

- Nuevas tablas growth_* en el proyecto Supabase ialeads. Tablas anteriores conservadas.
- Organización MatDepot, producto Pisos para gimnasios y portal destino 50738398.
- Acceso por correo confirmado y permisos por organización. No se confía en metadatos editables del usuario.
- Captura interna persistente: contacto, empresa, necesidad, superficie, uso, código postal, fecha requerida, origen y autorización.
- Seguimiento comercial, responsable, importe MXN, primera respuesta, notas e historial.
- Aprobación ligada a una versión: editar antes del envío invalida la aprobación.
- Cola persistente para HubSpot con bloqueo de concurrencia, límite de intentos y revisión manual cuando no se puede saber si se creó una nota.
- Adaptador que verifica el portal antes de escribir, busca por correo y conserva los campos de contactos existentes; crea una nota por solicitud aprobada. No crea negocios ni modifica el pipeline de Mood.

## Activación pendiente

La base está aplicada; el acceso autenticado con el usuario final aún no se ha probado. Las pruebas de autorización ejecutan PostgreSQL local con identidades simuladas. El envío a HubSpot se probó con respuestas simuladas; no se han creado contactos ni notas reales.

Para activar el envío se requieren SUPABASE_SERVICE_ROLE_KEY y HUBSPOT_ACCESS_TOKEN como secretos de servidor. Nunca deben usar prefijo NEXT_PUBLIC ni guardarse en Git o enviarse por chat. El token de HubSpot debe poder consultar información de la cuenta y leer/escribir los contactos y notas necesarios. Consultar los permisos vigentes en la configuración de la aplicación de HubSpot antes de emitirlo. La conexión de HubSpot del asistente no proporciona automáticamente estas credenciales a la aplicación.

Configurar la URL de la aplicación y las redirecciones autorizadas en Supabase Auth antes del uso público. Añadir la URL local /piloto para pruebas de confirmación si se utiliza ese entorno. Confirmar las políticas de correo y recuperación de acceso antes de invitar usuarios.

No se ha desplegado esta versión a Vercel. El formulario público de matdepotmex.com no se ha modificado. La captura pública permanece desactivada y no hay endpoint público de captura en esta entrega. La captura interna exige sesión autorizada.

Los módulos SEO/GEO, generación editorial, campañas y estrategia comercial siguen en demostración. Faltan sus conexiones de datos, persistencia de producción y publicación revisada. No se ha contratado ningún servicio ni hay un control de facturación real: el límite de $5,000 MXN es una restricción del proyecto, no un tope impuesto al proveedor.

## Verificación

34 pruebas de lógica, PostgreSQL y adaptadores; 10 pruebas de navegador; compilación de producción aprobada. Incluyen aislamiento entre clientes, bloqueo de usuarios sin permisos, idempotencia, consentimiento, aprobación por versión, exclusiones, concurrencia y respuestas inciertas de HubSpot.

El asesor de Supabase confirmó el aislamiento de las nuevas tablas. La ausencia de política en growth_private.access es intencional: no permite lectura directa y se consulta únicamente mediante funciones con comprobación de identidad. El proyecto conserva avisos anteriores sobre funciones públicas de ialeads y protección de contraseñas filtradas; requieren revisión antes del lanzamiento público. Referencias: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable y https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Operación y recuperación

El listado muestra hasta 500 solicitudes recientes y el historial hasta 200 eventos recientes del cliente. Los datos anteriores siguen en la base. Los estados bloqueado o revisión manual requieren inspección administrativa; no existe un botón que fuerce un reenvío incierto. Comprobar en HubSpot la nota con el identificador de solicitud antes de reconciliar la cola. No volver a crear la solicitud para eludir este control.

Migración reproducible: supabase/migrations/20261110005152_growth_backend.sql. db/growth.sql es su fuente probada. db/bootstrap-matdepot.sql registra el cliente y autoriza el correo sin crear cuentas de autenticación. Aplicar solamente sobre un proyecto revisado, con migraciones de Supabase; no repetir la primera migración si ya está registrada.


## Prospección conectada
La búsqueda real de gimnasios mediante Iron / DENUE está disponible en /piloto#prospectos. Zona inicial: Ciudad de México y Estado de México. Incluye filtros, selección, guardado sin duplicados y revisión de prospectos. Ver IRON-PROSPECTOS.md. No requiere configurar MCP ni crea contactos en HubSpot automáticamente.

