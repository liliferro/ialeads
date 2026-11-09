import Link from 'next/link';

export default function Home() {
  return (
    <main className="wrap">
      <h1>ialeads</h1>
      <p className="muted">Mood Industrial Growth · captura, filtro y seguimiento de leads industriales.</p>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Solicitar cotización</h2>
        <p>Formulario público al que llegan las tres fuentes: SEO/GEO, prospección y pauta.</p>
        <Link className="btn" href="/cotizar">Abrir formulario</Link>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Panel del equipo</h2>
        <p>Leads, cuentas de prospección, contenido, pauta y tablero por fuente.</p>
        <Link className="btn ghost" href="/panel">Entrar al panel</Link>
      </div>
    </main>
  );
}
