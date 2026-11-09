import Link from 'next/link';

export const metadata = { title: 'Solicitud recibida' };

export default function Gracias() {
  return (
    <main className="wrap">
      <h1>Recibimos tu solicitud</h1>
      <p>Una persona del equipo la revisará y te responderá por el medio que elegiste.</p>
      <p><Link href="/">Volver al inicio</Link></p>
    </main>
  );
}
