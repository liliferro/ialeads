'use client';

import { useEffect, useState } from 'react';
import { usePanel } from '../ctx';
import { PageHead } from '@/components/ui';

// Cada tarjeta dice la verdad sobre su conexión: activa, lista para activar o en desarrollo.
const LIST = [
  { id: 'formulario', name: 'Formulario web', what: 'Captura leads con su fuente (UTM, gclid, referente) y consentimientos.', state: 'on' },
  { id: 'denue', name: 'Base DENUE · leads.iron-ai.com', what: 'Extrae empresas por sector, estado y tamaño, y verifica cada lead entrante.', state: 'test' },
  { id: 'web', name: 'Extractor de sitios web', what: 'Lee el sitio público de una empresa y saca nombre y contacto.', state: 'on' },
  { id: 'hubspot', name: 'HubSpot', what: 'Crea el contacto y una nota por cada lead.', env: 'HUBSPOT_ACCESS_TOKEN', need: 'Token de app privada con permiso de contactos y notas, guardado en Vercel.', state: 'env' },
  { id: 'scrapegraph', name: 'ScrapeGraphAI', what: 'Extracción con IA de directorios y listados completos.', need: 'API key de ScrapeGraphAI (servicio de pago por créditos).', state: 'dev' },
  { id: 'gmail', name: 'Gmail', what: 'Enviar los mensajes aprobados y registrar las respuestas desde la app.', need: 'Autorizar una app de Google (OAuth) con la cuenta que envía.', state: 'dev' },
  { id: 'google_ads', name: 'Google Ads', what: 'Traer el gasto por campaña y devolver las conversiones sin intervención.', need: 'Developer token de Google Ads (lo aprueba Google) y acceso a la cuenta del cliente.', state: 'dev' },
  { id: 'search_console', name: 'Search Console', what: 'Posiciones, clics y consultas de cada pieza de contenido.', need: 'Acceso a la propiedad del sitio del cliente.', state: 'dev' },
  { id: 'whatsapp', name: 'WhatsApp Business', what: 'Recibir y contestar a quien escribe o autorizó WhatsApp.', need: 'Cuenta de WhatsApp Business API verificada por Meta.', state: 'dev' },
];

export default function Integraciones() {
  const { authFetch } = usePanel();
  const [env, setEnv] = useState({});
  const [tests, setTests] = useState({});

  useEffect(() => { authFetch('/api/integraciones').then(setEnv).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function probar(id) {
    setTests((t) => ({ ...t, [id]: { loading: true } }));
    try { const r = await authFetch('/api/integraciones', { test: id }); setTests((t) => ({ ...t, [id]: r })); }
    catch (e) { setTests((t) => ({ ...t, [id]: { ok: false, error: e.message } })); }
  }

  const status = (i) => {
    const t = tests[i.id];
    if (i.state === 'on') return ['ok', 'Activa'];
    if (i.state === 'test') return t ? (t.loading ? ['warn', 'Probando…'] : t.ok ? ['ok', 'Conectada'] : ['bad', 'Sin respuesta']) : ['warn', 'Sin probar'];
    if (i.state === 'env') return env[i.id] ? (t && !t.loading ? (t.ok ? ['ok', 'Conectada'] : ['bad', 'Token rechazado']) : ['ok', 'Configurada']) : ['warn', 'Falta credencial'];
    return ['', 'En desarrollo'];
  };

  return (
    <>
      <PageHead title="Integraciones" sub="De dónde entran los datos y a dónde salen. El estado que ves es el real." />
      <div className="integ">
        {LIST.map((i) => {
          const [cls, label] = status(i);
          const t = tests[i.id];
          return (
            <div className="card" key={i.id}>
              <div className="head"><b>{i.name}</b><span className={`tag ${cls}`}><span className={`dot ${cls}`} />{label}</span></div>
              <p className="small" style={{ margin: 0 }}>{i.what}</p>
              {i.need && <p className="small muted" style={{ margin: 0 }}><b>Para activarla:</b> {i.need}</p>}
              {(i.state === 'test' || (i.state === 'env' && env[i.id])) && (
                <div><button className="ghost sm" onClick={() => probar(i.id)} disabled={t?.loading}>Probar conexión</button></div>
              )}
              {t && !t.loading && i.id === 'denue' && (
                <details className="small" open>
                  <summary>{t.ok ? 'Respuesta de la herramienta' : `No respondió${t.status ? ` (código ${t.status})` : ''}`}</summary>
                  {t.ok && (
                    <>
                      <p className="muted" style={{ margin: '6px 0 2px' }}>Campos que devuelve:</p>
                      <code style={{ display: 'block', whiteSpace: 'pre-wrap' }}>{(t.campos || []).join(', ') || '(ninguno)'}</code>
                      <p className="muted" style={{ margin: '8px 0 2px' }}>Cómo lo leyó la app:</p>
                      <code style={{ display: 'block', whiteSpace: 'pre-wrap' }}>{JSON.stringify(t.ejemplo, null, 1)}</code>
                      <p className="muted" style={{ margin: '8px 0 2px' }}>Catálogo de sectores:</p>
                      <code style={{ display: 'block', whiteSpace: 'pre-wrap', maxHeight: 140, overflow: 'auto' }}>{t.catalogo}</code>
                    </>
                  )}
                  {t.error && <p className="muted">{t.error}</p>}
                </details>
              )}
              {t && !t.loading && i.id === 'hubspot' && !t.ok && <p className="small muted" style={{ margin: 0 }}>{t.error || `HubSpot respondió ${t.status}`}</p>}
            </div>
          );
        })}
      </div>
      <p className="small muted" style={{ marginTop: 14 }}>«En desarrollo» significa que la conexión todavía no está programada: requiere credenciales o aprobaciones de un tercero antes de poder construirla y probarla.</p>
    </>
  );
}
