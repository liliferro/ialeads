# SEO/GEO del piloto MatDepot

Implementación interna basada en el plan v0.5 y en las funciones observables de GrandRanker. La medición de presencia en IA se incluye en esta fase por decisión de Lili. Referencias: https://grandranker.com/es/analisis-gratis y https://www.instagram.com/p/DfIIU5VsUrH/. Se pudo consultar la página y abrir la publicación; no se verificó íntegramente el video.

## Funciones disponibles

- Inventario desde sitemap, consulta por lotes, historial y exportación JSON con fechas y fuentes. Restricción a matdepotmex.com, límites de respuesta/tiempo/redirecciones y respeto conservador de Disallow. Máximo 200 URLs y seis sitemaps por inventario; se indica si está limitado.
- Revisión del HTML recibido: respuesta HTTP, title, descripción, H1, canonical, noindex, enlaces internos, presencia/sintaxis JSON-LD e imágenes sin atributo alt. No ejecuta JS ni prueba indexación, validez semántica de schema o Core Web Vitals.
- Checklist de ocho fundamentos SEO; las conexiones conocidas se basan en informes importados. Envío de sitemap, Bing, Google Business, PageSpeed y directorios siguen como pendientes cuando no hay evidencia.
- Mapa de diez propuestas para actualizar URLs existentes. Coincidencias léxicas muestran posibles solapamientos; no equivalen a canibalización confirmada. Volumen/KD/CPC no medidos.
- Preparación idempotente de diez briefs y borradores iniciales. Edición, revisión y aprobación por versión. La aprobación de piezas SEO exige confirmar revisión de la URL principal y canibalización; editar anula aprobación. Exportación Markdown solo después de aprobar. No publicación automática ni cambios a matdepot-web.
- Registro manual de evidencia de ChatGPT, Claude, Gemini y Perplexity: consulta, respuesta completa, modelo visible, mercado, fecha, fuentes y enlace a evidencia. Método siempre explícito; no se confunde con consulta automática.
- Consulta automática OpenAI Responses, gpt-5-mini y web_search, sin mencionar la marca en las preguntas sugeridas. Acepta OPENAI_API_KEY o OPENIA_API_KEY solo del lado servidor. Una prueba API no representa el producto ChatGPT. Citas enlazadas, respuesta y uso registrado. Otros proveedores no se automatizan con una clave de OpenAI.
- Límite transaccional de 10 intentos/24h y 100/mes por cliente, 2,400 tokens máximos de salida y una llamada de herramienta por consulta. Los fallos cuentan para el límite; no hay reintentos automáticos ni ejecución programada. El uso en tokens no equivale a una factura en MXN ni controla gastos ajenos a este módulo.

## Validación y límites

Pruebas de aislamiento, roles, evidencia, aprobación por versión, deduplicación y límites de IA en PostgreSQL; crawler limitado, parsing y adaptador OpenAI con transporte simulado; flujos de navegador en escritorio y móvil. La verificación real del despliegue y credenciales se documenta al terminar.

Todas las tablas nuevas tienen RLS. El asesor no señaló fallos en ellas. Persisten advertencias previas de funciones heredadas y protección de contraseñas, fuera del cambio: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable y https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

Referencia de integración: https://developers.openai.com/api/docs/guides/tools-web-search. La calidad de un HTML, un borrador o una respuesta no garantiza ranking, indexación ni citas futuras.
