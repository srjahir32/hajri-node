import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, pageMeta, pageParams, wrap } from '../../lib/http';
import { adminBusinessId, can } from '../../middleware/auth';
import { badRequest } from '../../lib/errors';
import { dateStr, idList, idParams, int, optBool, optInt, optStr, timeStr } from '../../lib/validation';
import { businessTz } from '../../services/context.service';
import { todayIn, dateOnly, daysInMonth } from '../../lib/time';
import { attendanceDetails, detailsQuery } from '../../services/attendanceDetails.service';
import * as att from '../../services/attendance.service';
import * as leaves from '../../services/leave.service';

export const attendanceRouter = Router();

const anyDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

/** Everyone's attendance for a date (default today). */
attendanceRouter.get('/', can('view_attendance'), wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const q = z.object({ date: anyDate.optional(), search: optStr, department_id: optInt, status: optStr }).parse(req.query);
  const date = q.date ?? todayIn(await businessTz(businessId));
  const out = await att.listDay(businessId, { date, search: q.search, departmentId: q.department_id, status: q.status });
  ok(res, out.data, 'success', { date, count: out.counts, holiday: out.holiday });
}));

attendanceRouter.post('/status', can('view_attendance', 'approve_punches'), wrap(async (req, res) => {
  const b = z.object({ staff_id: int, date: anyDate, status: z.enum(['Present', 'Absent', 'Half Day']), note: optStr }).parse(req.body);
  await att.setDayStatus(adminBusinessId(req), b.staff_id, b.date, b.status, req.admin!.user.id, b.note);
  ok(res, null, 'Attendance updated');
}));

attendanceRouter.post('/note', can('view_attendance'), wrap(async (req, res) => {
  const b = z.object({ staff_id: int, date: anyDate, note: z.string().trim().min(1).max(1000) }).parse(req.body);
  await att.addNote(adminBusinessId(req), b.staff_id, b.date, b.note, req.admin!.user.id);
  ok(res, null, 'Note added');
}));

attendanceRouter.post('/manual', can('approve_punches'), wrap(async (req, res) => {
  const b = z.object({ staff_id: int, date: anyDate, in_time: timeStr, out_time: timeStr.optional().nullable(), note: optStr }).parse(req.body);
  ok(res, await att.addManualPunch(adminBusinessId(req), b.staff_id, { date: b.date, inTime: b.in_time, outTime: b.out_time, note: b.note }, req.admin!.user.id), 'Punch added');
}));


/** Per-staff scheduled / worked / break / balance hours (Attendance Details cards). */
attendanceRouter.get('/details', can('view_attendance_details'), wrap(async (req, res) => {
  const out = await attendanceDetails(adminBusinessId(req), detailsQuery.parse(req.query));
  ok(res, out.cards, 'success', out.meta);
}));

// ── punches ──
attendanceRouter.get('/punches', can('view_punches'), wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const tz = await businessTz(businessId);
  const q = z.object({ from: anyDate.optional(), to: anyDate.optional(), staff_id: optInt, department_id: optInt, approval: optInt, search: optStr }).parse(req.query);
  const today = todayIn(tz);
  const { page, size, skip, take } = pageParams(req.query, 25, 200);
  const out = await att.listPunches(businessId, { from: q.from ?? today, to: q.to ?? today, staffId: q.staff_id, departmentId: q.department_id, approval: q.approval, search: q.search }, skip, take);
  ok(res, out.data, 'success', pageMeta(page, size, out.total));
}));

attendanceRouter.delete('/punches', can('rejected_punches', 'approve_punches'), wrap(async (req, res) => {
  const { ids } = z.object({ ids: idList }).parse(req.body);
  ok(res, { deleted: await att.deletePunches(adminBusinessId(req), ids) }, 'Deleted');
}));

// ── attendance approval requests ──
attendanceRouter.get('/requests', can('view_attendance_request'), wrap(async (req, res) => {
  const q = z.object({ approval: optInt, search: optStr }).parse(req.query);
  const { page, size, skip, take } = pageParams(req.query, 25, 200);
  const out = await att.listRequests(adminBusinessId(req), { approval: q.approval, search: q.search }, skip, take);
  ok(res, out.data, 'success', pageMeta(page, size, out.total));
}));

attendanceRouter.post('/requests/decide', wrap(async (req, res, next) => {
  const b = z.object({ ids: idList, action: z.enum(['approve', 'reject']) }).parse(req.body);
  const need = b.action === 'approve' ? 'approve_attendance_request' : 'rejected_attendance_request';
  const a = req.admin!;
  if (!a.isOwner && !a.permissions.has(need) && !a.permissions.has(b.action === 'approve' ? 'approve_punches' : 'rejected_punches')) {
    return next(badRequest('You do not have permission to perform this action'));
  }
  const n = await att.decideAttendance(adminBusinessId(req), b.ids, b.action === 'approve', a.user.id);
  ok(res, { updated: n }, b.action === 'approve' ? 'Approved' : 'Rejected');
}));

// ── leaves ──
attendanceRouter.get('/leaves', can('view_leave_management'), wrap(async (req, res) => {
  const q = z.object({ status: optInt, staff_id: optInt, from: anyDate.optional(), to: anyDate.optional(), search: optStr }).parse(req.query);
  const { page, size, skip, take } = pageParams(req.query, 25, 200);
  const out = await leaves.listLeaves(adminBusinessId(req), { status: q.status, staffId: q.staff_id, from: q.from, to: q.to, search: q.search }, skip, take);
  ok(res, out.data, 'success', pageMeta(page, size, out.total));
}));

attendanceRouter.post('/leaves', can('view_leave_management'), wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const b = z
    .object({
      staff_id: int,
      leave_type: z.enum(['Full Day', 'Half Day']),
      shift_type: z.enum(['First Half', 'Last Half']).optional().nullable(),
      is_unpaid: optBool,
      leave_policy_id: optInt,
      reason: z.string().trim().min(1, 'Reason is required'),
      start_date: anyDate,
      end_date: anyDate,
    })
    .parse(req.body);
  const staff = await prisma.staff.findFirst({ where: { id: b.staff_id, businessId, deletedAt: null } });
  if (!staff) throw badRequest('Staff not found');
  const leave = await leaves.applyLeave(
    { staffId: b.staff_id, leaveType: b.leave_type, shiftType: b.shift_type, isUnpaid: b.is_unpaid ?? false, leavePolicyId: b.leave_policy_id, reason: b.reason, startDate: b.start_date, endDate: b.end_date },
    { autoApprove: true, byUserId: req.admin!.user.id },
  );
  ok(res, leaves.leaveDto(leave), 'Leave added');
}));

attendanceRouter.post('/leaves/decide', wrap(async (req, res) => {
  const b = z.object({ ids: idList, action: z.enum(['approve', 'reject']) }).parse(req.body);
  const a = req.admin!;
  const need = b.action === 'approve' ? 'approve_leave' : 'rejected_leave';
  if (!a.isOwner && !a.permissions.has(need)) throw badRequest('You do not have permission to perform this action');
  const n = await leaves.decideLeaves(adminBusinessId(req), b.ids, b.action === 'approve', a.user.id);
  ok(res, { updated: n }, b.action === 'approve' ? 'Leave approved' : 'Leave rejected');
}));

attendanceRouter.delete('/leaves/:id', can('view_leave_management'), wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  await leaves.cancelLeave(adminBusinessId(req), id, req.admin!.user.id);
  ok(res, null, 'Leave cancelled');
}));

// ── reviews ──
/** Days where staff worked beyond their shift (review_overtime) or fell short (review_fines). */
attendanceRouter.get('/review/:kind', can('view_attendance'), wrap(async (req, res) => {
  const kind = z.enum(['overtime', 'fines']).parse(req.params.kind);
  const businessId = adminBusinessId(req);
  const tz = await businessTz(businessId);
  const q = z.object({ month: int.optional(), year: int.optional(), department_id: optInt }).parse(req.query);
  const now = new Date();
  const year = q.year ?? now.getUTCFullYear();
  const month = q.month ?? now.getUTCMonth() + 1;
  const dates = daysInMonth(year, month);
  const today = todayIn(tz);
  const rows = await prisma.attendance.findMany({
    where: {
      deletedAt: null,
      approval: 1,
      date: { gte: dateOnly(dates[0]), lte: dateOnly(dates[dates.length - 1]) },
      staff: { businessId, deletedAt: null, ...(q.department_id ? { departmentId: q.department_id } : {}) },
    },
    include: { staff: { include: { department: true, photos: { take: 1 } } } },
    orderBy: { id: 'asc' },
  });
  const grouped = new Map<string, typeof rows>();
  for (const r of rows) grouped.set(`${r.staffId}|${r.date.toISOString().slice(0, 10)}`, [...(grouped.get(`${r.staffId}|${r.date.toISOString().slice(0, 10)}`) ?? []), r]);
  const out = [];
  for (const [key, list] of grouped) {
    const date = key.split('|')[1];
    const sum = att.summarizeDay(date, list, tz);
    if (kind === 'overtime' && sum.overtime_seconds > 0) out.push({ ...att.staffCard(list[0].staff), date, total_seconds: sum.total_seconds, payable_seconds: sum.payable_seconds, extra_seconds: sum.overtime_seconds });
    if (kind === 'fines' && date < today && sum.shortfall_seconds > 0) out.push({ ...att.staffCard(list[0].staff), date, total_seconds: sum.total_seconds, payable_seconds: sum.payable_seconds, extra_seconds: sum.shortfall_seconds });
  }
  out.sort((a, b) => (a.date < b.date ? 1 : -1));
  ok(res, out, 'success', { month, year });
}));

export const unused = dateStr;
