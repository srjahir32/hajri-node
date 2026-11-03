import { Router } from 'express';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, wrap } from '../../lib/http';
import { adminBusinessId, can } from '../../middleware/auth';
import { dateOnly } from '../../lib/time';
import { idList, int, monthParam, optInt, optStr, yearParam } from '../../lib/validation';
import * as payroll from '../../services/payroll.service';
import * as reports from '../../services/report.service';
import { monthRange } from '../../services/payroll.service';

export const payrollRouter = Router();
payrollRouter.use(can('view_payroll'));

const period = z.object({ month: monthParam, year: yearParam });

payrollRouter.get('/', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const q = period.extend({ department_id: optInt, search: optStr }).parse(req.query);
  const rows = await payroll.payrollOverview(businessId, q.year, q.month, { departmentId: q.department_id, search: q.search });
  const processed = rows.filter((r) => r.processed);
  ok(res, rows, 'success', {
    summary: {
      staff_count: rows.length,
      processed_count: processed.length,
      total_net_salary: Math.round(rows.reduce((s, r) => s + r.net_salary, 0) * 100) / 100,
      total_processed: Math.round(processed.reduce((s, r) => s + r.net_salary, 0) * 100) / 100,
    },
    period: monthRange(q.year, q.month),
  });
}));

payrollRouter.get('/staff/:id', wrap(async (req, res) => {
  const q = period.parse(req.query);
  const id = int.parse(req.params.id);
  const businessId = adminBusinessId(req);
  const staff = await prisma.staff.findFirst({ where: { id, businessId, deletedAt: null }, select: { id: true } });
  if (!staff) return ok(res, null, 'Staff not found');
  const [calc, saved] = await Promise.all([
    payroll.calculatePayroll(id, q.year, q.month),
    prisma.payroll.findUnique({ where: { staffId_month_year: { staffId: id, month: q.month, year: q.year } } }),
  ]);
  ok(res, { calculation: calc, processed: saved ? payroll.payrollDto(saved) : null });
}));

payrollRouter.post('/process', wrap(async (req, res) => {
  const b = period.extend({ staff_ids: z.array(int).optional() }).parse(req.body);
  const out = await payroll.processPayroll(adminBusinessId(req), b.year, b.month, b.staff_ids);
  ok(res, out, `Payroll processed for ${out.processed} staff`);
}));

payrollRouter.post('/reopen', wrap(async (req, res) => {
  const b = period.extend({ staff_id: int }).parse(req.body);
  await payroll.reopenPayroll(adminBusinessId(req), b.staff_id, b.year, b.month);
  ok(res, null, 'Payroll reopened. Process it again to recalculate.');
}));

payrollRouter.post('/review', wrap(async (req, res) => {
  const b = period.extend({ kind: z.enum(['attendance', 'total_pay']), staff_ids: idList, reviewed: z.boolean().default(true) }).parse(req.body);
  const n = await payroll.setReview(adminBusinessId(req), b.kind, b.staff_ids, b.year, b.month, b.reviewed);
  ok(res, { updated: n }, 'Review saved');
}));

/** Counts of things that still need approval before payroll is processed. */
payrollRouter.get('/approvals', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const q = period.parse(req.query);
  const { from, to } = monthRange(q.year, q.month);
  const [punches, leaves, overtimeRows] = await Promise.all([
    prisma.attendance.count({ where: { deletedAt: null, approval: 0, date: { gte: dateOnly(from), lte: dateOnly(to) }, staff: { businessId, deletedAt: null } } }),
    prisma.staffLeave.count({ where: { deletedAt: null, status: 0, startDate: { lte: dateOnly(to) }, endDate: { gte: dateOnly(from) }, staff: { businessId, deletedAt: null } } }),
    prisma.attendance.findMany({
      where: { deletedAt: null, approval: 1, date: { gte: dateOnly(from), lte: dateOnly(to) }, staff: { businessId, deletedAt: null, overtimeRule: true } },
      select: { staffId: true, date: true, totalSeconds: true, payableSeconds: true },
    }),
  ]);
  const perDay = new Map<string, { total: number; payable: number }>();
  for (const r of overtimeRows) {
    const k = `${r.staffId}|${r.date.toISOString()}`;
    const cur = perDay.get(k) ?? { total: 0, payable: r.payableSeconds };
    cur.total += r.totalSeconds;
    perDay.set(k, cur);
  }
  const overtimeDays = [...perDay.values()].filter((d) => d.payable && d.total > d.payable).length;
  ok(res, { pending_punches: punches, pending_leaves: leaves, overtime_days: overtimeDays, can_process: punches === 0 && leaves === 0 });
}));

payrollRouter.get('/export', wrap(async (req, res) => {
  const q = period.extend({ department_id: optInt }).parse(req.query);
  const buf = await reports.salaryReportXlsx(adminBusinessId(req), q.year, q.month, { departmentId: q.department_id });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="payroll-${q.year}-${String(q.month).padStart(2, '0')}.xlsx"`);
  res.send(buf);
}));

payrollRouter.get('/slips', wrap(async (req, res) => {
  const q = period.extend({ staff_ids: optStr }).parse(req.query);
  const ids = q.staff_ids?.split(',').map(Number).filter(Boolean);
  const buf = await reports.salarySlipsPdf(adminBusinessId(req), q.year, q.month, ids);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="salary-slips-${q.year}-${String(q.month).padStart(2, '0')}.pdf"`);
  res.send(buf);
}));

export const _x = ExcelJS;
