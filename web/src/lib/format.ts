export const fmtMoney = (n: number | null | undefined, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n ?? 0);

export const fmtNum = (n: number | null | undefined) => new Intl.NumberFormat('en-IN').format(n ?? 0);

/** seconds → "7h 30m" */
export function fmtDuration(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0));
  if (!s) return '0h 0m';
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

/** seconds → "07:30" */
export function fmtHm(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
}

/** Employee ID as shown on the admin staff profile: first three letters of the business name + staff id ("TES1"). */
export function employeeCode(businessName: string | null | undefined, staffId: number | null | undefined): string {
  if (staffId == null) return '';
  return `${(businessName ?? '').slice(0, 3).toUpperCase()}${staffId}`;
}

/** "14:05:09" → "2:05 PM" */
export function fmtClock(t: string | null | undefined): string {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function fmtDate(d: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }): string {
  if (!d) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB', opts).format(date);
}

export const fmtDateTime = (d: string | null | undefined) => fmtDate(d, { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return fmtDate(iso);
}

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const monthStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const initials = (name?: string | null) =>
  (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthStr(d);
}

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** '2026-03' -> 'Mar 2026' (the period strings Laravel stores for leave policies) */
export const ymToLabel = (ym: string) => (ym ? `${MON3[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}` : '');
/** 'Mar 2026' -> '2026-03' */
export const labelToYm = (label: string | null | undefined) => {
  const m = /^([A-Za-z]{3}) (\d{4})$/.exec((label ?? '').trim());
  const i = m ? MON3.indexOf(m[1]) : -1;
  return m && i >= 0 ? `${m[2]}-${String(i + 1).padStart(2, '0')}` : '';
};

/** "14:05:00" -> "02:05 PM" (PHP `date('h:i A', strtotime(...))`, zero-padded hour) */
export function fmtTime12(t: string | null | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
