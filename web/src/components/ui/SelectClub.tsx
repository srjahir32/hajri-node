'use client';

import { Children, Fragment, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';

interface Opt {
  value: string;
  label: string;
  disabled?: boolean;
  selected?: boolean;
  hidden?: boolean;
}

function textOf(n: ReactNode): string {
  if (n == null || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(textOf).join('');
  if (isValidElement(n)) return textOf((n.props as { children?: ReactNode }).children);
  return '';
}

function collect(children: ReactNode, out: Opt[]) {
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return;
    const el = c as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean; selected?: boolean; hidden?: boolean }>;
    if (el.type === 'option') {
      out.push({ value: String(el.props.value ?? textOf(el.props.children)), label: textOf(el.props.children).replace(/\s+/g, ' ').trim(), disabled: el.props.disabled, selected: el.props.selected, hidden: el.props.hidden });
    } else if (el.type === Fragment || typeof el.type === 'symbol') collect(el.props.children, out);
    else if (el.props?.children) collect(el.props.children, out);
  });
}

interface Props {
  id?: string;
  name?: string;
  className?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  onChange?: (e: { target: { value: string; name?: string } }, value: string) => void;
  /** Extra row pinned below the options (e.g. "+ Add Department"); clicking it closes the list and runs `onSelect`. */
  action?: { label: ReactNode; onSelect: () => void };
  children?: ReactNode;
}

/**
 * The Laravel `select.select-club-services` enhancement (layout/main.blade.php): the native <select> stays (hidden, so forms
 * and FormData still work) with a styled `span` label + `ul` list. Used as a drop-in for <select> with <option> children.
 * `<option hidden>` stays in the native select (e.g. an empty placeholder value) but is left out of the list.
 */
export function SelectClub({ id, name, className = '', placeholder, value, defaultValue, disabled, onChange, action, children }: Props) {
  const opts: Opt[] = [];
  collect(children, opts);
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? opts.find((o) => o.selected)?.value ?? '');
  const cur = controlled ? value : inner;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const chosen = opts.find((o) => o.value === cur && o.value !== '');
  const label = chosen?.label ?? placeholder ?? opts.find((o) => o.value === '')?.label ?? '';
  const pick = (v: string) => {
    if (!controlled) setInner(v);
    setOpen(false);
    // let native listeners (and form libraries) see it as well
    queueMicrotask(() => {
      onChange?.({ target: { value: v, name } }, v);
    });
  };
  return (
    <div className={`select-club-services selectDropdown${open ? ' open' : ''}${chosen ? ' filled' : ''}${disabled ? ' disabled' : ''}`} ref={ref}>
      <select ref={sel} className={className} id={id} name={name} value={cur} disabled={disabled} onChange={() => undefined}>
        {opts.map((o) => (
          <option key={o.value + o.label} value={o.value} disabled={o.disabled} hidden={o.hidden}>
            {o.label}
          </option>
        ))}
      </select>
      <span onClick={() => !disabled && setOpen((o) => !o)}>{label}</span>
      <ul>
        {opts.filter((o) => !o.hidden).map((o) => (
          <li key={o.value + o.label} className={o.value === cur && o.value !== '' ? 'active' : ''}>
            <a
              data-id={o.value}
              onClick={(e) => {
                e.preventDefault();
                if (!o.disabled) pick(o.value);
              }}
            >
              {o.label}
            </a>
          </li>
        ))}
        {action && (
          <li className="select-club-action">
            <a
              role="button"
              tabIndex={open ? 0 : -1}
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                action.onSelect();
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                setOpen(false);
                action.onSelect();
              }}
            >
              {action.label}
            </a>
          </li>
        )}
      </ul>
    </div>
  );
}
