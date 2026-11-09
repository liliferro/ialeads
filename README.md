# ialeads · Mood Industrial Growth

App del piloto: captura leads de tres fuentes (SEO/GEO, prospección, pauta), los filtra contra el DENUE, los enruta y mide el costo por oportunidad aceptada.

- **Next.js** (App Router, JavaScript) desplegado en **Vercel** al hacer push a `main`.
- **Supabase** (Postgres + Auth) como base de datos. Todas las tablas tienen RLS.
- **HubSpot gratuito** como CRM: cada lead se envía como contacto con una nota.

## Rutas

| Ruta | Qué hace |
|---|---|
| `/cotizar` | Formulario público. Guarda UTM, `gclid` y referente para atribuir la fuente. |
| `/aviso-de-privacidad` | **Borrador**. Falta la versión del abogado. |
| `/login` | Acceso del equipo (correo y contraseña). |
| `/panel` | Tablero por fuente. |
| `/panel/leads` | Bandeja de leads, ruta, estado, primera respuesta, bitácora. |
| `/panel/cuentas` | Prospección origen A: búsqueda e importación desde el DENUE, secuencia. |
| `/panel/web` | Prospección origen B: importación de empresas halladas en la web pública. |
| `/panel/contenido` | Cola de piezas SEO/GEO con aprobación. |
| `/panel/pauta` | Gasto y exportación de conversiones para Google Ads. |
| `/panel/exclusiones` | Lista de no contactar. |
| `/panel/ajustes` | Cliente ideal, candado legal, correos con acceso. |

## Variables de entorno (Vercel)

| Variable | Necesaria | Para qué |
|---|---|---|
| `HUBSPOT_ACCESS_TOKEN` | Para HubSpot | Token de app privada con permiso de escritura en contactos y notas. Sin ella, la app funciona y marca los leads como `sin_configurar`. |
| `DENUE_API_BASE` | No | Por defecto `https://leads.iron-ai.com/api/agente`. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No | Ya vienen como respaldo en `lib/supabase.js` (son públicas por diseño). |

## Seguridad

- El formulario público no usa la clave de servicio. Llama a la función `submit_lead`, que valida y limita envíos; el encaje y la ruta se calculan en `enrich_lead`, dentro de la base.
- El panel solo muestra datos a correos listados en `allowed_emails`.
- La app **no envía** correos ni mensajes de prospección: propone borradores que una persona revisa y envía. Los borradores permanecen ocultos hasta activar el candado legal en Ajustes.

## Pendiente de verificar

- La forma exacta del JSON de `leads.iron-ai.com` no se pudo comprobar al construir la app. `lib/denue.js` acepta varios nombres de campo y `/panel/cuentas` muestra un diagnóstico con los campos reales.
- ScrapeGraphAI no está conectado por API: su resultado se pega en `/panel/web`.

## Desarrollo local

```bash
npm install
npm run dev
```

El esquema está en `supabase/migrations/`.
