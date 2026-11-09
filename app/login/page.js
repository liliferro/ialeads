'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState('in');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const email = f.get('email');
    const password = f.get('password');
    const supabase = getBrowserClient();
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ bad: true, text: 'No se pudo entrar: revisa correo y contraseña, o confirma tu correo si acabas de registrarte.' });
      else router.push('/panel');
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/panel` } });
      if (error) setMsg({ bad: true, text: error.message });
      else if (data.session) router.push('/panel');
      else setMsg({ text: 'Cuenta creada. Revisa tu correo y confirma el enlace para poder entrar.' });
    }
    setBusy(false);
  }

  return (
    <main className="wrap" style={{ maxWidth: 420 }}>
      <h1>{mode === 'in' ? 'Entrar al panel' : 'Crear cuenta'}</h1>
      <p className="muted small">Solo los correos autorizados en Ajustes pueden ver datos.</p>
      <form className="card" onSubmit={onSubmit}>
        <label htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
        {msg && <div className={`notice ${msg.bad ? 'bad' : 'ok'}`} role="status">{msg.text}</div>}
        <p style={{ marginTop: 16 }}><button disabled={busy}>{mode === 'in' ? 'Entrar' : 'Crear cuenta'}</button></p>
      </form>
      <button className="ghost sm" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null); }}>
        {mode === 'in' ? 'Es mi primera vez: crear cuenta' : 'Ya tengo cuenta: entrar'}
      </button>
    </main>
  );
}
