// Base en memoria para previsualizar la interfaz sin conexión (solo con NEXT_PUBLIC_PREVIEW=1 en local).
import { loadDemo } from './demo';

export function mockClient() {
  const db = {
    settings: [{ id: 1, client_name: 'Pisos Demo', product_line: 'pisos de hule', sender_name: 'Equipo comercial', icp_scian: ['71394', '336'], icp_states: ['Jalisco'], estrato_min: 3, estrato_max: 6, cpl_max_mxn: 300, outbound_legal_ok: true }],
    companies: [], leads: [], lead_events: [], suppressions: [], content_pieces: [], ad_spend: [], allowed_emails: [{ email: 'demo@ialeads.app', role: 'mood' }],
  };
  let seq = 1;
  const from = (t) => {
    const f = []; let op = 'select', payload, lim, single = false, ord;
    const api = {
      select() { return api; }, eq(k, v) { f.push((r) => r[k] == v); return api; }, gte(k, v) { f.push((r) => r[k] >= v); return api; },
      in(k, v) { f.push((r) => v.includes(r[k])); return api; }, contains(k, v) { f.push((r) => v.every((x) => (r[k] || []).includes(x))); return api; },
      not(k) { f.push((r) => r[k] != null); return api; }, order(k, o) { ord = [k, o?.ascending !== false]; return api; }, limit(n) { lim = n; return api; },
      maybeSingle() { single = true; return api; }, single() { single = true; return api; },
      insert(p) { op = 'insert'; payload = [].concat(p); return api; }, upsert(p) { op = 'insert'; payload = [].concat(p); return api; },
      update(p) { op = 'update'; payload = p; return api; }, delete() { op = 'delete'; return api; },
      then(res, rej) {
        let out;
        if (op === 'insert') {
          const base = { leads: { status: 'nuevo' }, companies: { status: 'nueva', seq_step: 0, origins: [] }, content_pieces: { status: 'backlog' } }[t] || {};
          out = payload.map((p) => ({ id: String(seq++), created_at: new Date().toISOString(), ...base, ...p }));
          db[t].push(...out);
        } else {
          let m = db[t].filter((r) => f.every((fn) => fn(r)));
          if (op === 'update') m.forEach((r) => Object.assign(r, payload));
          if (op === 'delete') db[t] = db[t].filter((r) => !m.includes(r));
          if (ord) m = [...m].sort((a, b) => (a[ord[0]] > b[ord[0]] ? 1 : -1) * (ord[1] ? 1 : -1));
          if (lim) m = m.slice(0, lim);
          out = m;
        }
        return Promise.resolve({ data: single ? out[0] || null : out, count: out.length, error: null }).then(res, rej);
      },
    };
    return api;
  };
  const client = {
    from, rpc: async () => ({ data: true }),
    auth: { getSession: async () => ({ data: { session: { user: { email: 'demo@ialeads.app' }, access_token: 'x' } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => {} },
  };
  loadDemo(client);
  return client;
}
