'use client';

import { useEffect, useRef, useState } from 'react';

export interface Opt {
  value: string;
  label: string;
}

/**
 * The Laravel `.custom-dropdown` (trigger + `ul.dropdown-options`). `prefix` renders the static "Sort by " label.
 * `closeOnEscape` (opt-in, off by default): Escape closes the open list without changing the value.
 */
export function CustomDropdown({ options, value, onChange, prefix, className = '', selectClassName = '', closeOnEscape = false }: { options: Opt[]; value: string; onChange: (v: string) => void; prefix?: string; className?: string; selectClassName?: string; closeOnEscape?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  useEffect(() => {
    if (!closeOnEscape || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeOnEscape, open]);
  const cur = options.find((o) => o.value === value) ?? options[0];
  return (
    <div className={`custom-dropdown ${className}`} ref={ref} data-react-dropdown="">
      <div className="dropdown-trigger" onClick={() => setOpen((o) => !o)}>
        {prefix ? <span className="sort_by_text">{prefix}</span> : null}
        <span className="selected-value">{cur?.label}</span>
      </div>
      <ul className="dropdown-options" style={{ display: open ? 'block' : 'none' }}>
        {options.map((o) => (
          <li
            key={o.value}
            data-value={o.value}
            className={o.value === value ? 'selected' : ''}
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
          >
            {o.label}
          </li>
        ))}
      </ul>
      <select className={selectClassName} style={{ display: 'none' }} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
