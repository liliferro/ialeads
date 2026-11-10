# Informes reales del piloto

Se añadieron informes diarios de GA4 (propiedad 536869166) y Search Console (sc-domain:matdepotmex.com), consultados mediante Windsor e importados de forma asistida a Supabase. Período inicial: 9 octubre a 5 noviembre de 2026. Se excluyen cuatro días recientes para reducir datos aún incompletos.

Las cifras no se guardan en el repositorio público. La tabla growth_reports tiene RLS por organización y solo admite escrituras del servidor. La interfaz calcula CTR con totales y pondera posición por impresiones. No suma usuarios únicos ni identifica visitas como leads. El listado comercial corresponde a las 500 solicitudes recientes como máximo.

El botón Actualizar consulta el servidor y conserva los datos anteriores si el proveedor no responde. Requiere WINDSOR_API_KEY y SUPABASE_SERVICE_ROLE_KEY en variables privadas de Vercel. El token Windsor se envía al endpoint oficial documentado de Windsor desde servidor, no al navegador; no se registra la URL con la clave. La caché es de una hora por período/fuente; no hay cron ni actualización automática habilitados.

HubSpot requiere HUBSPOT_ACCESS_TOKEN y SUPABASE_SERVICE_ROLE_KEY. La presencia de una variable no prueba que sus permisos sean correctos: el proceso verifica el portal antes de escribir y exige aprobación de cada solicitud.

Verificación: 39 pruebas unitarias/base/adaptadores, 10 pruebas de navegador, build correcto. Pruebas de UI con transporte controlado; consulta real de Google por conector y verificación de informes almacenados por SQL. Falta probar actualización desde Vercel con las credenciales de la usuaria.

Documentación API: https://windsor.ai/api-documentation/
