import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, wrap } from '../../lib/http';
import { adminBusinessId } from '../../middleware/auth';
import { businessTz } from '../../services/context.service';
import { dateOnly, daysInMonth, fmtDate, todayIn } from '../../lib/time';
import { listDay } from '../../services/attendance.service';
import { optStr, yearMonth } from '../../lib/validation';

export const dashboardRouter = Router();

/** Cheap counters for the sidebar badges. */
dashboardRouter.get('/pending', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const [attendance, leaves] = await Promise.all([
    prisma.attendance.count({ where: { deletedAt: null, approval: 0, staff: { businessId, deletedAt: null } } }),
    prisma.staffLeave.count({ where: { deletedAt: null, status: 0, staff: { businessId, deletedAt: null } } }),
  ]);
  ok(res, { attendance, leaves });
}));

dashboardRouter.get('/', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const tz = await businessTz(businessId);
  const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(req.query);
  const date = q.date ?? todayIn(tz);
  const day = await listDay(businessId, { date });

  const pick = (pred: (r: (typeof day.data)[number]) => boolean) =>
    day.data.filter(pred).slice(0, 5).map((r) => ({
      id: r.id,
      full_name: r.full_name,
      photo: r.photo,
      department: r.department?.name ?? null,
      in_time: r.first_in,
      out_time: r.last_out,
      behavior: r.behavior,
      status: r.status,
    }));

  const departments = await prisma.department.findMany({ where: { deletedAt: null, OR: [{ businessId }, { businessId: null }] } });
  const departmentLate = departments
    .map((d) => ({ id: d.id, name: d.name, late_count: day.data.filter((r) => r.department_id === d.id && r.behavior === 'Late').length }))
    .sort((a, b) => b.late_count - a.late_count)
    .slice(0, 5);

  const [pendingAttendance, pendingLeaves, holidays] = await Promise.all([
    prisma.attendance.count({ where: { deletedAt: null, approval: 0, staff: { businessId, deletedAt: null } } }),
    prisma.staffLeave.count({ where: { deletedAt: null, status: 0, staff: { businessId, deletedAt: null } } }),
    prisma.holidayList.findMany({
      where: { policy: { businessId }, date: { gte: dateOnly(date) } },
      orderBy: { date: 'asc' },
      take: 5,
    }),
  ]);

  ok(res, {
    date,
    count: day.counts,
    total_department: departments.length,
    holiday: day.holiday,
    present_staff: pick((r) => r.status === 'Present'),
    absent_staff: pick((r) => r.status === 'Absent' && !r.is_leave),
    half_day_staff: pick((r) => r.status === 'Half Day'),
    leave_staff: pick((r) => r.is_leave === 1),
    late_staff: pick((r) => r.behavior === 'Late'),
    department_wise_late_count: departmentLate,
    pending: { attendance: pendingAttendance, leaves: pendingLeaves },
    upcoming_holidays: holidays.map((h) => ({ id: h.id, name: h.name, date: fmtDate(h.date) })),
  });
}));

/** Distinct present / absent / half-day staff per day of a month. */
dashboardRouter.get('/chart', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const tz = await businessTz(businessId);
  const q = z.object({ month: optStr }).parse(req.query);
  const { year, month } = yearMonth.parse(q.month ?? todayIn(tz).slice(0, 7));
  const dates = daysInMonth(year, month);
  const rows = await prisma.attendance.findMany({
    where: { deletedAt: null, approval: 1, date: { gte: dateOnly(dates[0]), lte: dateOnly(dates[dates.length - 1]) }, staff: { businessId, deletedAt: null, isDeactivated: false } },
    select: { staffId: true, date: true, status: true },
  });
  const bucket = (status: string) => {
    const m = new Map<string, Set<number>>();
    for (const r of rows) if (r.status === status) m.set(fmtDate(r.date)!, (m.get(fmtDate(r.date)!) ?? new Set()).add(r.staffId));
    return dates.map((d) => ({ day: Number(d.slice(8)), date: d, count: m.get(d)?.size ?? 0 }));
  };
  ok(res, { present: bucket('Present'), absent: bucket('Absent'), half_day: bucket('Half Day') }, 'success', { month: `${year}-${String(month).padStart(2, '0')}` });
}));
