# Mood Growth OS — demostración integrada y piloto real

**Actualización:** `/piloto` incorpora acceso y solicitudes persistentes de MatDepot. La nueva base está aplicada en Supabase; el envío real a HubSpot requiere secretos de servidor. Leer [PILOTO-REAL.md](PILOTO-REAL.md) para estado, pruebas y pendientes. La descripción siguiente corresponde al recorrido de demostración.

Decisiones de Lili, 9 de noviembre de 2026: integrar ialeads, Visibility OS y la operación comercial; comenzar con datos de demostración; límite global de servicios de $5,000 MXN/mes. No se contrató ningún servicio ni se modificó producción.

## Iniciar

Requiere Node.js 24 y npm. Desde la carpeta del proyecto:

```sh
npm ci
npm run demo
```

Abrir http://127.0.0.1:3210. Para una compilación optimizada: `npm run build` y `npm run start -- --hostname 127.0.0.1 --port 3210`.

## Recorrido de aceptación

1. En Encontrar empresas, pasar **Empaques del Pacífico** a Leads. No permite duplicarlo.
2. En Leads, abrir su ficha, registrar primera respuesta, responsable, nota y estado.
3. En SEO y GEO → Palabras clave, crear un brief. En Estudio de contenido, crear el borrador de ejemplo, revisarlo, aprobarlo y simular publicación.
4. Editar el borrador y guardar. La aprobación anterior deja de ser válida; hay que revisar y aprobar la nueva versión.
5. En Campañas, registrar gasto ficticio. El resumen y los reportes recalculan el costo por oportunidad de cada fuente.
6. En Pipeline comercial, mover una venta del servicio a otra etapa. En Plan de trabajo, completar tareas y simular consumo.
7. Cambiar a Envase Circular. Los cambios de Norte Industrial no aparecen allí. Esta separación sirve para demostración, no sustituye autorización de servidor.
8. En Configuración, excluir `compras4@norte.example`; no se podrá convertir esa empresa en lead.
9. En Reportes, descargar HTML/JSON o imprimir a PDF. En Configuración, descargar el respaldo completo.

## Qué funciona

- Doce pantallas conectadas y adaptables a móvil.
- Dos escenarios ficticios; cambios persistentes en localStorage.
- Encaje A/B/C configurable, deduplicación, captura de leads, consentimiento de demo, exclusiones, seguimiento y bitácora.
- Oportunidades SEO → briefs → borradores de plantilla → revisión → aprobación por versión → publicación/reversión simuladas → exportación HTML/Markdown.
- Hallazgos SEO y muestra GEO con etiquetas explícitas de demostración.
- Gasto manual de pauta y costo por oportunidad con denominador de la misma fuente.
- Pipeline del servicio y tareas THINK/DO/EVOLVE.
- Simulador de consumo con límites globales y por cliente; no realiza cobros.
- Exportaciones escapadas para impedir ejecutar HTML introducido en campos.
- Pruebas automatizadas de reglas y recorridos del navegador; configuración de CI.

## Límites explícitos

Esta entrega es una demostración funcional local, no una plataforma de producción multiusuario. No hay autenticación nueva, servidor multitenant, crawling real, generación IA, consulta de keywords, sincronización de CRM, publicación a CMS, envío de mensajes ni cola duradera. Las pantallas no presentan esas conexiones como activas.

El guardado es por navegador y origen (puerto). Otro navegador no comparte los cambios. Si el almacenamiento está bloqueado o lleno, la interfaz lo informa y permite exportar un respaldo. Restaurar los escenarios elimina los cambios de ambos clientes con confirmación previa.

El código anterior de ialeads se conserva para migración. Por defecto el middleware bloquea sus APIs y redirige sus pantallas a la demo. **No habilitar `MOOD_ENABLE_LEGACY=1` para producción sin corregir y probar los riesgos de la aplicación anterior.** La demo no utiliza su clave ni su base existente.

## Pruebas

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Las pruebas de navegador cubren navegación, ausencia de solicitudes externas, bloqueo de APIs antiguas, conversión de empresas, persistencia, cambio de cliente, revisión/publicación, exportación, captura y móvil. No prueban RLS porque la demostración no tiene backend nuevo.

## Siguiente entrega: piloto conectado

1. Confirmar empresa, dominio, CMS, CRM y responsables reales. Definir política de conservación y aviso de privacidad con el responsable del cliente.
2. Crear entorno de pruebas separado y backend con organizaciones/membresías, roles y RLS. Probar lectura y escritura cruzadas con dos usuarios y clientes distintos antes de cargar datos reales.
3. Migrar la lógica de `lib/growth/engine.mjs` a transacciones de servidor; trasladar cuotas, auditoría, exclusiones y aprobación fuera del navegador. El navegador no es una frontera de confianza.
4. Implementar captura pública con validación/rate limit y enriquecimiento exclusivo de servidor. Revocar la ejecución pública del enriquecimiento heredado.
5. Conectar primero DENUE y un CRM. Comprobar reintentos/idempotencia, errores de notas, bajas y estados comerciales.
6. Elegir un proveedor SEO y uno de IA dentro del presupuesto; registrar consumo real y reservas de costo antes de ejecutar trabajos. La suma de servicios contratados debe respetar el tope global, no $5,000 por cliente.
7. Conectar un CMS y GSC; aprobación ligada al hash/versión exacta, registro del publicador, verificación y reversión en staging.
8. Añadir cola duradera, gestión de secretos, observabilidad y pruebas de seguridad del crawler. Activar canales de comunicación solo cuando estén autorizados.
9. Ejecutar un piloto completo con datos reales antes de declarar la plataforma lista para producción.

No existe una estimación fiable de costo operativo hasta conocer volumen y proveedores. Los importes del simulador son ficticios y la pauta publicitaria no consume el límite de servicios de la plataforma.

## Piloto confirmado: MatDepot

Lili confirmó www.matdepotmex.com y pisos para gimnasios. El sitio público está verificado y se genera desde GitHub para Vercel. HubSpot gratuito está recomendado, pendiente de confirmar usuarios y conectar una cuenta. El espacio MatDepot se añadió sin cifras ficticias y conserva los escenarios de ejemplo. Consulta PILOTO-MATDEPOT.md. Al iniciar una instalación nueva se abre MatDepot; para el recorrido de demostración selecciona Norte Industrial. Restaurar los ejemplos conserva MatDepot.
