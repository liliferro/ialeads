# MatDepot · piloto de pisos para gimnasios

Actualización: 9 de noviembre de 2026.

## Decisiones confirmadas

- Dominio correcto: https://www.matdepotmex.com/ (sustituye el dominio escrito inicialmente).
- Prioridad elegida por Lili: pisos para gimnasios.
- Alojamiento: Vercel, confirmado por Lili y consistente con el repositorio.
- CRM: Lili indicó el portal Mood Agency 50738398, con lilianaferro@mood-agency.com. El conector de esta conversación está verificado; la app todavía no sincroniza. La persona de MatDepot se añadirá después.
- Tope global de servicios de plataforma: $5,000 MXN/mes. No se contrató ningún servicio.

## Verificado en esta revisión

La página pública abre. Existe una categoría de gimnasios y un formulario de cotización. La categoría presenta alternativas de pisos y orienta a confirmar requisitos del proyecto antes de elegir. Esto es información del sitio del proveedor, no una certificación técnica independiente.

- Categoría: https://www.matdepotmex.com/categorias/gimnasios.html
- Ficha revisada: https://www.matdepotmex.com/tapetes/tapete-para-gimnasio-de-hule-reciclado.html
- Contacto: https://www.matdepotmex.com/contacto.html

El repositorio `liliferro/matdepot-web` documenta un sitio estático generado, con catálogo en `assets/catalogo.js`, contenido en archivos y publicación en Vercel desde `main`. No se necesita un conector WordPress ni migrar el sitio para iniciar el piloto.

Su documentación indica que el formulario usa FormSubmit y no almacena solicitudes en una base propia. También describe instrumentación de GA4: la recepción real y los permisos de consulta aún deben comprobarse. Un envío de formulario no equivale a una oportunidad aceptada ni acredita recepción en el buzón.

Fuentes técnicas:
- https://github.com/liliferro/matdepot-web/blob/main/README.md
- https://github.com/liliferro/matdepot-web/blob/main/vercel.json

## Recomendación CRM

Comenzar con HubSpot gratuito si bastan hasta dos usuarios y 1,000 contactos. Su página oficial también establece límites para los demás tipos de registros; no cargar directorios completos como contactos. Las automatizaciones avanzadas no forman parte del alcance gratuito que se propone.

Decisión actual de Lili: usar su portal de Mood para preparar el piloto. Dos accesos previstos: una persona de Mood y otra de MatDepot; hay que verificar la separación y permisos antes de invitar a MatDepot. HubSpot sería el registro comercial de referencia; Mood Growth OS prepararía investigación, contenidos, calificación y reportes. La sincronización no está implementada ni probada todavía.

Referencia consultada el 9 de noviembre de 2026: https://www.hubspot.com/pricing/crm

## Diseño comercial propuesto — pendiente de validación del equipo

Etapas: solicitud recibida → proyecto calificado → cotización enviada → seguimiento → ganado / perdido. Una oportunidad aceptada requiere confirmación explícita del vendedor sobre una necesidad concreta y viable; no se deduce de un clic o de abrir WhatsApp.

Datos de la solicitud:
- Nombre, gimnasio/empresa, medio de contacto y responsable.
- Producto o presentación de interés.
- Superficie aproximada y uso: pesas, máquinas, entrenamiento, circulación u otro.
- Ciudad/código postal de entrega y fecha requerida.
- Condiciones relevantes del espacio; presupuesto si el comprador lo comparte.
- Fuente, URL de llegada, UTMs y fecha de consentimiento aplicable.

Origen y fecha de entrada deben conservarse; el monto final solo se registra cuando existe una propuesta real. Crear el negocio al aceptar una oportunidad evita inflar el pipeline con solicitudes no calificadas. La representación de campos en HubSpot se validará contra los límites de propiedades del portal gratuito; usar notas estructuradas si hace falta.

## Primer recorrido a conectar

1. Tomar la categoría actual de gimnasios como destino inicial; revisar las consultas reales antes de crear páginas nuevas que dupliquen guías existentes.
2. Registrar la solicitud de cotización de forma durable, deduplicada y con su fuente antes de intentar sincronizarla con HubSpot.
3. Crear/actualizar contacto y empresa, asignar responsable y actividad de seguimiento. Nunca exponer el token de HubSpot en el sitio estático.
4. Registrar aceptación comercial, cotización y cierre; enviar las actualizaciones al tablero con idempotencia y control de errores.
5. Conciliar resultados comerciales con Search Console/GA4 y gasto real, sin atribuir ventas a simples clics de WhatsApp.
6. Publicar contenido únicamente después de revisión y aprobación, mediante el flujo del repositorio con vista previa.

## Estado de la entrega

El perfil local ya contiene el dominio correcto, el producto elegido, el alojamiento identificado y la recomendación CRM. La actualización conserva los registros del piloto y los escenarios de demostración. El conector del chat está verificado; no hay sincronización de la aplicación ni datos comerciales cargados en el piloto local.

Pendiente: acceso de MatDepot, separación efectiva de datos en el portal Mood, perfil de comprador/territorio, permisos de Search Console/GA4 y backend con autenticación y almacenamiento compartido. Ver HUBSPOT-PORTAL.md para la configuración existente. El espacio local sigue siendo de demostración y no debe recibir datos personales reales.

## Usuarios confirmados por Lili

Dos accesos para el piloto: una persona de Mood y una de MatDepot. Se mantiene la recomendación de HubSpot gratuito dentro del límite de dos usuarios verificado en la revisión anterior. La cuenta debe pertenecer a MatDepot, con accesos individuales. Pendiente identificar los dos correos y quién será administrador por MatDepot. No se ha creado una cuenta ni enviado invitaciones.
