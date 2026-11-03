'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export type DTApi = any;
export type JQ = any;

let loading: Promise<JQ> | null = null;
/** jQuery + DataTables (+ responsive), exactly the stack the Laravel admin pages use. */
export function loadJQuery(): Promise<JQ> {
  loading ??= (async () => {
    const $ = (await import('jquery')).default;
    const w = window as any;
    w.jQuery = w.$ = $;
    // DataTables 1.11 / Responsive 2.2 export a factory in CommonJS: register them against our jQuery explicitly
    const dt: any = await import('datatables.net');
    (dt.default ?? dt)(window, $);
    const rs: any = await import('datatables.net-responsive');
    (rs.default ?? rs)(window, $);
    return $;
  })();
  return loading;
}

interface Props {
  id: string;
  className?: string;
  /** the `<tr><th>…</th></tr>` header rows */
  head: ReactNode;
  /** called after jQuery is loaded; returns the DataTables settings. Re-run when `deps` change. */
  options: ($: JQ) => Record<string, unknown>;
  deps?: unknown[];
  /** gets the DataTables API once initialised (and the container for delegated events) */
  onReady?: (api: DTApi, container: HTMLElement, $: JQ) => void | (() => void);
  tableStyle?: React.CSSProperties;
}

/**
 * Real DataTables inside React. The `<table>` is created imperatively inside a container that React never
 * touches, so DataTables can wrap it (`.dataTables_wrapper`) and rewrite rows freely. Markup/CSS match Laravel.
 */
export function DataTable({ id, className = 'display', head, options, deps = [], onReady, tableStyle }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const optsRef = useRef(options);
  optsRef.current = options;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    let disposed = false;
    let api: DTApi = null;
    let cleanup: void | (() => void);
    const el = box.current;
    if (!el) return;
    (async () => {
      const $ = await loadJQuery();
      if (disposed || !box.current) return;
      const thead = renderToStaticMarkup(<thead>{head}</thead>);
      box.current.innerHTML = `<table id="${id}" class="${className}" style="width:100%" width="100%">${thead}<tbody></tbody></table>`;
      api = ($(box.current).find('table') as any).DataTable(optsRef.current($));
      cleanup = readyRef.current?.(api, box.current, $);
    })();
    return () => {
      disposed = true;
      if (typeof cleanup === 'function') cleanup();
      try {
        api?.destroy(true);
      } catch {
        /* already gone */
      }
      if (el) el.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return <div ref={box} style={tableStyle} />;
}
