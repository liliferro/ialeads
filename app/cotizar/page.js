'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ESTADOS_MX } from '@/lib/shared';

export default function Cotizar() {
  const router = useRouter();
  const [track, setTrack] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Guarda cómo llegó la persona (UTM, gclid, referente) para atribuir la fuente.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid']) {
      if (q.get(k)) t[k] = q.get(k);
    }
    t.landing_page = window.location.href;
    t.referrer = document.referrer || '';
    setTrack(t);
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const f = new FormData(e.currentTarget);
    const body = {
      ...track,
      name: f.get('name'),
      company_name: f.get('company_name'),
      state: f.get('state'),
      municipality: f.get('municipality'),
      email: f.get('email'),
      phone: f.get('phone'),
      preferred_channel: f.get('preferred_channel'),
      need: f.get('need'),
      intent: f.get('intent'),
      consent_followup: f.get('consent_followup') === 'on',
      consent_whatsapp: f.get('consent_whatsapp') === 'on',
      privacy_accepted: f.get('privacy_accepted') === 'on',
      website: f.get('website'),
    };
    if (!body.email && !body.phone) return setError('Déjanos un correo o un teléfono para responderte.');
    setBusy(true);
    try {
      const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo enviar');
      router.push('/gracias');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <h1>Solicita tu cotización</h1>
      <p className="muted">Cuéntanos qué necesitas y te respondemos por el medio que elijas.</p>
      <form className="card" onSubmit={onSubmit}>
        <div className="grid2">
          <div><label htmlFor="name">Nombre *</label><input id="name" name="name" required maxLength={200} autoComplete="name" /></div>
          <div><label htmlFor="company_name">Empresa</label><input id="company_name" name="company_name" maxLength={200} autoComplete="organization" /></div>
          <div>
            <label htmlFor="state">Estado</label>
            <select id="state" name="state" defaultValue="">
              <option value="">Selecciona…</option>
              {ESTADOS_MX.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label htmlFor="municipality">Municipio</label><input id="municipality" name="municipality" maxLength={100} /></div>
          <div><label htmlFor="email">Correo</label><input id="email" name="email" type="email" maxLength={200} autoComplete="email" /></div>
          <div><label htmlFor="phone">Teléfono</label><input id="phone" name="phone" type="tel" maxLength={40} autoComplete="tel" /></div>
          <div>
            <label htmlFor="preferred_channel">¿Cómo prefieres que te contactemos?</label>
            <select id="preferred_channel" name="preferred_channel" defaultValue="correo">
              <option value="correo">Correo</option>
              <option value="llamada">Llamada</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          <div>
            <label htmlFor="intent">¿Qué buscas?</label>
            <select id="intent" name="intent" defaultValue="cotizacion">
              <option value="cotizacion">Una cotización</option>
              <option value="informacion">Información general</option>
            </select>
          </div>
        </div>
        <label htmlFor="need">¿Qué necesitas? *</label>
        <textarea id="need" name="need" required maxLength={2000} placeholder="Producto, cantidad aproximada, medidas, fecha en que lo necesitas…" />
        <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />

        <label className="check" style={{ marginTop: 16 }}>
          <input type="checkbox" name="privacy_accepted" required />
          <span>He leído y acepto el <Link href="/aviso-de-privacidad" target="_blank">aviso de privacidad</Link>. *</span>
        </label>
        <label className="check">
          <input type="checkbox" name="consent_followup" />
          <span>Acepto recibir seguimiento comercial por correo o llamada.</span>
        </label>
        <label className="check">
          <input type="checkbox" name="consent_whatsapp" />
          <span>Acepto que me escriban por WhatsApp.</span>
        </label>

        {error && <div className="notice bad" role="alert">{error}</div>}
        <p style={{ marginTop: 16 }}><button disabled={busy}>{busy ? 'Enviando…' : 'Enviar solicitud'}</button></p>
      </form>
    </main>
  );
}
