// Small PHP-ish helpers used by JSX ported from Blade templates (see tools/blade2jsx.py).
/* eslint-disable @typescript-eslint/no-explicit-any */
export const count = (x: any): number => (x == null ? 0 : Array.isArray(x) ? x.length : typeof x === 'object' ? Object.keys(x).length : x.length ?? 0);
export const empty = (x: any): boolean => x == null || x === '' || x === 0 || x === '0' || x === false || (Array.isArray(x) && x.length === 0);
export const isset = (x: any): boolean => x != null;
export const ucfirst = (s: any): string => (s == null ? '' : String(s).charAt(0).toUpperCase() + String(s).slice(1));
export const ucwords = (s: any): string => String(s ?? '').replace(/\b\w/g, (c) => c.toUpperCase());
export const strtoupper = (s: any): string => String(s ?? '').toUpperCase();
export const strtolower = (s: any): string => String(s ?? '').toLowerCase();
export const trim = (s: any): string => String(s ?? '').trim();
export const round = (n: any, p = 0): number => {
  const f = 10 ** p;
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
};
export const floor = (n: any): number => Math.floor(Number(n));
export const ceil = (n: any): number => Math.ceil(Number(n));
export const abs = (n: any): number => Math.abs(Number(n));
export const number_format = (n: any, d = 0): string => Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
export const in_array = (v: any, a: any[]): boolean => (a ?? []).includes(v);
export const implode = (sep: string, a: any[]): string => (a ?? []).join(sep);
export const str_replace = (a: any, b: any, s: any): string => String(s ?? '').split(a).join(b);
export const strlen = (s: any): number => String(s ?? '').length;
export const substr = (s: any, a: number, l?: number): string => (l === undefined ? String(s ?? '').slice(a) : String(s ?? '').substr(a, l));
export const json_decode = (s: any): any => {
  try {
    return typeof s === 'string' ? JSON.parse(s) : s;
  } catch {
    return null;
  }
};
export const asset = (p: string): string => '/' + p.replace(/^\/+/, '');
export const date = (_fmt: string, v: any): string => String(v ?? '');
