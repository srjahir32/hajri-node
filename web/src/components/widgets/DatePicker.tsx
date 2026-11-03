'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** "2026-01-26" -> "26 Jan 2026 | Mon" (the format of the Laravel holiday inputs) */
export const labelWithDay = (iso: string) => {
  if (!iso) return '';
  const d = toDate(iso);
  return `${pad(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()} | ${DOW[d.getDay()]}`;
};

/**
 * bootstrap-datepicker day field. `value` / `onChange` use YYYY-MM-DD; `format` is the display pattern
 * (default 'dd M yyyy' -> "26 Jan 2026"; pass 'dd M yyyy | D' to include the weekday).
 */
export function DatePicker({ value, onChange, className = '', id, name, placeholder = 'Select Date', format = 'dd M yyyy', min, max, readOnly = true }: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  format?: string;
  min?: string;
  max?: string;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let disposed = false;
    let $el: any = null;
    (async () => {
      const $ = (await import('jquery')).default;
      (window as any).jQuery = $;
      await import('bootstrap-datepicker');
      if (disposed || !ref.current) return;
      $el = $(ref.current);
      $el.datepicker({ format, autoclose: true, orientation: 'bottom auto', startDate: min ? toDate(min) : false, endDate: max ? toDate(max) : false });
      if (value) $el.datepicker('setDate', toDate(value));
      $el.on('changeDate', (e: any) => e.date && cb.current(toIso(e.date)));
      $el.on('clearDate', () => cb.current(''));
    })();
    return () => {
      disposed = true;
      $el?.datepicker('destroy');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, format]);

  useEffect(() => {
    const el = ref.current as any;
    if (!el || !(window as any).jQuery) return;
    const $el = (window as any).jQuery(el);
    if (!$el.data('datepicker')) return;
    if (value) $el.datepicker('setDate', toDate(value));
    else $el.datepicker('clearDates');
  }, [value]);

  return <input ref={ref} type="text" id={id} name={name} className={className} placeholder={placeholder} readOnly={readOnly} autoComplete="off" defaultValue="" />;
}
