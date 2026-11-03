import { z } from 'zod';

/** Accepts numbers or numeric strings ("5", "5.5"); empty string / null → undefined. */
export const num = z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : typeof v === 'string' ? Number(v) : v), z.number().finite());
export const int = z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : typeof v === 'string' ? Number(v) : v), z.number().int());
export const optInt = int.optional();
export const optNum = num.optional();

/** Accepts true/false, 1/0, "1"/"0", "true"/"false", "on"/"off" */
export const bool = z.preprocess((v) => {
  if (typeof v === 'string') return ['1', 'true', 'on', 'yes'].includes(v.toLowerCase());
  if (typeof v === 'number') return v === 1;
  return v;
}, z.boolean());
export const optBool = bool.optional();

export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Use YYYY-MM-DD').transform((s) => s.slice(0, 10));
export const timeStr = z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/, 'Use HH:mm').transform((s) => (s.length <= 5 ? `${s.padStart(5, '0')}:00` : s.padStart(8, '0')));
export const optStr = z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().trim().optional());
export const monthParam = int.pipe(z.number().min(1).max(12));
export const yearParam = int.pipe(z.number().min(2000).max(2100));

export const idList = z.preprocess(
  (v) => (typeof v === 'string' ? v.split(',').filter(Boolean).map(Number) : v),
  z.array(int.pipe(z.number())).min(1, 'Select at least one item'),
);

export const idParams = z.object({ id: int });

/** "2026-03" → { year, month } */
export const yearMonth = z.string().regex(/^\d{4}-\d{2}$/).transform((s) => ({ year: Number(s.slice(0, 4)), month: Number(s.slice(5, 7)) }));
