'use client';

import { useEffect, useRef } from 'react';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const toLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MON[m - 1]} ${y}`;
};

/**
 * The Laravel admin's month field: a read-only input with the bootstrap-datepicker month view ("Oct 2026").
 * `value`/`onChange` use `YYYY-MM`.
 */
export function MonthPicker({ value, onChange, className = '', id, name, maxMonth, minMonth, placeholder }: { value: string; onChange: (ym: string) => void; className?: string; id?: string; name?: string; maxMonth?: string; minMonth?: string; placeholder?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let disposed = false;
    let $el: JQuery<HTMLInputElement> | null = null;
    (async () => {
      const $ = (await import('jquery')).default;
      (window as unknown as { jQuery: unknown }).jQuery = $;
      await import('bootstrap-datepicker');
      if (disposed || !ref.current) return;
      $el = $(ref.current);
      const opts: Record<string, unknown> = { format: 'M yyyy', startView: 'months', minViewMode: 'months', autoclose: true };
      if (maxMonth) {
        const [y, m] = maxMonth.split('-').map(Number);
        opts.endDate = new Date(y, m, 0);
      }
      if (minMonth) {
        const [y, m] = minMonth.split('-').map(Number);
        opts.startDate = new Date(y, m - 1, 1);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($el as any).datepicker(opts);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($el as any).datepicker('update', value ? toLabel(value) : '');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ($el as any).on('changeDate', (e: any) => {
        const d: Date | undefined = e.date;
        if (d) cb.current(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      });
    })();
    return () => {
      disposed = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ($el) ($el as any).datepicker('destroy');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxMonth, minMonth]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    import('jquery').then(({ default: $ }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dp = ($(el) as any).data('datepicker');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (dp) ($(el) as any).datepicker('update', value ? toLabel(value) : '');
    });
  }, [value]);

  return <input ref={ref} type="text" id={id} name={name} className={className} defaultValue={value ? toLabel(value) : ''} placeholder={placeholder} readOnly autoComplete="off" />;
}
