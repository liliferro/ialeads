'use client';

import Link from 'next/link';
import { SECTORES } from '@/lib/sectores';

const PATHS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  inbox: 'M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  doc: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  ads: 'M4 19V9M10 19V5M16 19v-7M21 19H3',
  ban: 'M12 21a9 9 0 100-18 9 9 0 000 18zM6 6l12 12',
  plug: 'M9 3v5M15 3v5M7 8h10v4a5 5 0 01-10 0zM12 17v4',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-2-4-2 1-2-1V5h-4v2l-2 1-2-1-2 4 2 1v2l-2 1 2 4 2-1 2 1v2h4v-2l2-1 2 1 2-4-2-1z',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  check: 'M5 12l5 5 9-10',
};

export function Icon({ name, size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] || ''} />
    </svg>
  );
}

// Botones tipo "chip" para elegir varias opciones sin escribir nada.
export function Chips({ options, value, onChange, label }) {
  const set = new Set(value);
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={o.id}
          className="chip"
          aria-pressed={set.has(o.id)}
          onClick={() => onChange(set.has(o.id) ? value.filter((v) => v !== o.id) : [...value, o.id])}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SectorPicker({ value, onChange }) {
  return <Chips options={SECTORES} value={value} onChange={onChange} label="Sectores" />;
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="pagehead">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

export function ProspectTabs({ active }) {
  return (
    <nav className="seg" aria-label="Origen de las cuentas">
      <Link href="/panel/cuentas" aria-current={active === 'denue' ? 'page' : undefined}>Base DENUE</Link>
      <Link href="/panel/web" aria-current={active === 'web' ? 'page' : undefined}>Web pública</Link>
    </nav>
  );
}
