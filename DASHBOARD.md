# Dashboard de marketing · MatDepot

Disponible al inicio de /piloto, en Dashboard y conexiones.

- GA4: sesiones, sesiones con interacción y vistas de páginas.
- Search Console: clics, impresiones, CTR calculado sobre totales y posición ponderada por impresiones.
- Períodos de 7, 14 o 28 días, fecha final elegible hasta el último día guardado, tendencias diarias, tablas accesibles y CSV.
- Comparaciones contra el período inmediatamente anterior, solo con cobertura completa en ambos períodos. No se calcula variación porcentual sobre una base cero.
- Datos ausentes como huecos, sin rellenarlos con cero. Informes inválidos excluidos; días superpuestos resueltos con el informe guardado más reciente.
- Cuenta, fecha de guardado y método de importación visibles. Informes originales descargables.
- Actividad comercial separada: estado actual de hasta 500 solicitudes, sin atribución ni filtro temporal de Google.

## Conexiones pendientes

Los informes actuales son importaciones reales asistidas. La actualización desde el servidor requiere WINDSOR_API_KEY y SUPABASE_SERVICE_ROLE_KEY en el entorno de Vercel. No se configuró una actualización programada ni se contrató un plan de Windsor.

Google Ads sigue pendiente de conexión. Los desgloses de consultas, páginas, canales, dispositivos y conversiones aún no se importan. No se muestran cifras estimadas para esos apartados.

## Validación

Pruebas de cálculo para datos faltantes, solapamientos y base cero; prueba de navegador para filtros, tablas y ancho móvil. Sin cambios en permisos ni en el esquema de base de datos.
