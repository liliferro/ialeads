# Módulo SEO/GEO · espacio de trabajo

## Funciones del piloto

1. Diagnóstico e inventario: HTML, indexabilidad declarada, metadatos, H1, canonical, enlaces, imágenes y JSON-LD; avances por lotes e historial.
2. Oportunidades GSC: consultas y páginas reales, clics, impresiones, CTR y posición ponderada; búsqueda, exportación e importación declarada. Varias URLs por consulta requieren revisión; no prueban canibalización.
3. Mapa y calendario: temas editables, intención, URL principal existente, grupo, prioridad, responsable, fecha y estado; revisión de solapamientos documentada e historial inmutable.
4. Hallazgos: alertas del diagnóstico, títulos/descripciones duplicados, canonical diferente, enlaces rotos conocidos y ausencia de enlaces entrantes en la muestra; seguimiento con notas y diferencias entre instantáneas.
5. Fundamentos: registro de evidencia para los ocho fundamentos; marcar verificado requiere fuente y notas. No concede autorizaciones externas.
6. Rendimiento: PageSpeed móvil/escritorio, puntuación y métricas Lighthouse, oportunidades e historial. No equivale a CrUX ni a usuarios reales. Propuesta WebPage JSON-LD exportable; revisión semántica requerida.
7. Investigación: fichas manuales y búsqueda web de Claude con respuesta, fuentes, modelo y fecha. No inventa tráfico de competidores, backlinks ni volumen/KD/CPC.
8. Redacción: Claude consulta la URL autorizada y usa el plan revisado y enlaces del inventario para generar un borrador. Se conserva antes de incorporarlo al editor; aprobación y exportación final por versión. No sobreescribe contenidos aprobados.
9. Presencia en IA: OpenAI y Claude por API, consultas editables, filtro del historial y separación entre menciones y citas. Gemini y Perplexity por evidencia manual mientras no haya acceso API.
10. Revisión editorial: edición, fuentes, aprobación por versión y exportación Markdown. Sitio MatDepot: cambios solo vía PR y aprobación de Lili.

## Controles

`growth_seo_work` conserva versiones inmutables por cliente, tipo y clave. Los usuarios autenticados miembros solo pueden leer; las escrituras pasan por el servidor y verificación de rol admin/sales, origen, datos y versión. Se rechazan cambios concurrentes obsoletos. Historial visible: hasta 500 versiones recientes, con aviso al alcanzar el límite.

Redacción, investigación y presencia en IA comparten la reserva transaccional: 10 intentos/24 horas, 100/mes por cliente. Sin reintentos automáticos. Redacción tiene máximo 4,000 tokens de salida; consultas web, 2,400 y una búsqueda. No es un límite monetario global de la cuenta del proveedor.

## Dependencias y alcance pendiente

- WINDSOR_API_KEY activa actualizaciones de consultas GSC desde el servidor. Importación asistida inicial: 84 pares consulta/página, 9 octubre–5 noviembre de 2026, cuenta sc-domain:matdepotmex.com.
- PageSpeed puede requerir PAGESPEED_API_KEY y cuota disponible; los errores no se transforman en puntuaciones.
- OpenAI tenía un error de cuota 429. Claude tiene una consulta de presencia validada en Vercel. Las nuevas funciones se validan por separado.
- DataForSEO u otra fuente de mercado no está contratada: volumen, dificultad, CPC, backlinks y ranking competitivo a escala siguen sin medición.
- Gemini y Perplexity no tienen credenciales. No se usan claves de otros proveedores para llamarlos.
- No hay publicación, altas en directorios, envío de sitemap ni cambios en permisos de Google/Bing automáticos; requieren conexión y la revisión correspondiente.
- No se implementó generación de imágenes/video, compras de enlaces ni programación automática de tareas.

Las comprobaciones técnicas y las respuestas API no garantizan posiciones ni presencia en los productos de chat.

## Verificación en Vercel · 9 noviembre de 2026

- Los 84 pares consulta/página se muestran en Oportunidades GSC.
- Diez propuestas guardadas en el mapa editable, con revisión y asignación pendientes.
- Investigación real con Claude guardada con dos fuentes públicas; una consulta amplia falló y la consulta acotada se completó. Las afirmaciones siguen sujetas a revisión editorial.
- PageSpeed no completó la medición sin credencial/cuota disponible; no se guardó puntuación.
- 57 pruebas de lógica, permisos y servicios aprobadas, 15 recorridos de navegador aprobados y compilación correcta. Generación/adopción de borradores verificada con proveedor simulado; no se presenta como ejecución real de redacción en Vercel.
