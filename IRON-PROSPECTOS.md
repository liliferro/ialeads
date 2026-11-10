# Prospectos de MatDepot con Iron / DENUE

La integración está implementada en `/piloto#prospectos` y requiere iniciar sesión con un correo autorizado. Desde la tarjeta DENUE / Iron de la demostración se puede abrir este recorrido real.

## Uso

1. Abrir el piloto y bajar a «Buscar prospectos · DENUE / Iron».
2. La zona inicial es Ciudad de México y Estado de México. Dejar el campo vacío consulta todo México.
3. Elegir gimnasios privados o clubes deportivos privados. Filtrar por municipio, nombre, personal ocupado, correo, teléfono o sitio web.
4. Pulsar «Buscar empresas en Iron». Los resultados se muestran en páginas de 25.
5. Seleccionar empresas y pulsar «Guardar seleccionados». El guardado es persistente en Supabase y evita duplicados por cliente e identificador DENUE.
6. Revisar los prospectos guardados, añadir notas y marcarlos como prioritarios o descartados.

La consulta verificada el 9 de noviembre de 2026 para el giro 713943, CDMX y Estado de México, excluyendo sector público, devolvió 6,454 establecimientos. Es un conteo del directorio, no oportunidades comerciales calificadas ni contactos confirmados; puede cambiar con las actualizaciones de Iron.

## Conexión

Se verificó el servidor MCP https://leads.iron-ai.com/mcp y su catálogo de herramientas. Para la plataforma se usa directamente la API de Iron: https://leads.iron-ai.com/api/agente/buscar_leads. No hace falta instalar un conector MCP ni proporcionar claves para esta integración. No se cambió la configuración de conectores de Codex.

El servidor de la aplicación verifica la sesión y acceso al cliente antes de consultar Iron. Solo envía filtros de búsqueda; no envía solicitudes de clientes, notas internas ni credenciales a Iron. La respuesta incluye fuente, avisos, total y paginación. El endpoint está fijado en código, admite filtros validados y tiene un tiempo máximo de espera de 15 segundos. Los errores no se sustituyen por datos ficticios.

La tabla nueva growth_prospects usa permisos por organización y roles. Administrador y ventas pueden guardar y revisar; lectores solo pueden consultar. La fuente y fecha se registran en cada prospecto. El listado de guardados muestra hasta 500 registros recientes.

## Límites de esta entrega

- Guardar un prospecto no crea una solicitud recibida, no registra consentimiento, no contacta al establecimiento y no envía nada a HubSpot.
- Los correos y teléfonos son datos del directorio y requieren verificación. No se infiere intención de compra.
- Si un lote se interrumpe, puede quedar parcialmente guardado: volver a guardarlo omite duplicados y completa los restantes.
- La selección conserva los datos mostrados; una nueva consulta puede reflejar actualizaciones del proveedor.
- Se verificaron consultas reales de lectura a Iron. Las pruebas de pantalla utilizan respuestas controladas; no se importaron empresas reales por cuenta de la usuaria.
- No se ha desplegado esta versión públicamente. Funciona en el servidor local del piloto.

Fuente: INEGI, Directorio Estadístico Nacional de Unidades Económicas (DENUE). Transformaciones y consulta: [Iron](https://leads.iron-ai.com/), herramienta independiente de INEGI. [Términos de uso de INEGI](https://www.inegi.org.mx/contenidos/inegi/doc/terminos_info.pdf).
