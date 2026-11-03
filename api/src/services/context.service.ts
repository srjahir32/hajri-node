import { DateTime } from 'luxon';
import type { Staff, WorkingShiftDetail } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { dateOnly, dayOfWeek, fmtDate, hmsToSeconds, normalizeTz } from '../lib/time';

// ───────────── Timezones ─────────────

const tzCache = new Map<number, { tz: string; at: number }>();

export async function businessTz(businessId: number): Promise<string> {
  const hit = tzCache.get(businessId);
  if (hit && Date.now() - hit.at < 60_000) return hit.tz;
  const s = await prisma.systemSetting.findUnique({ where: { businessId }, select: { timezone: true } });
  const tz = normalizeTz(s?.timezone);
  tzCache.set(businessId, { tz, at: Date.now() });
  return tz;
}

export const clearTzCache = (businessId: number) => tzCache.delete(businessId);

/** A staff member's own timezone wins; otherwise the business timezone. */
export async function staffTz(staff: Pick<Staff, 'timezone' | 'businessId'>): Promise<string> {
  return staff.timezone ? normalizeTz(staff.timezone) : businessTz(staff.businessId);
}

// ───────────── Shifts ─────────────

export interface ResolvedShift {
  shiftId: number | null;
  typeId: 1 | 2 | 3;
  name: string | null;
  startTime: string | null; // HH:mm:ss business-local
  endTime: string | null;
  breakSeconds: number;
  payableSeconds: number;
}

const DEFAULT_PAYABLE = 8 * 3600;

function fromDetail(shiftId: number, typeId: number, name: string | null, d: WorkingShiftDetail | undefined): ResolvedShift {
  return {
    shiftId,
    typeId: typeId as 1 | 2 | 3,
    name: d?.name ?? name,
    startTime: d?.shiftStartTime ?? null,
    endTime: d?.shiftEndTime ?? null,
    breakSeconds: d?.breakSeconds ?? 0,
    payableSeconds: d?.totalPayableSeconds ?? DEFAULT_PAYABLE,
  };
}

/** Which shift detail applies to the staff member on `date` (YYYY-MM-DD, business-local). */
export async function resolveShift(staffId: number, date: string): Promise<ResolvedShift> {
  const link = await prisma.workingShiftUser.findUnique({
    where: { staffId },
    include: { shift: { include: { details: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } } } },
  });
  if (!link) return { shiftId: null, typeId: 3, name: null, startTime: null, endTime: null, breakSeconds: 0, payableSeconds: DEFAULT_PAYABLE };

  const { shift } = link;
  const details = shift.details;
  if (shift.shiftTypeId !== 2) return fromDetail(shift.id, shift.shiftTypeId, shift.name, details[0]);

  // Rotational: an explicit per-date override wins, otherwise rotate from the assignment date.
  const override = await prisma.rotationalShift.findFirst({
    where: { staffId, startDate: { lte: dateOnly(date) }, endDate: { gte: dateOnly(date) } },
    include: { detail: true },
    orderBy: { id: 'desc' },
  });
  if (override) {
    const d = override.detail;
    return {
      ...fromDetail(shift.id, 2, shift.name, d),
      startTime: override.startTime ?? d.shiftStartTime,
      endTime: override.endTime ?? d.shiftEndTime,
    };
  }
  if (!details.length) return fromDetail(shift.id, 2, shift.name, undefined);

  const hist = await prisma.workingShiftHistory.findFirst({
    where: { staffId, workingShiftId: shift.id },
    orderBy: { startDate: 'desc' },
  });
  const anchor = DateTime.fromISO(fmtDate(hist?.startDate) ?? date, { zone: 'utc' });
  const target = DateTime.fromISO(date, { zone: 'utc' });
  const diffDays = Math.floor(target.diff(anchor, 'days').days);
  let periods = 0;
  if (diffDays > 0) {
    if (link.workingType === 1) periods = Math.floor(diffDays / 7);
    else if (link.workingType === 2) periods = Math.floor(target.diff(anchor.startOf('month'), 'months').months);
    else periods = diffDays;
  }
  const idx = (((link.startIndex ?? 0) + periods) % details.length + details.length) % details.length;
  return fromDetail(shift.id, 2, shift.name, details[idx]);
}

/** Midpoint of the working day in seconds-from-midnight (flexible shifts assume a 09:00 start). */
export function shiftWindow(shift: ResolvedShift): { start: number; end: number } {
  if (shift.typeId === 3 || !shift.startTime || !shift.endTime) {
    const start = 9 * 3600;
    return { start, end: start + shift.payableSeconds };
  }
  const start = hmsToSeconds(shift.startTime);
  let end = hmsToSeconds(shift.endTime);
  if (end <= start) end += 24 * 3600; // overnight shift
  return { start, end };
}

// ───────────── Holidays ─────────────

export async function weeklyHolidayDays(businessId: number, staffId?: number): Promise<number[]> {
  if (staffId) {
    const own = await prisma.weeklyHolidayStaff.findMany({ where: { staffId }, select: { day: true } });
    if (own.length) return own.map((r) => r.day);
  }
  const rows = await prisma.weeklyHolidayBusiness.findMany({ where: { businessId }, select: { day: true } });
  return rows.map((r) => r.day);
}

/** Policy holidays that apply to a staff member (assigned policies, else all of the business's). */
export async function policyHolidayDates(businessId: number, staffId?: number, from?: string, to?: string): Promise<Map<string, string>> {
  let policyIds: number[] | undefined;
  if (staffId) {
    const assigned = await prisma.holidayPolicyStaff.findMany({ where: { staffId }, select: { policyId: true } });
    if (assigned.length) policyIds = assigned.map((a) => a.policyId);
  }
  const rows = await prisma.holidayList.findMany({
    where: {
      policy: { businessId, ...(policyIds ? { id: { in: policyIds } } : {}) },
      ...(from && to ? { date: { gte: dateOnly(from), lte: dateOnly(to) } } : {}),
    },
    select: { name: true, date: true },
  });
  return new Map(rows.map((r) => [fmtDate(r.date)!, r.name]));
}

export interface HolidayInfo {
  isHoliday: boolean;
  type: 'weekly_holiday' | 'policy_holiday' | null;
  name: string | null;
}

export async function holidayCalendar(businessId: number, staffId: number | undefined, dates: string[]) {
  const weekly = new Set(await weeklyHolidayDays(businessId, staffId));
  const policy = dates.length ? await policyHolidayDates(businessId, staffId, dates[0], dates[dates.length - 1]) : new Map();
  return (date: string): HolidayInfo => {
    const p = policy.get(date);
    if (p) return { isHoliday: true, type: 'policy_holiday', name: p };
    if (weekly.has(dayOfWeek(date))) return { isHoliday: true, type: 'weekly_holiday', name: 'Weekly holiday' };
    return { isHoliday: false, type: null, name: null };
  };
}

export async function checkHoliday(businessId: number, date: string, staffId?: number): Promise<HolidayInfo> {
  return (await holidayCalendar(businessId, staffId, [date]))(date);
}
