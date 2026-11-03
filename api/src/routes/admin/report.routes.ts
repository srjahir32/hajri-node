import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, wrap } from '../../lib/http';
import { adminBusinessId, can } from '../../middleware/auth';
import { int, monthParam, optInt, optStr, yearParam } from '../../lib/validation';
import * as reports from '../../services/report.service';
import * as payroll from '../../services/payroll.service';
import * as staffSvc from '../../services/staff.service';
import { businessTz } from '../../services/context.service';
import { todayIn } from '../../lib/time';

export const reportRouter = Router();
reportRouter.use(can('view_report'));

const range = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  department_id: optInt,
  staff_id: optInt,
  search: optStr,
});

async function resolveRange(businessId: number, q: z.infer<typeof range>) {
  const today = todayIn(await businessTz(businessId));
  const to = q.to ?? today;
  const from = q.from ?? `${to.slice(0, 8)}01`;
  return { from, to, departmentId: q.department_id, staffId: q.staff_id, search: q.search };
}

reportRouter.get('/attendance', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const f = await resolveRange(businessId, range.parse(req.query));
  const out = await reports.attendanceReport(businessId, f);
  ok(res, out.rows, 'success', { dates: out.dates, from: f.from, to: f.to });
}));

reportRouter.get('/attendance/export', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const f = await resolveRange(businessId, range.parse(req.query));
  const buf = await reports.attendanceReportXlsx(businessId, f);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-${f.from}-${f.to}.xlsx"`);
  res.send(buf);
}));

reportRouter.get('/staff', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const q = z.object({ search: optStr, department_id: optInt, status: z.enum(['active', 'deactivated', 'all']).optional() }).parse(req.query);
  const out = await staffSvc.listStaff(businessId, { search: q.search, departmentId: q.department_id, status: q.status ?? 'all' }, 0, 1000, todayIn(await businessTz(businessId)));
  ok(res, out.data);
}));

reportRouter.get('/staff/export', wrap(async (req, res) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="staff.xlsx"');
  res.send(await staffSvc.exportStaff(adminBusinessId(req)));
}));

reportRouter.get('/salary', wrap(async (req, res) => {
  const q = z.object({ month: monthParam, year: yearParam, department_id: optInt, search: optStr }).parse(req.query);
  ok(res, await payroll.payrollOverview(adminBusinessId(req), q.year, q.month, { departmentId: q.department_id, search: q.search }));
}));

reportRouter.get('/salary/export', wrap(async (req, res) => {
  const q = z.object({ month: monthParam, year: yearParam, department_id: optInt }).parse(req.query);
  const buf = await reports.salaryReportXlsx(adminBusinessId(req), q.year, q.month, { departmentId: q.department_id });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="salary-${q.year}-${String(q.month).padStart(2, '0')}.xlsx"`);
  res.send(buf);
}));

/** Payroll history of one staff member (staff_payroll_report). */
reportRouter.get('/staff-payroll/:id', wrap(async (req, res) => {
  const id = int.parse(req.params.id);
  const rows = await prisma.payroll.findMany({
    where: { staffId: id, businessId: adminBusinessId(req) },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  ok(res, rows.map(payroll.payrollDto));
}));

reportRouter.get('/salary-slips', wrap(async (req, res) => {
  const q = z.object({ month: monthParam, year: yearParam, staff_ids: optStr }).parse(req.query);
  const ids = q.staff_ids?.split(',').map(Number).filter(Boolean);
  const buf = await reports.salarySlipsPdf(adminBusinessId(req), q.year, q.month, ids);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="salary-slips-${q.year}-${String(q.month).padStart(2, '0')}.pdf"`);
  res.send(buf);
}));

/** Payroll runs generated for a month (the lists behind Bulk Salary Slip and Staff Payroll Report). */
reportRouter.get('/payruns', wrap(async (req, res) => {
  const q = z.object({ month: monthParam, year: yearParam }).parse(req.query);
  const rows = await prisma.payrun.findMany({ where: { businessId: adminBusinessId(req), month: q.month, year: q.year }, orderBy: { id: 'desc' } });
  ok(res, rows.map((r) => ({ id: r.id, month: r.month, year: r.year, created_at: r.createdAt.toISOString() })));
}));

export const _i = int;
