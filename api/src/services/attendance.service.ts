import { DateTime } from 'luxon';
import type { Attendance, Prisma, Staff, StaffLeave } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { dateOnly, daysInMonth, fmtDate, localParts, localToUtc, secondsToHms, normalizeTz } from '../lib/time';
import { distanceMeters } from '../lib/geo';
import {
  businessTz,
  holidayCalendar,
  resolveShift,
  shiftWindow,
  staffTz,
  type HolidayInfo,
  type ResolvedShift,
} from './context.service';
import { businessOwnerId, notifyStaff, notifyUser } from './comms.service';
import { env } from '../config/env';

export const MIN_PUNCH_GAP_SECONDS = 30;

export type DayStatus = 'Present' | 'Absent' | 'Half Day' | 'Paid Leave' | 'Pending' | 'Leave' | 'Holiday' | 'Not Marked';

// ───────────────────────────── DTOs ─────────────────────────────

const localTime = (d: Date | null, tz: string) => (d ? DateTime.fromJSDate(d).setZone(tz).toFormat('HH:mm:ss') : null);

export function attendanceDto(r: Attendance, tz: string) {
  return {
    id: r.id,
    staff_id: r.staffId,
    date: fmtDate(r.date),
    in_time: localTime(r.inAt, tz),
    out_time: localTime(r.outAt, tz),
    in_at: r.inAt?.toISOString() ?? null,
    out_at: r.outAt?.toISOString() ?? null,
    total_time: secondsToHms(r.totalSeconds),
    break_time: r.breakSeconds ? secondsToHms(r.breakSeconds) : null,
    total_seconds: r.totalSeconds,
    break_seconds: r.breakSeconds,
    status: r.status,
    attendance_status: r.approval, // 0 pending, 1 approved, 2 rejected (legacy name)
    is_manual: r.isManual ? 1 : 0,
    behavior: r.behavior,
    note: r.note,
    latitude: r.latitude ? Number(r.latitude) : null,
    longitude: r.longitude ? Number(r.longitude) : null,
    accuracy: r.accuracy,
  };
}

export interface DaySummary {
  date: string;
  status: DayStatus;
  is_leave: 0 | 1;
  leave_type: string | null;
  holiday: HolidayInfo | null;
  approval: number | null;
  first_in: string | null;
  last_out: string | null;
  first_in_at: string | null;
  last_out_at: string | null;
  total_seconds: number;
  break_seconds: number;
  overtime_seconds: number;
  shortfall_seconds: number;
  payable_seconds: number;
  behavior: string | null;
  note: string | null;
  punches: ReturnType<typeof attendanceDto>[];
}

/** Collapse the punch rows of one day (plus leave/holiday context) into a single status line. */
export function summarizeDay(
  date: string,
  rows: Attendance[],
  tz: string,
  ctx: { leave?: StaffLeave | null; holiday?: HolidayInfo | null; fallbackPayable?: number } = {},
): DaySummary {
  const live = rows.filter((r) => r.approval !== 2);
  const approved = live.filter((r) => r.approval === 1);
  const pending = live.filter((r) => r.approval === 0);

  let status: DayStatus = 'Not Marked';
  if (approved.some((r) => r.status === 'Present')) status = 'Present';
  else if (approved.some((r) => r.status === 'Half Day')) status = 'Half Day';
  else if (approved.some((r) => r.status === 'Paid Leave')) status = 'Paid Leave';
  else if (approved.some((r) => r.status === 'Absent')) status = 'Absent';
  else if (pending.length) status = 'Pending';
  else if (ctx.leave) status = 'Leave';
  else if (ctx.holiday?.isHoliday) status = 'Holiday';

  const counted = approved.filter((r) => r.status === 'Present' || r.status === 'Half Day' || r.status === 'Paid Leave');
  const total = counted.reduce((s, r) => s + r.totalSeconds, 0);
  const breakS = live.reduce((s, r) => s + r.breakSeconds, 0);
  const payable = live[0]?.payableSeconds || ctx.fallbackPayable || 0;
  const withIn = live.filter((r) => r.inAt);
  const withOut = live.filter((r) => r.outAt);
  const first = withIn[0]?.inAt ?? null;
  const last = withOut.length ? withOut[withOut.length - 1].outAt : null;

  return {
    date,
    status,
    is_leave: ctx.leave ? 1 : 0,
    leave_type: ctx.leave?.leaveType ?? null,
    holiday: ctx.holiday?.isHoliday ? ctx.holiday : null,
    approval: live.length ? (pending.length ? 0 : 1) : null,
    first_in: localTime(first, tz),
    last_out: localTime(last, tz),
    first_in_at: first?.toISOString() ?? null,
    last_out_at: last?.toISOString() ?? null,
    total_seconds: total,
    break_seconds: breakS,
    overtime_seconds: payable ? Math.max(0, total - payable) : 0,
    shortfall_seconds: status === 'Present' && payable ? Math.max(0, payable - total) : 0,
    payable_seconds: payable,
    behavior: withIn[0]?.behavior ?? null,
    note: live.find((r) => r.note)?.note ?? null,
    punches: rows.map((r) => attendanceDto(r, tz)),
  };
}

// ───────────────────────────── Logs / live location ─────────────────────────────

export async function logStaff(staffId: number, logBy: number | null, detail: string) {
  await prisma.staffLog.create({ data: { staffId, logBy, detail } });
}

async function appendLivePoint(staff: Staff, date: string, point: Record<string, unknown>) {
  const key = { staffId_date: { staffId: staff.id, date: dateOnly(date) } };
  const existing = await prisma.liveLocation.findUnique({ where: key });
  const points = Array.isArray(existing?.points) ? (existing!.points as unknown[]) : [];
  points.push(point);
  await prisma.liveLocation.upsert({
    where: key,
    create: { staffId: staff.id, businessId: staff.businessId, date: dateOnly(date), points: points as Prisma.InputJsonValue },
    update: { points: points as Prisma.InputJsonValue },
  });
}

export async function appendLiveLocations(staff: Staff, date: string, locations: Record<string, unknown>[]) {
  const key = { staffId_date: { staffId: staff.id, date: dateOnly(date) } };
  const existing = await prisma.liveLocation.findUnique({ where: key });
  const points = [...(Array.isArray(existing?.points) ? (existing!.points as unknown[]) : []), ...locations];
  await prisma.liveLocation.upsert({
    where: key,
    create: { staffId: staff.id, businessId: staff.businessId, date: dateOnly(date), points: points as Prisma.InputJsonValue },
    update: { points: points as Prisma.InputJsonValue },
  });
}

// ───────────────────────────── Punching ─────────────────────────────

export interface PunchInput {
  at?: Date;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
}

export interface PunchResult {
  action: 'punch_in' | 'punch_out';
  punch_in_time: string | null;
  punch_out_time: string | null;
  needs_approval: boolean;
  attendance: ReturnType<typeof attendanceDto>;
}

async function behaviorFor(businessId: number, shift: ResolvedShift, nowSecOfDay: number): Promise<'Early' | 'Regular' | 'Late' | null> {
  if (shift.typeId === 3 || !shift.startTime) return null;
  const setting = await prisma.attendanceSetting.findUnique({ where: { businessId } });
  const tolerance = (setting?.punchInTimeTolerance ?? 30) * 60;
  const { start } = shiftWindow(shift);
  if (nowSecOfDay < start) return 'Early';
  if (nowSecOfDay <= start + tolerance) return 'Regular';
  return 'Late';
}

async function assertNotOnLeave(staff: Staff, dateD: Date, nowSec: number, shift: ResolvedShift) {
  const leave = await prisma.staffLeave.findFirst({
    where: { staffId: staff.id, status: 1, deletedAt: null, startDate: { lte: dateD }, endDate: { gte: dateD } },
  });
  if (!leave) return;
  if (leave.leaveType === 'Full Day') {
    throw badRequest('You are on leave today. To punch in, please ask your administrator to cancel your leave.');
  }
  if (leave.leaveType === 'Half Day' && leave.shiftType) {
    const { start, end } = shiftWindow(shift);
    const mid = start + (end - start) / 2;
    const midLabel = DateTime.fromSeconds(mid, { zone: 'utc' }).toFormat('HH:mm');
    if (leave.shiftType === 'First Half' && nowSec < mid) {
      throw badRequest(`You are on First Half leave today. You can only punch in after ${midLabel} (midpoint of your shift).`);
    }
    if (leave.shiftType === 'Last Half' && nowSec >= mid) {
      throw badRequest(`You are on Last Half leave today. You can only punch in/out before ${midLabel} (midpoint of your shift).`);
    }
  }
}

async function geofenceCheck(staff: Staff, input: PunchInput): Promise<boolean> {
  if (!staff.isGeoFencing || input.latitude == null || input.longitude == null) return false;
  const profile = await prisma.staffProfile.findUnique({ where: { staffId: staff.id } });
  const business = await prisma.business.findUnique({ where: { id: staff.businessId } });
  const refLat = profile?.latitude ?? business?.latitude;
  const refLng = profile?.longitude ?? business?.longitude;
  if (refLat == null || refLng == null) return false;
  const setting = await prisma.systemSetting.findUnique({ where: { businessId: staff.businessId } });
  const radius = setting?.staffAllowedRadius || 100;
  return distanceMeters(Number(refLat), Number(refLng), input.latitude, input.longitude) >= radius;
}

const fullName = (s: Pick<Staff, 'name' | 'middleName' | 'lastName'>) => [s.name, s.middleName, s.lastName].filter(Boolean).join(' ');

/** Toggle punch in / punch out for a staff member (the single entry point used by web + mobile). */
export async function punch(staff: Staff, input: PunchInput = {}): Promise<PunchResult> {
  if (staff.isDeactivated) throw forbidden('This staff is deactivated.');
  const tz = await staffTz(staff);
  const at = input.at ?? new Date();
  const { dt, date } = localParts(at, tz);
  const dateD = dateOnly(date);
  const nowSec = dt.hour * 3600 + dt.minute * 60 + dt.second;
  const shift = await resolveShift(staff.id, date);

  await assertNotOnLeave(staff, dateD, nowSec, shift);

  const rows = await prisma.attendance.findMany({
    where: { staffId: staff.id, date: dateD, deletedAt: null, approval: { not: 2 } },
    orderBy: { id: 'asc' },
  });
  const last = rows[rows.length - 1];
  const needsApproval = staff.isRemote && !staff.autoApproveAttendance;
  const geo = { latitude: input.latitude ?? null, longitude: input.longitude ?? null, accuracy: input.accuracy ?? null };
  const owner = await businessOwnerId(staff.businessId);
  const label = fullName(staff);
  const timeLabel = dt.toFormat('h:mm a');

  // ── punch out ──
  if (last?.inAt && !last.outAt) {
    const gap = Math.floor((at.getTime() - last.inAt.getTime()) / 1000);
    if (gap < 0) throw badRequest('Your last punch is dated in the future. Please ask your admin to correct it.');
    if (gap < MIN_PUNCH_GAP_SECONDS) {
      const remaining = MIN_PUNCH_GAP_SECONDS - gap;
      throw badRequest(`You just punched in. Wait for ${remaining}s.`, { remaining_time: remaining });
    }
    const updated = await prisma.attendance.update({
      where: { id: last.id },
      data: { outAt: at, totalSeconds: Math.max(0, gap), ...geo },
    });
    const outside = await geofenceCheck(staff, input);
    const win = shift.typeId !== 3 && shift.endTime ? shiftWindow(shift) : null;
    const earlyExit = !!win && win.end <= 86400 && nowSec < win.end;
    await logStaff(staff.id, owner, `${label} has added Punch Out Entry at ${timeLabel} Today`);
    if (earlyExit) await logStaff(staff.id, owner, `${label} punched out early at ${timeLabel} Today`);
    if (outside) {
      await logStaff(staff.id, owner, `${label} punched out outside the allowed geo-location at ${timeLabel} Today`);
      await notifyUser(owner, { message: `${label} punched out outside the office address.`, action: 'staff_outside_punchout', actionId: staff.id });
    }
    await appendLivePoint(staff, date, { ...geo, type: 'punch_out', timestamp: at.toISOString() });
    return {
      action: 'punch_out',
      punch_in_time: localTime(updated.inAt, tz),
      punch_out_time: localTime(updated.outAt, tz),
      needs_approval: updated.approval === 0,
      attendance: attendanceDto(updated, tz),
    };
  }

  // ── punch in ──
  let breakSeconds = 0;
  if (last?.outAt) {
    const gap = Math.floor((at.getTime() - last.outAt.getTime()) / 1000);
    if (gap < 0) throw badRequest('Your last punch is dated in the future. Please ask your admin to correct it.');
    if (gap < MIN_PUNCH_GAP_SECONDS) {
      const remaining = MIN_PUNCH_GAP_SECONDS - gap;
      throw badRequest(`You just punched out. Wait for ${remaining}s.`, { remaining_time: remaining });
    }
    breakSeconds = gap;
  }
  const isFirstOfDay = rows.length === 0;
  const behavior = isFirstOfDay ? await behaviorFor(staff.businessId, shift, nowSec) : null;

  // an admin placeholder (marked present without a punch) is completed instead of duplicated
  const placeholder = rows.find((r) => !r.inAt && !r.outAt && r.status !== 'Paid Leave' && r.status !== 'Absent');
  const data = {
    inAt: at,
    status: 'Present',
    approval: needsApproval ? 0 : 1,
    isManual: staff.isRemote,
    behavior,
    totalSeconds: 0,
    breakSeconds,
    payableSeconds: shift.payableSeconds,
    ...geo,
  };
  const row = placeholder
    ? await prisma.attendance.update({ where: { id: placeholder.id }, data })
    : await prisma.attendance.create({ data: { staffId: staff.id, date: dateD, ...data } });

  if (needsApproval) {
    await prisma.attendanceRequest.upsert({
      where: { staffId_attendanceId: { staffId: staff.id, attendanceId: row.id } },
      create: { staffId: staff.id, attendanceId: row.id },
      update: {},
    });
  }

  const outside = await geofenceCheck(staff, input);
  await logStaff(staff.id, owner, `${label} has added Punch In Entry at ${timeLabel} Today`);
  if (behavior === 'Late') await logStaff(staff.id, owner, `${label} came late at ${timeLabel} Today`);
  if (outside) {
    await logStaff(staff.id, owner, `${label} punched in outside the allowed geo-location at ${timeLabel} Today`);
    await notifyUser(owner, { message: `${label} punched in outside the office address.`, action: 'staff_outside_punchin', actionId: staff.id });
  }
  await appendLivePoint(staff, date, { ...geo, type: 'punch_in', timestamp: at.toISOString() });

  return {
    action: 'punch_in',
    punch_in_time: localTime(row.inAt, tz),
    punch_out_time: null,
    needs_approval: needsApproval,
    attendance: attendanceDto(row, tz),
  };
}

/** Close a dangling punch-in (used when a staff member logs out without punching out). */
export async function autoPunchOutOnLogout(staff: Staff) {
  const tz = await staffTz(staff);
  const { date } = localParts(new Date(), tz);
  const last = await prisma.attendance.findFirst({
    where: { staffId: staff.id, date: dateOnly(date), deletedAt: null, approval: { not: 2 } },
    orderBy: { id: 'desc' },
  });
  if (!last?.inAt || last.outAt) return;
  const now = new Date();
  await prisma.attendance.update({
    where: { id: last.id },
    data: { outAt: now, totalSeconds: Math.max(0, Math.floor((now.getTime() - last.inAt.getTime()) / 1000)) },
  });
}

// ───────────────────────────── Manual requests / admin edits ─────────────────────────────

/** Staff asks for a forgotten punch to be added (needs admin approval). */
export async function submitAttendanceRequest(staff: Staff, input: { punchIn: Date; punchOut: Date; reason: string }) {
  if (input.punchOut <= input.punchIn) throw badRequest('Punch out must be after punch in');
  if (input.punchOut > new Date()) throw badRequest('You cannot request attendance for a time in the future');
  const tz = await staffTz(staff);
  const { date, dt: inLocal } = localParts(input.punchIn, tz);
  const dateD = dateOnly(date);

  const overlap = await prisma.attendance.findFirst({
    where: {
      staffId: staff.id,
      date: dateD,
      deletedAt: null,
      approval: { not: 2 },
      inAt: { lt: input.punchOut },
      outAt: { gt: input.punchIn },
    },
  });
  if (overlap) throw badRequest('Attendance or request already exists for this date and time range.');

  const shift = await resolveShift(staff.id, date);
  const firstOfDay = (await prisma.attendance.count({ where: { staffId: staff.id, date: dateD, deletedAt: null, approval: { not: 2 } } })) === 0;
  const behavior = firstOfDay ? await behaviorFor(staff.businessId, shift, inLocal.hour * 3600 + inLocal.minute * 60 + inLocal.second) : null;
  const row = await prisma.attendance.create({
    data: {
      staffId: staff.id,
      date: dateD,
      inAt: input.punchIn,
      outAt: input.punchOut,
      totalSeconds: Math.floor((input.punchOut.getTime() - input.punchIn.getTime()) / 1000),
      payableSeconds: shift.payableSeconds,
      status: 'Present',
      approval: 0,
      isManual: true,
      behavior,
      note: input.reason,
    },
  });
  await prisma.attendanceRequest.create({ data: { staffId: staff.id, attendanceId: row.id } });
  const owner = await businessOwnerId(staff.businessId);
  await notifyUser(owner, {
    message: `${fullName(staff)} has submitted an attendance request.`,
    action: 'staff_attendance_request',
    actionId: row.id,
  });
  return attendanceDto(row, tz);
}

/** Approve or reject pending punch rows (single, selected or bulk). */
export async function decideAttendance(businessId: number, ids: number[], approve: boolean, byUserId: number) {
  if (!ids.length) throw badRequest('Select at least one entry');
  const rows = await prisma.attendance.findMany({
    where: { id: { in: ids }, deletedAt: null, staff: { businessId } },
    include: { staff: true },
  });
  if (!rows.length) throw notFound('Attendance entries not found');
  const value = approve ? 1 : 2;
  await prisma.attendance.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { approval: value } });
  for (const r of rows) {
    const tz = await staffTz(r.staff);
    await logStaff(r.staffId, byUserId, `Attendance entry for ${fmtDate(r.date)} was ${approve ? 'approved' : 'rejected'}`);
    await notifyStaff(r.staffId, {
      message: `Your attendance for ${fmtDate(r.date)}${r.inAt ? ` (${localTime(r.inAt, tz)?.slice(0, 5)})` : ''} was ${approve ? 'approved' : 'rejected'}.`,
      action: approve ? 'attendance_approved' : 'attendance_rejected',
      actionId: r.id,
    });
  }
  return rows.length;
}

export async function deletePunches(businessId: number, ids: number[]) {
  const res = await prisma.attendance.updateMany({
    where: { id: { in: ids }, deletedAt: null, staff: { businessId } },
    data: { deletedAt: new Date() },
  });
  return res.count;
}

type MarkStatus = 'Present' | 'Absent' | 'Half Day';

/** Admin marks a staff member's whole day as Present / Absent / Half Day. */
export async function setDayStatus(businessId: number, staffId: number, date: string, status: MarkStatus, byUserId: number, note?: string) {
  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId, deletedAt: null } });
  if (!staff) throw notFound('Staff not found');
  if (staff.isDeactivated) throw badRequest('This staff is deactivated.');
  const dateD = dateOnly(date);
  const shift = await resolveShift(staffId, date);
  const rows = await prisma.attendance.findMany({ where: { staffId, date: dateD, deletedAt: null }, orderBy: { id: 'asc' } });
  const fullPay = status === 'Present' ? shift.payableSeconds : status === 'Half Day' ? Math.round(shift.payableSeconds / 2) : 0;

  if (rows.length) {
    await prisma.attendance.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { status, approval: 1, ...(note ? { note } : {}) },
    });
    // a row with no real punches takes the full/half-day credit so payroll pays it
    const bare = rows.filter((r) => !r.inAt && !r.outAt);
    if (bare.length) await prisma.attendance.update({ where: { id: bare[0].id }, data: { totalSeconds: fullPay } });
  } else {
    await prisma.attendance.create({
      data: { staffId, date: dateD, status, approval: 1, isManual: true, totalSeconds: fullPay, payableSeconds: shift.payableSeconds, note: note ?? null },
    });
  }
  await logStaff(staffId, byUserId, `Attendance for ${date} was marked ${status}`);
}

/** Admin adds a punch pair for a staff member on a date. */
export async function addManualPunch(
  businessId: number,
  staffId: number,
  input: { date: string; inTime: string; outTime?: string | null; note?: string },
  byUserId: number,
) {
  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId, deletedAt: null } });
  if (!staff) throw notFound('Staff not found');
  const tz = await staffTz(staff);
  const inAt = localToUtc(input.date, input.inTime, tz);
  const outAt = input.outTime ? localToUtc(input.date, input.outTime, tz) : null;
  if (outAt && outAt <= inAt) throw badRequest('Punch out must be after punch in');
  if (inAt > new Date() || (outAt && outAt > new Date())) throw badRequest('Punch times cannot be in the future');
  const shift = await resolveShift(staffId, input.date);
  const dateD = dateOnly(input.date);
  const first = (await prisma.attendance.count({ where: { staffId, date: dateD, deletedAt: null, approval: { not: 2 } } })) === 0;
  const { dt } = localParts(inAt, tz);
  const behavior = first ? await behaviorFor(businessId, shift, dt.hour * 3600 + dt.minute * 60 + dt.second) : null;
  const row = await prisma.attendance.create({
    data: {
      staffId,
      date: dateD,
      inAt,
      outAt,
      totalSeconds: outAt ? Math.floor((outAt.getTime() - inAt.getTime()) / 1000) : 0,
      payableSeconds: shift.payableSeconds,
      status: 'Present',
      approval: 1,
      isManual: true,
      behavior,
      note: input.note ?? null,
    },
  });
  await logStaff(staffId, byUserId, `Punch entry added manually for ${input.date}`);
  return attendanceDto(row, tz);
}

export async function addNote(businessId: number, staffId: number, date: string, note: string, byUserId: number) {
  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId } });
  if (!staff) throw notFound('Staff not found');
  const rows = await prisma.attendance.findMany({ where: { staffId, date: dateOnly(date), deletedAt: null } });
  if (rows.length) await prisma.attendance.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { note } });
  else
    await prisma.attendance.create({
      data: { staffId, date: dateOnly(date), status: 'Absent', approval: 1, isManual: true, note },
    });
  await logStaff(staffId, byUserId, `Note added for ${date}: ${note}`);
}

// ───────────────────────────── Queries ─────────────────────────────

export function staffCard(
  s: Staff & { department?: { id: number; name: string } | null; photos?: { url: string }[] },
) {
  return {
    id: s.id,
    name: s.name,
    middle_name: s.middleName,
    last_name: s.lastName,
    full_name: fullName(s),
    phone_number: s.phoneNumber,
    country_code: s.countryCode,
    department_id: s.departmentId,
    department: s.department ? { id: s.department.id, name: s.department.name } : null,
    photo: s.photos?.[0]?.url ?? null,
    is_remote: s.isRemote ? 1 : 0,
  };
}

async function leavesCovering(staffIds: number[], from: string, to: string) {
  if (!staffIds.length) return [];
  return prisma.staffLeave.findMany({
    where: {
      staffId: { in: staffIds },
      status: 1,
      deletedAt: null,
      startDate: { lte: dateOnly(to) },
      endDate: { gte: dateOnly(from) },
    },
  });
}

export interface DayListFilters {
  date: string;
  search?: string;
  departmentId?: number;
  status?: string;
}

/** Everyone's attendance for one date, with the counters shown on the dashboard/attendance screens. */
export async function listDay(businessId: number, f: DayListFilters) {
  const tz = await businessTz(businessId);
  const dateD = dateOnly(f.date);
  const staff = await prisma.staff.findMany({
    where: {
      businessId,
      deletedAt: null,
      isDeactivated: false,
      ...(f.departmentId ? { departmentId: f.departmentId } : {}),
      ...(f.search ? { OR: [{ name: { contains: f.search } }, { lastName: { contains: f.search } }, { phoneNumber: { contains: f.search } }] } : {}),
    },
    include: { department: true, photos: { take: 1, orderBy: { id: 'desc' } } },
    orderBy: { name: 'asc' },
  });
  const ids = staff.map((s) => s.id);
  const [rows, leaves] = await Promise.all([
    prisma.attendance.findMany({ where: { staffId: { in: ids }, date: dateD, deletedAt: null }, orderBy: { id: 'asc' } }),
    leavesCovering(ids, f.date, f.date),
  ]);
  const holidayFor = await holidayCalendar(businessId, undefined, [f.date]);
  const holiday = holidayFor(f.date);

  const counts = { staff_count: staff.length, present_count: 0, absent_count: 0, halfday_count: 0, leave_count: 0, pending_count: 0, late_count: 0, not_marked_count: 0 };
  const data = staff
    .map((s) => {
      const myRows = rows.filter((r) => r.staffId === s.id);
      const leave = leaves.find((l) => l.staffId === s.id) ?? null;
      const sum = summarizeDay(f.date, myRows, s.timezone ? normalizeTz(s.timezone) : tz, { leave, holiday });
      if (sum.status === 'Present') counts.present_count++;
      else if (sum.status === 'Half Day') counts.halfday_count++;
      else if (sum.status === 'Absent' && !leave) counts.absent_count++;
      else if (sum.status === 'Pending') counts.pending_count++;
      else if (sum.status === 'Leave' || sum.status === 'Paid Leave') counts.leave_count++;
      else counts.not_marked_count++;
      if (sum.behavior === 'Late') counts.late_count++;
      return { ...staffCard(s), ...sum, status: sum.status };
    })
    .filter((r) => !f.status || r.status.toLowerCase() === f.status.toLowerCase() || (f.status === 'Late' && r.behavior === 'Late'));
  return { counts, data, holiday: holiday.isHoliday ? holiday : null };
}

/** One staff member's calendar for a month. */
export async function monthCalendar(staff: Staff, year: number, month: number) {
  return rangeCalendar(staff, daysInMonth(year, month));
}

/** Same as monthCalendar for an arbitrary run of consecutive dates (YYYY-MM-DD). */
export async function rangeCalendar(staff: Staff, dates: string[]) {
  const tz = await staffTz(staff);
  const [rows, leaves] = await Promise.all([
    prisma.attendance.findMany({
      where: { staffId: staff.id, deletedAt: null, date: { gte: dateOnly(dates[0]), lte: dateOnly(dates[dates.length - 1]) } },
      orderBy: { id: 'asc' },
    }),
    leavesCovering([staff.id], dates[0], dates[dates.length - 1]),
  ]);
  const holidayFor = await holidayCalendar(staff.businessId, staff.id, dates);
  const today = DateTime.now().setZone(tz).toISODate()!;
  const shift = await resolveShift(staff.id, dates[0]);

  const days = dates.map((date) => {
    const myRows = rows.filter((r) => fmtDate(r.date) === date);
    const leave = leaves.find((l) => fmtDate(l.startDate)! <= date && fmtDate(l.endDate)! >= date) ?? null;
    return summarizeDay(date, myRows, tz, { leave, holiday: holidayFor(date), fallbackPayable: shift.payableSeconds });
  });
  const count = (s: DayStatus) => days.filter((d) => d.status === s).length;
  return {
    count: {
      present_count: count('Present'),
      absent_count: count('Absent'),
      halfday_count: count('Half Day'),
      leave: count('Paid Leave') + count('Leave'),
      overtime: days.filter((d) => d.overtime_seconds > 0).length,
      fine: days.filter((d) => d.date < today && d.shortfall_seconds > 0).length,
    },
    days,
  };
}

/** Raw punch listing (view_punches) with filters + pagination. */
export async function listPunches(
  businessId: number,
  f: { from: string; to: string; staffId?: number; departmentId?: number; approval?: number; search?: string },
  skip: number,
  take: number,
) {
  const tz = await businessTz(businessId);
  const where: Prisma.AttendanceWhereInput = {
    deletedAt: null,
    date: { gte: dateOnly(f.from), lte: dateOnly(f.to) },
    ...(f.approval !== undefined ? { approval: f.approval } : {}),
    staff: {
      businessId,
      ...(f.staffId ? { id: f.staffId } : {}),
      ...(f.departmentId ? { departmentId: f.departmentId } : {}),
      ...(f.search ? { name: { contains: f.search } } : {}),
    },
  };
  const [total, rows] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      include: { staff: { include: { department: true, photos: { take: 1 } } } },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      skip,
      take,
    }),
  ]);
  return {
    total,
    data: rows.map((r) => ({ ...attendanceDto(r, r.staff.timezone ? normalizeTz(r.staff.timezone) : tz), staff: staffCard(r.staff) })),
  };
}

/** Pending punch/attendance requests for the approvals screen. */
export async function listRequests(businessId: number, f: { approval?: number; search?: string }, skip: number, take: number) {
  const tz = await businessTz(businessId);
  const where: Prisma.AttendanceRequestWhereInput = {
    attendance: { deletedAt: null, ...(f.approval !== undefined ? { approval: f.approval } : {}) },
    staff: { businessId, ...(f.search ? { name: { contains: f.search } } : {}) },
  };
  const [total, rows] = await Promise.all([
    prisma.attendanceRequest.count({ where }),
    prisma.attendanceRequest.findMany({
      where,
      include: { attendance: true, staff: { include: { department: true, photos: { take: 1 } } } },
      orderBy: { id: 'desc' },
      skip,
      take,
    }),
  ]);
  return {
    total,
    data: rows.map((r) => ({
      request_id: r.id,
      requested_at: r.createdAt.toISOString(),
      ...attendanceDto(r.attendance, r.staff.timezone ? normalizeTz(r.staff.timezone) : tz),
      staff: staffCard(r.staff),
    })),
  };
}

export const publicBaseUrl = env.API_URL;
