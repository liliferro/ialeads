# HubSpot · portal para preparar el piloto MatDepot

Verificación del conector: 9 de noviembre de 2026.

## Confirmado

- Portal: **50738398**, nombre **Mood Agency**.
- Cuenta de Lili: **lilianaferro@mood-agency.com**.
- URL facilitada por Lili: https://app.hubspot.com/global-home/50738398
- El conector de esta conversación devuelve el mismo portal y correo.
- Lectura y escritura de contactos, empresas y negocios disponibles según el esquema de permisos.
- La cuenta pertenece a Mood; Lili indicó que añadirá después a la persona de MatDepot cuando reciba su respuesta. No se ha enviado ninguna invitación.

## Configuración existente que debe preservarse

- Moneda principal: USD.
- Zona horaria: US/Eastern.
- Embudo `default`, denominado Sales Pipeline, con nueve etapas personalizadas.
- No se consultaron contactos ni negocios individuales ni se modificaron registros.

| ID de etapa | Etiqueta existente |
|---|---|
| appointmentscheduled | Lead Nuevo |
| qualifiedtobuy | Lead Contactado |
| presentationscheduled | Reunión pautada Brief |
| decisionmakerboughtin | Lead en Propuesta |
| contractsent | Lead Propuesta Enviada |
| closedwon | Propuesta en Revisión |
| closedlost | Reunión Post Propúesta |
| 1228719920 | Propuesta Aprobada |
| 1228719921 | Propuesta Rechazada |

No inferir ganado/perdido por el nombre interno `closedwon` o `closedlost`: en este portal esas etapas tienen otras etiquetas y probabilidades. El mapa comercial del piloto debe validarse con la configuración real, sin cambiar las etapas de Mood por defecto.

## Distinción de conexiones

El conector de HubSpot de esta conversación **sí está autenticado**. La aplicación local Mood Growth OS **todavía no tiene sincronización ni credenciales de servidor**. La capacidad de consultar el CRM desde este chat no crea automáticamente una integración en el producto.

El plan de suscripción y los límites del portal no fueron acreditados por estas respuestas; `accountType=STANDARD` no identifica por sí solo una suscripción gratuita. Dos usuarios es la intención confirmada para el piloto, no un conteo de usuarios obtenido del portal.

## Antes de compartir el portal con MatDepot

La cuenta es compartida con Mood y ya tiene un proceso comercial personalizado. Identificar qué registros pertenecen al piloto y verificar los permisos efectivos del futuro usuario antes de invitarlo. Una vista o una etiqueta de cliente no sustituye permisos de acceso.

No cambiar globalmente USD a MXN, zona horaria, etapas o asignaciones de Mood solo para acomodar el piloto. No mezclar montos MXN del piloto con negocios denominados en USD. Si el portal no permite la separación necesaria, evaluar un portal dedicado a MatDepot manteniendo a Lili como administradora.

Pendientes: definición de separación/permisos, usuario de MatDepot, mapeo final de etapas y campos, almacenamiento de servidor, autorización e implementación de la integración. No se realizaron cambios externos.
