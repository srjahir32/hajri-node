import { DateTime, Duration } from 'luxon';

export const FALLBACK_TZ = 'UTC';

/** Normalise legacy aliases (the mobile apps still send Asia/Calcutta). */
export function normalizeTz(tz?: string | null): string {
  if (!tz) return FALLBACK_TZ;
  if (tz === 'Asia/Calcutta') return 'Asia/Kolkata';
  return DateTime.local().setZone(tz).isValid ? tz : FALLBACK_TZ;
}

/** 'YYYY-MM-DD' → Date at UTC midnight (what Prisma expects for @db.Date). */
export const dateOnly = (v: string | Date): Date => {
  if (v instanceof Date) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const d = DateTime.fromJSDate(new Date(v)).toUTC();
  return new Date(Date.UTC(d.year, d.month - 1, d.day));
};

/** @db.Date → 'YYYY-MM-DD' */
export const fmtDate = (d: Date | null | undefined): string | null => (d ? d.toISOString().slice(0, 10) : null);

export const todayIn = (tz: string): string => DateTime.now().setZone(normalizeTz(tz)).toISODate()!;

export function localParts(at: Date, tz: string) {
  const dt = DateTime.fromJSDate(at).setZone(normalizeTz(tz));
  return { dt, date: dt.toISODate()!, time: dt.toFormat('HH:mm:ss') };
}

/** "HH:mm[:ss]" → seconds since midnight */
export function hmsToSeconds(v?: string | null): number {
  if (!v) return 0;
  const [h = 0, m = 0, s = 0] = v.split(':').map((n) => Number(n) || 0);
  return h * 3600 + m * 60 + s;
}

export function secondsToHms(total: number): string {
  const t = Math.max(0, Math.round(total));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function secondsToHm(total: number): string {
  return secondsToHms(total).slice(0, 5);
}

export const humanDuration = (total: number) => {
  const d = Duration.fromObject({ seconds: Math.max(0, Math.round(total)) }).shiftTo('hours', 'minutes');
  return `${Math.floor(d.hours)}h ${Math.floor(d.minutes)}m`;
};

/** Build a UTC Date from a local wall-clock date + time in a timezone. */
export function localToUtc(date: string, time: string, tz: string): Date {
  const [h = 0, m = 0, s = 0] = time.split(':').map(Number);
  const dt = DateTime.fromISO(date, { zone: normalizeTz(tz) }).set({ hour: h, minute: m, second: s || 0 });
  return dt.toUTC().toJSDate();
}

export function daysInMonth(year: number, month: number): string[] {
  const start = DateTime.utc(year, month, 1);
  return Array.from({ length: start.daysInMonth! }, (_, i) => start.plus({ days: i }).toISODate()!);
}

export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  let d = DateTime.fromISO(from, { zone: 'utc' });
  const end = DateTime.fromISO(to, { zone: 'utc' });
  while (d <= end) {
    out.push(d.toISODate()!);
    d = d.plus({ days: 1 });
  }
  return out;
}

export const dayOfWeek = (isoDate: string) => DateTime.fromISO(isoDate, { zone: 'utc' }).weekday % 7; // 0 = Sunday
