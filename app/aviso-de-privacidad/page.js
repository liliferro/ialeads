export const metadata = { title: 'Aviso de privacidad' };

export default function Aviso() {
  return (
    <main className="wrap">
      <h1>Aviso de privacidad</h1>
      <div className="notice warn">
        <b>Borrador pendiente de revisión legal.</b> Este texto es un marcador de posición: un abogado debe
        redactar y aprobar la versión definitiva antes de usar el formulario con tráfico real.
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Responsable</h2>
        <p>[Razón social y domicilio del responsable — por definir]</p>
        <h2>Datos que recabamos</h2>
        <p>Nombre, empresa, estado y municipio, correo, teléfono y la descripción de lo que necesitas.</p>
        <h2>Para qué los usamos</h2>
        <p>Para responder tu solicitud y elaborar tu cotización. Solo si lo autorizas en el formulario, para darte seguimiento comercial por correo, llamada o WhatsApp.</p>
        <h2>Tus derechos</h2>
        <p>Puedes pedir acceso, rectificación, cancelación u oposición, y revocar tu consentimiento, escribiendo a [correo de contacto — por definir].</p>
        <h2>Cambios</h2>
        <p>Cualquier cambio a este aviso se publicará en esta página.</p>
      </div>
    </main>
  );
}
