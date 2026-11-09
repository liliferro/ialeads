// Envío a HubSpot (CRM gratuito) con token de app privada en HUBSPOT_ACCESS_TOKEN.
// Sin token, la app sigue funcionando y el lead queda marcado como "sin_configurar".

const API = 'https://api.hubapi.com';

async function hs(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  let json = null;
  try { json = await res.json(); } catch { /* sin cuerpo */ }
  return { ok: res.ok, status: res.status, json };
}

export async function sendToHubspot(lead) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return { status: 'sin_configurar' };
  try {
    const [first, ...rest] = String(lead.name || '').trim().split(/\s+/);
    const properties = { firstname: first || '', lastname: rest.join(' ') };
    if (lead.email) properties.email = lead.email;
    if (lead.phone) properties.phone = lead.phone;
    if (lead.company_name) properties.company = lead.company_name;
    if (lead.state) properties.state = lead.state;
    if (lead.municipality) properties.city = lead.municipality;

    let contact = await hs('/crm/v3/objects/contacts', { properties }, token);
    let id = contact.json?.id;
    if (contact.status === 409) {
      id = (contact.json?.message || '').match(/Existing ID:\s*(\d+)/)?.[1];
    }
    if (!id) return { status: `error_${contact.status}` };

    const body = [
      `<b>Lead desde ialeads</b>`,
      `Fuente: ${lead.source || '—'}`,
      `Intención: ${lead.intent || '—'}`,
      `Encaje: ${lead.fit || '—'} · Ruta: ${lead.route || '—'}`,
      `Necesidad: ${String(lead.need || '').replace(/[<>]/g, '')}`,
    ].join('<br>');
    await hs('/crm/v3/objects/notes', {
      properties: { hs_note_body: body, hs_timestamp: new Date().toISOString() },
      associations: [{ to: { id }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }] }],
    }, token);
    return { status: 'enviado', id: String(id) };
  } catch (e) {
    return { status: 'error_red' };
  }
}
