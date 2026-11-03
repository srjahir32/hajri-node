import { Router } from 'express';
import ExcelJS from 'exceljs';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ok, pageMeta, pageParams, wrap } from '../lib/http';
import { badRequest, notFound } from '../lib/errors';
import { requireStaff } from '../middleware/auth';
import { checkSubscription } from '../middleware/subscription';
import { dateOnly, fmtDate, normalizeTz, secondsToHm, todayIn } from '../lib/time';
import { idParams, int, optBool, optNum, optStr, optInt } from '../lib/validation';
import * as att from '../services/attendance.service';
import * as leaves from '../services/leave.service';
import { staffTz, resolveShift, checkHoliday, businessTz } from '../services/context.service';
import { staffSession } from '../services/auth.service';
import { notificationRouter } from './admin/notification.routes';
import { monthCalendar } from '../services/attendance.service';
import { attendanceDetails, detailsQuery } from '../services/attendanceDetails.service';

export const employeeRouter = Router();
employeeRouter.use(requireStaff, checkSubscription);

const anyDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

employeeRouter.get('/dashboard', wrap(async (req, res) => {
  const staff = req.staff!;
  const tz = await staffTz(staff);
  const today = todayIn(tz);
  const [rows, leave, holiday, shift, cards, unread] = await Promise.all([
    prisma.attendance.findMany({ where: { staffId: staff.id, date: dateOnly(today), deletedAt: null }, orderBy: { id: 'asc' } }),
    prisma.staffLeave.findFirst({ where: { staffId: staff.id, status: 1, deletedAt: null, startDate: { lte: dateOnly(today) }, endDate: { gte: dateOnly(today) } } }),
    checkHoliday(staff.businessId, today, staff.id),
    resolveShift(staff.id, today),
    leaves.leaveCards(staff.id),
    prisma.notification.count({ where: { staffId: staff.id, isRead: false } }),
  ]);
  const summary = att.summarizeDay(today, rows, tz, { leave, holiday, fallbackPayable: shift.payableSeconds });
  const last = rows.filter((r) => r.approval !== 2).at(-1);
  ok(res, {
    date: today,
    timezone: tz,
    summary,
    is_punched_in: !!(last?.inAt && !last.outAt),
    last_attendance: last ? att.attendanceDto(last, tz) : null,
    shift: { name: shift.name, type_id: shift.typeId, start_time: shift.startTime, end_time: shift.endTime, break_minutes: Math.round(shift.breakSeconds / 60), payable_hours: shift.payableSeconds / 3600 },
    holiday: holiday.isHoliday ? holiday : null,
    leave: leave ? leaves.leaveDto(leave) : null,
    leave_cards: cards,
    unread_notifications: unread,
  });
}));

employeeRouter.post('/punch', wrap(async (req, res) => {
  const b = z.object({ latitude: optNum, longitude: optNum, accuracy: optNum }).parse(req.body);
  const out = await att.punch(req.staff!, { latitude: b.latitude, longitude: b.longitude, accuracy: b.accuracy });
  ok(res, out, 'success', { action: out.action, punch_in_time: out.punch_in_time, punch_out_time: out.punch_out_time });
}));

// ── attendance ──
employeeRouter.get('/attendance', wrap(async (req, res) => {
  const tz = await staffTz(req.staff!);
  const today = todayIn(tz);
  const q = z.object({ month: optInt, year: optInt }).parse(req.query);
  const cal = await monthCalendar(req.staff!, q.year ?? Number(today.slice(0, 4)), q.month ?? Number(today.slice(5, 7)));
  ok(res, cal.days, 'success', { count: cal.count });
}));

employeeRouter.get('/attendance/export', wrap(async (req, res) => {
  const tz = await staffTz(req.staff!);
  const today = todayIn(tz);
  const q = z.object({ month: optInt, year: optInt }).parse(req.query);
  const year = q.year ?? Number(today.slice(0, 4));
  const month = q.month ?? Number(today.slice(5, 7));
  const cal = await monthCalendar(req.staff!, year, month);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Attendance');
  ws.addRow(['Date', 'Status', 'In', 'Out', 'Worked (h:m)', 'Break (h:m)', 'Overtime (h:m)', 'Note']).font = { bold: true };
  for (const d of cal.days) ws.addRow([d.date, d.status, d.first_in ?? '', d.last_out ?? '', secondsToHm(d.total_seconds), secondsToHm(d.break_seconds), secondsToHm(d.overtime_seconds), d.note ?? '']);
  ws.columns.forEach((c) => (c.width = 16));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-${year}-${String(month).padStart(2, '0')}.xlsx"`);
  res.send(Buffer.from(await wb.xlsx.writeBuffer()));
}));

employeeRouter.get('/attendance/details', wrap(async (req, res) => {
  const out = await attendanceDetails(req.staff!.businessId, detailsQuery.parse(req.query), req.staff!.id);
  ok(res, out.cards[0] ?? null, 'success', out.meta);
}));

employeeRouter.get('/attendance/day', wrap(async (req, res) => {
  const { date } = z.object({ date: anyDate }).parse(req.query);
  const staff = req.staff!;
  const tz = await staffTz(staff);
  const rows = await prisma.attendance.findMany({ where: { staffId: staff.id, date: dateOnly(date), deletedAt: null }, orderBy: { id: 'asc' } });
  const leave = await prisma.staffLeave.findFirst({ where: { staffId: staff.id, status: 1, deletedAt: null, startDate: { lte: dateOnly(date) }, endDate: { gte: dateOnly(date) } } });
  ok(res, att.summarizeDay(date, rows, tz, { leave, holiday: await checkHoliday(staff.businessId, date, staff.id) }));
}));

// ── attendance requests (forgot to punch) ──
employeeRouter.get('/attendance-requests', wrap(async (req, res) => {
  const staff = req.staff!;
  const tz = await staffTz(staff);
  const q = z.object({ status: optInt }).parse(req.query);
  const { page, size, skip, take } = pageParams(req.query, 20, 100);
  const where = { staffId: staff.id, attendance: { deletedAt: null, ...(q.status !== undefined ? { approval: q.status } : {}) } };
  const [total, rows] = await Promise.all([
    prisma.attendanceRequest.count({ where }),
    prisma.attendanceRequest.findMany({ where, include: { attendance: true }, orderBy: { id: 'desc' }, skip, take }),
  ]);
  ok(res, rows.map((r) => ({ request_id: r.id, requested_at: r.createdAt.toISOString(), ...att.attendanceDto(r.attendance, tz) })), 'success', pageMeta(page, size, total));
}));

employeeRouter.post('/attendance-requests', wrap(async (req, res) => {
  const b = z.object({ punch_in: z.string().min(1), punch_out: z.string().min(1), reason: z.string().trim().min(1, 'Reason is required').max(500) }).parse(req.body);
  const tz = await staffTz(req.staff!);
  // "2026-03-04T09:30" is read in the staff timezone; ISO strings that carry an offset are respected
  const parse = (v: string) =>
    /([zZ]|[+-]\d{2}:?\d{2})$/.test(v) ? new Date(v) : DateTime.fromISO(v.replace(' ', 'T'), { zone: normalizeTz(tz) }).toUTC().toJSDate();
  const punchIn = parse(b.punch_in);
  const punchOut = parse(b.punch_out);
  if (Number.isNaN(punchIn.getTime()) || Number.isNaN(punchOut.getTime())) throw badRequest('Invalid date or time');
  ok(res, await att.submitAttendanceRequest(req.staff!, { punchIn, punchOut, reason: b.reason }), 'Attendance request submitted successfully.');
}));

// ── leaves ──
employeeRouter.get('/leaves', wrap(async (req, res) => {
  const staff = req.staff!;
  const q = z.object({ status: optInt, year: optInt, month: optInt }).parse(req.query);
  const { page, size, skip, take } = pageParams(req.query, 20, 100);
  const where = {
    staffId: staff.id,
    deletedAt: null,
    ...(q.status !== undefined ? { status: q.status } : {}),
    ...(q.year ? { createdAt: { gte: new Date(Date.UTC(q.year, (q.month ?? 1) - 1, 1)), lt: new Date(Date.UTC(q.year, q.month ?? 12, 1)) } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.staffLeave.count({ where }),
    prisma.staffLeave.findMany({ where, orderBy: { id: 'desc' }, skip, take }),
  ]);
  ok(res, rows.map(leaves.leaveDto), 'success', pageMeta(page, size, total));
}));

employeeRouter.get('/leaves/balance', wrap(async (req, res) => {
  ok(res, await leaves.leaveCards(req.staff!.id));
}));

employeeRouter.post('/leaves', wrap(async (req, res) => {
  const b = z
    .object({
      leave_type: z.enum(['Full Day', 'Half Day']),
      shift_type: z.enum(['First Half', 'Last Half']).optional().nullable(),
      is_unpaid: optBool,
      leave_policy_id: optInt,
      reason: z.string().trim().min(1, 'Reason is required').max(500),
      start_date: anyDate,
      end_date: anyDate,
    })
    .parse(req.body);
  const leave = await leaves.applyLeave({
    staffId: req.staff!.id,
    leaveType: b.leave_type,
    shiftType: b.shift_type,
    isUnpaid: b.is_unpaid ?? false,
    leavePolicyId: b.leave_policy_id,
    reason: b.reason,
    startDate: b.start_date,
    endDate: b.end_date,
  });
  ok(res, leaves.leaveDto(leave), 'Leave request submitted');
}));

employeeRouter.delete('/leaves/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const r = await prisma.staffLeave.updateMany({ where: { id, staffId: req.staff!.id, status: 0, deletedAt: null }, data: { deletedAt: new Date() } });
  if (!r.count) throw notFound('Pending leave not found');
  ok(res, null, 'Leave request cancelled');
}));

// ── holidays ──
employeeRouter.get('/holidays', wrap(async (req, res) => {
  const staff = req.staff!;
  const assigned = await prisma.holidayPolicyStaff.findMany({ where: { staffId: staff.id }, select: { policyId: true } });
  const policies = await prisma.holidayPolicy.findMany({
    where: { businessId: staff.businessId, ...(assigned.length ? { id: { in: assigned.map((a) => a.policyId) } } : {}) },
    include: { holidays: { orderBy: { date: 'asc' } } },
    orderBy: [{ year: 'desc' }, { id: 'desc' }],
  });
  const weekly = await prisma.weeklyHolidayStaff.findMany({ where: { staffId: staff.id } });
  const weeklyDays = weekly.length ? weekly.map((w) => w.day) : (await prisma.weeklyHolidayBusiness.findMany({ where: { businessId: staff.businessId } })).map((w) => w.day);
  ok(res, policies.map((p) => ({ id: p.id, name: p.name, year: p.year, holidays: p.holidays.map((h) => ({ id: h.id, name: h.name, date: fmtDate(h.date) })) })), 'success', { weekly_holiday_days: weeklyDays });
}));

// ── profile ──
employeeRouter.get('/profile', wrap(async (req, res) => {
  ok(res, await staffSession(req.staff!.id));
}));

employeeRouter.get('/profile/details', wrap(async (req, res) => {
  const p = await prisma.staffProfile.findUnique({ where: { staffId: req.staff!.id } });
  ok(res, { date_of_birth: p?.dateOfBirth ? fmtDate(p.dateOfBirth) : null, gender: p?.gender ?? null, address1: p?.address1 ?? null, address2: p?.address2 ?? null, city: p?.city ?? null, state: p?.state ?? null, pincode: p?.pincode ?? null });
}));

employeeRouter.put('/profile', wrap(async (req, res) => {
  const b = z
    .object({ name: z.string().trim().min(1).optional(), middle_name: optStr, last_name: optStr, email: z.preprocess((v) => (v === '' ? undefined : v), z.string().email().optional()), timezone: optStr })
    .parse(req.body);
  await prisma.staff.update({
    where: { id: req.staff!.id },
    data: {
      ...(b.name ? { name: b.name } : {}),
      ...(b.middle_name !== undefined ? { middleName: b.middle_name } : {}),
      ...(b.last_name !== undefined ? { lastName: b.last_name } : {}),
      ...(b.email ? { email: b.email } : {}),
      ...(b.timezone ? { timezone: normalizeTz(b.timezone) } : {}),
    },
  });
  const d = z.object({ date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(), gender: optStr, address1: optStr, address2: optStr, city: optStr, state: optStr, pincode: optStr }).parse(req.body);
  const profile = {
    ...(d.date_of_birth !== undefined ? { dateOfBirth: d.date_of_birth ? dateOnly(d.date_of_birth) : null } : {}),
    ...(d.gender !== undefined ? { gender: d.gender } : {}),
    ...(d.address1 !== undefined ? { address1: d.address1 } : {}),
    ...(d.address2 !== undefined ? { address2: d.address2 } : {}),
    ...(d.city !== undefined ? { city: d.city } : {}),
    ...(d.state !== undefined ? { state: d.state } : {}),
    ...(d.pincode !== undefined ? { pincode: d.pincode } : {}),
  };
  if (Object.keys(profile).length) await prisma.staffProfile.upsert({ where: { staffId: req.staff!.id }, create: { staffId: req.staff!.id, ...profile }, update: profile });
  ok(res, await staffSession(req.staff!.id), 'Profile updated');
}));

employeeRouter.post('/fcm', wrap(async (req, res) => {
  const { fcm_id } = z.object({ fcm_id: z.string().min(1) }).parse(req.body);
  await prisma.staff.update({ where: { id: req.staff!.id }, data: { fcmId: fcm_id } });
  ok(res);
}));

// ── live location ──
employeeRouter.get('/location/settings', wrap(async (req, res) => {
  const s = await prisma.systemSetting.findUnique({ where: { businessId: req.staff!.businessId } });
  ok(res, { location_update_interval: s?.locationUpdateInterval ?? 600, location_api_call_interval: s?.locationApiCallInterval ?? 600, staff_allowed_radius: s?.staffAllowedRadius ?? 100 });
}));

employeeRouter.post('/location', wrap(async (req, res) => {
  const staff = req.staff!;
  const b = z.object({ date: anyDate.optional(), location: z.array(z.record(z.string(), z.unknown())).min(1).max(500) }).parse(req.body);
  const tz = await staffTz(staff);
  const date = b.date ?? todayIn(tz);
  const last = await prisma.attendance.findFirst({ where: { staffId: staff.id, date: dateOnly(date), deletedAt: null }, orderBy: { id: 'desc' } });
  if (last?.outAt) return ok(res, null, 'Live location off', { status: 2 });
  await att.appendLiveLocations(staff, date, b.location);
  ok(res);
}));

employeeRouter.get('/location/count', wrap(async (req, res) => {
  const tz = await staffTz(req.staff!);
  const date = (req.query.date as string) || todayIn(tz);
  const row = await prisma.liveLocation.findUnique({ where: { staffId_date: { staffId: req.staff!.id, date: dateOnly(date) } } });
  ok(res, { count: Array.isArray(row?.points) ? (row!.points as unknown[]).length : 0 });
}));

employeeRouter.get('/company', wrap(async (req, res) => {
  const b = await prisma.business.findUnique({ where: { id: req.staff!.businessId }, select: { id: true, name: true, businessAddress: true, logoUrl: true } });
  ok(res, b && { id: b.id, name: b.name, business_address: b.businessAddress, logo: b.logoUrl, timezone: await businessTz(b.id) });
}));

employeeRouter.use('/notifications', notificationRouter((req) => ({ staffId: req.staff!.id })));

export const _u = [int];
