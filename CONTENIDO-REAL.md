# Contenido editorial persistente

El piloto incluye creación y edición de borradores, fuentes y URL propuesta. Los borradores se guardan en growth_content con permisos por organización. Editar incrementa la versión y anula aprobaciones previas. Una versión debe pasar a revisión antes de que un administrador pueda aprobarla con confirmación de verificación. Se exige contenido y fuentes para solicitar revisión. La base rechaza versiones antiguas y acciones entre clientes.

La aprobación no verifica automáticamente la veracidad: es una comprobación humana registrada. Las acciones generan eventos de auditoría. La versión aprobada se puede descargar en Markdown. No hay publicación automática ni generación con un proveedor de IA activadas todavía.

Verificación: pruebas PostgreSQL de roles, aislamiento, concurrencia por versión y anulación de aprobación; compilación y pruebas de regresión del piloto correctas. La migración fue aplicada en Supabase y se verificó RLS.
