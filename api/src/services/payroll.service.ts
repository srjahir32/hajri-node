import { DateTime } from 'luxon';
import type { Attendance, BusinessPf, Staff, StaffLeave } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, notFound } from '../lib/errors';
import { dateOnly, daysInMonth, dayOfWeek, fmtDate, hmsToSeconds, normalizeTz } from '../lib/time';
import { businessTz, policyHolidayDates, resolveShift, staffTz, weeklyHolidayDays } from './context.service';

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface PayrollBreakdown {
  staff_id: number;
  month: number;
  year: number;
  salary_amount: number;
  salary_mode: 'daily' | 'monthly';
  working_days: number;
  holiday_days: number;
  present_days: number;
  half_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  worked_seconds: number;
  regular_seconds: number;
  overtime_seconds: number;
  payable_seconds_per_day: number;
  per_hour_salary: number;
  per_day_salary: number;
  base_salary: number;
  paid_leave_salary: number;
  overtime_salary: number;
  break_deduction: number;
  late_deduction: number;
  early_deduction: number;
  late_occurrences: number;
  early_occurrences: number;
  pf_cut: number;
  eps_amount: number;
  epf_amount: number;
  gross_salary: number;
  total_deduction: number;
  net_salary: number;
}

export interface Rule {
  ruleType: number;
  thresholdSeconds: number;
  multiples: number | null;
  fixedAmount: number | null;
}

/** Pick the rule with the highest threshold not above `seconds` (rules sorted ascending). */
export function matchRule(rules: Rule[], seconds: number): Rule | undefined {
  let hit: Rule | undefined;
  for (const r of rules) if (seconds >= r.thresholdSeconds) hit = r;
  return hit;
}

/** Salary effect of a rule. `perMinuteSeconds` is the duration the per-minute formula applies to. */
export function ruleAmount(rule: Rule, perMinuteSeconds: number, perHour: number, perDay: number): number {
  if (rule.ruleType === 2) return perDay / 2;
  if (rule.ruleType === 3) return perDay;
  if (rule.fixedAmount) return rule.fixedAmount;
  return (perMinuteSeconds / 60) * (perHour / 60) * (rule.multiples ?? 1);
}

/** Round worked time up to the next quarter hour, as the Laravel app does (e.g. 5h10m → 5.5h). */
export function roundUpQuarterHours(seconds: number): number {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0 && mins === 0) return 0;
  if (mins === 0) return hours;
  if (mins <= 15) return hours + 0.25;
  if (mins <= 30) return hours + 0.5;
  if (mins <= 45) return hours + 0.75;
  return hours + 1;
}

export function pfAmounts(pf: BusinessPf | null, salary: number) {
  if (!pf?.isEnabled) return { pfCut: 0, eps: 0, epf: 0 };
  const calc = (pct: unknown) => {
    let amt = (salary * Number(pct)) / 100;
    if (pf.cappedAmount && amt > pf.cappedAmount) amt = pf.cappedAmount;
    return r2(amt);
  };
  return { pfCut: calc(pf.employeePercentage), eps: calc(pf.employerEpsPercentage), epf: calc(pf.employerEpfPercentage) };
}

interface MonthData {
  dates: string[];
  weeklyOff: Set<number>;
  holidays: Map<string, string>;
}

async function monthData(businessId: number, staffId: number, year: number, month: number): Promise<MonthData> {
  const dates = daysInMonth(year, month);
  const [weekly, holidays] = await Promise.all([
    weeklyHolidayDays(businessId, staffId),
    policyHolidayDates(businessId, staffId, dates[0], dates[dates.length - 1]),
  ]);
  return { dates, weeklyOff: new Set(weekly), holidays };
}

const isOff = (d: MonthData, date: string) => d.weeklyOff.has(dayOfWeek(date)) || d.holidays.has(date);

/** Days of an approved leave that fall inside the month on working days. */
function leaveWorkingDays(leave: StaffLeave, d: MonthData): number {
  const unit = leave.leaveType === 'Full Day' ? 1 : 0.5;
  const from = fmtDate(leave.startDate)!;
  const to = fmtDate(leave.endDate)!;
  return d.dates.filter((x) => x >= from && x <= to && !isOff(d, x)).length * unit;
}

/** Full salary calculation for one staff member and month. */
export async function calculatePayroll(staffId: number, year: number, month: number): Promise<PayrollBreakdown> {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, deletedAt: null },
    include: { business: { include: { pf: true } } },
  });
  if (!staff) throw notFound('Staff not found');
  const { business } = staff;
  const businessId = business.id;
  const mode: 'daily' | 'monthly' = business.salaryDuration === 'daily' ? 'daily' : 'monthly';
  const salary = Number(staff.salaryAmount ?? 0);
  const tz = await staffTz(staff);
  const md = await monthData(businessId, staffId, year, month);
  const first = md.dates[0];
  const last = md.dates[md.dates.length - 1];

  const shift = await resolveShift(staffId, first);
  const payablePerDay = shift.payableSeconds;
  const payableHours = payablePerDay / 3600;

  const workingDays = md.dates.filter((d) => !isOff(md, d)).length;
  const holidayDays = md.dates.length - workingDays;

  const [rows, leaves] = await Promise.all([
    prisma.attendance.findMany({
      where: { staffId, deletedAt: null, approval: 1, date: { gte: dateOnly(first), lte: dateOnly(last) } },
      orderBy: { id: 'asc' },
    }),
    prisma.staffLeave.findMany({
      where: { staffId, deletedAt: null, status: 1, startDate: { lte: dateOnly(last) }, endDate: { gte: dateOnly(first) } },
    }),
  ]);

  // group punches by day
  const byDay = new Map<string, Attendance[]>();
  for (const r of rows) {
    const k = fmtDate(r.date)!;
    byDay.set(k, [...(byDay.get(k) ?? []), r]);
  }

  let workedSeconds = 0;
  let overtimeSeconds = 0;
  let presentDays = 0;
  let halfDays = 0;
  const overtimeDays: number[] = [];
  const breakDays: number[] = [];
  const firstIn = new Map<string, Date>();
  const lastOut = new Map<string, Date>();

  for (const [day, list] of byDay) {
    const counted = list.filter((r) => r.status === 'Present' || r.status === 'Half Day');
    if (!counted.length) continue;
    const total = counted.reduce((s, r) => s + r.totalSeconds, 0);
    const payable = counted[0].payableSeconds || payablePerDay;
    workedSeconds += total;
    const ot = Math.max(0, total - payable);
    overtimeSeconds += ot;
    if (ot > 0) overtimeDays.push(ot);
    if (counted.some((r) => r.status === 'Present')) presentDays += 1;
    else halfDays += 1;
    const brk = counted.reduce((s, r) => s + r.breakSeconds, 0);
    if (brk > 0) breakDays.push(brk);
    const ins = counted.map((r) => r.inAt).filter(Boolean) as Date[];
    const outs = counted.map((r) => r.outAt).filter(Boolean) as Date[];
    if (ins.length) firstIn.set(day, ins.reduce((a, b) => (a < b ? a : b)));
    if (outs.length) lastOut.set(day, outs.reduce((a, b) => (a > b ? a : b)));
  }

  // leaves
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  for (const l of leaves) {
    const d = leaveWorkingDays(l, md);
    if (l.isUnpaid) unpaidLeaveDays += d;
    else paidLeaveDays += d;
  }

  const regularSeconds = Math.max(0, workedSeconds - overtimeSeconds);
  const perDay = workingDays > 0 ? r2(salary / workingDays) : 0;
  const totalPayableHours = workingDays * payableHours;
  const perHour = totalPayableHours > 0 ? r2(salary / totalPayableHours) : 0;

  let base: number;
  let paidLeaveSalary: number;
  if (mode === 'daily') {
    const effectiveDays = presentDays + halfDays * 0.5;
    base = workingDays > 0 && effectiveDays >= workingDays ? salary : effectiveDays * perDay;
    paidLeaveSalary = paidLeaveDays * perDay;
  } else {
    base = roundUpQuarterHours(regularSeconds) * perHour;
    paidLeaveSalary = paidLeaveDays * payableHours * perHour;
  }
  base = r2(base);
  paidLeaveSalary = r2(paidLeaveSalary);

  const [otRules, brRules, lateRules, earlyRules] = await Promise.all([
    staff.overtimeRule ? prisma.overtimeRule.findMany({ where: { businessId, isEnabled: true }, orderBy: { thresholdSeconds: 'asc' } }) : [],
    staff.breakRule ? prisma.breakRule.findMany({ where: { businessId, isEnabled: true }, orderBy: { thresholdSeconds: 'asc' } }) : [],
    staff.lateEntryRule ? prisma.lateEntryRule.findMany({ where: { businessId, isEnabled: true }, orderBy: { thresholdSeconds: 'asc' } }) : [],
    staff.earlyExitRule ? prisma.earlyExitRule.findMany({ where: { businessId, isEnabled: true }, orderBy: { thresholdSeconds: 'asc' } }) : [],
  ]);

  // overtime pay
  let overtimeSalary = 0;
  for (const ot of overtimeDays) {
    const rule = matchRule(otRules, ot);
    if (rule) overtimeSalary += ruleAmount(rule, ot, perHour, perDay);
  }

  // break deduction
  let breakDeduction = 0;
  for (const b of breakDays) {
    const rule = matchRule(brRules, b);
    if (rule) breakDeduction += ruleAmount(rule, Math.max(0, b - shift.breakSeconds), perHour, perDay);
  }

  // late entry / early exit — skipped on days covered by an approved leave
  const onLeave = (date: string) => leaves.some((l) => fmtDate(l.startDate)! <= date && fmtDate(l.endDate)! >= date);
  let lateDeduction = 0;
  let lateCount = 0;
  let earlyDeduction = 0;
  let earlyCount = 0;

  if (lateRules.length || earlyRules.length) {
    for (const date of md.dates) {
      if (onLeave(date)) continue;
      const dayShift = await resolveShift(staffId, date);
      if (dayShift.typeId === 3) continue; // flexible shifts have no fixed start/end
      if (lateRules.length && dayShift.startTime && firstIn.has(date)) {
        const local = DateTime.fromJSDate(firstIn.get(date)!).setZone(tz);
        const actual = local.hour * 3600 + local.minute * 60 + local.second;
        const late = actual - hmsToSeconds(dayShift.startTime);
        if (late > 0) {
          const rule = matchRule(lateRules, late);
          if (rule) {
            lateDeduction += ruleAmount(rule, late, perHour, perDay);
            lateCount++;
          }
        }
      }
      if (earlyRules.length && dayShift.endTime && lastOut.has(date)) {
        const local = DateTime.fromJSDate(lastOut.get(date)!).setZone(tz);
        const actual = local.hour * 3600 + local.minute * 60 + local.second;
        const early = hmsToSeconds(dayShift.endTime) - actual;
        if (early > 0) {
          const rule = matchRule(earlyRules, early);
          if (rule) {
            earlyDeduction += ruleAmount(rule, early, perHour, perDay);
            earlyCount++;
          }
        }
      }
    }
  }

  overtimeSalary = r2(overtimeSalary);
  breakDeduction = r2(breakDeduction);
  lateDeduction = r2(lateDeduction);
  earlyDeduction = r2(earlyDeduction);

  const pf = pfAmounts(business.pf, salary);
  const gross = r2(base + paidLeaveSalary + overtimeSalary);
  const totalDeduction = r2(breakDeduction + lateDeduction + earlyDeduction + pf.pfCut);
  const net = r2(Math.max(0, gross - totalDeduction));

  return {
    staff_id: staffId,
    month,
    year,
    salary_amount: salary,
    salary_mode: mode,
    working_days: workingDays,
    holiday_days: holidayDays,
    present_days: presentDays,
    half_days: halfDays,
    paid_leave_days: paidLeaveDays,
    unpaid_leave_days: unpaidLeaveDays,
    worked_seconds: workedSeconds,
    regular_seconds: regularSeconds,
    overtime_seconds: overtimeSeconds,
    payable_seconds_per_day: payablePerDay,
    per_hour_salary: perHour,
    per_day_salary: perDay,
    base_salary: base,
    paid_leave_salary: paidLeaveSalary,
    overtime_salary: overtimeSalary,
    break_deduction: breakDeduction,
    late_deduction: lateDeduction,
    early_deduction: earlyDeduction,
    late_occurrences: lateCount,
    early_occurrences: earlyCount,
    pf_cut: pf.pfCut,
    eps_amount: pf.eps,
    epf_amount: pf.epf,
    gross_salary: gross,
    total_deduction: totalDeduction,
    net_salary: net,
  };
}

// ───────────────────────────── Payroll runs ─────────────────────────────

export function payrollDto(p: {
  id: number;
  staffId: number;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  workedSeconds: number;
  overtimeSeconds: number;
  baseSalary: unknown;
  overtimeSalary: unknown;
  deduction: unknown;
  breakDeduction: unknown;
  lateDeduction: unknown;
  earlyDeduction: unknown;
  pfCut: unknown;
  epsAmount: unknown;
  epfAmount: unknown;
  netSalary: unknown;
  createdAt: Date;
}) {
  const n = (v: unknown) => Number(v ?? 0);
  return {
    id: p.id,
    staff_id: p.staffId,
    month: p.month,
    year: p.year,
    working_days: p.workingDays,
    present_days: p.presentDays,
    paid_leave_days: p.paidLeaveDays,
    worked_seconds: p.workedSeconds,
    overtime_seconds: p.overtimeSeconds,
    base_salary: n(p.baseSalary),
    overtime_salary: n(p.overtimeSalary),
    deduction: n(p.deduction),
    break_deduction: n(p.breakDeduction),
    late_deduction: n(p.lateDeduction),
    early_deduction: n(p.earlyDeduction),
    pf_cut: n(p.pfCut),
    eps_amount: n(p.epsAmount),
    epf_amount: n(p.epfAmount),
    net_salary: n(p.netSalary),
    processed_at: p.createdAt.toISOString(),
  };
}

/** Calculate and persist payroll for the given staff (or everyone not processed yet) for a month. */
export async function processPayroll(businessId: number, year: number, month: number, staffIds?: number[]) {
  const now = DateTime.now().setZone(await businessTz(businessId));
  if (DateTime.utc(year, month, 1) > now.endOf('month')) throw badRequest('You cannot process payroll for a future month');

  const payrun = await prisma.payrun.upsert({
    where: { businessId_month_year: { businessId, month, year } },
    create: { businessId, month, year },
    update: {},
  });

  const existing = await prisma.payroll.findMany({ where: { businessId, month, year }, select: { staffId: true } });
  const done = new Set(existing.map((e) => e.staffId));
  const staff = await prisma.staff.findMany({
    where: {
      businessId,
      deletedAt: null,
      isDeactivated: false,
      ...(staffIds?.length ? { id: { in: staffIds } } : {}),
    },
    select: { id: true },
  });
  const todo = staff.filter((s) => !done.has(s.id));
  const created = [];
  for (const s of todo) {
    const b = await calculatePayroll(s.id, year, month);
    created.push(
      await prisma.payroll.create({
        data: {
          businessId,
          staffId: s.id,
          payrunId: payrun.id,
          month,
          year,
          workingDays: b.working_days,
          presentDays: b.present_days + b.half_days * 0.5,
          paidLeaveDays: b.paid_leave_days,
          workedSeconds: b.worked_seconds,
          overtimeSeconds: b.overtime_seconds,
          baseSalary: b.base_salary + b.paid_leave_salary,
          overtimeSalary: b.overtime_salary,
          deduction: b.total_deduction,
          breakDeduction: b.break_deduction,
          lateDeduction: b.late_deduction,
          earlyDeduction: b.early_deduction,
          pfCut: b.pf_cut,
          epsAmount: b.eps_amount,
          epfAmount: b.epf_amount,
          netSalary: b.net_salary,
        },
      }),
    );
  }
  return { processed: created.length, skipped: staff.length - todo.length, payrun_id: payrun.id };
}

/** Undo a processed payroll so it can be recalculated. */
export async function reopenPayroll(businessId: number, staffId: number, year: number, month: number) {
  const res = await prisma.payroll.deleteMany({ where: { businessId, staffId, month, year } });
  if (!res.count) throw notFound('No processed payroll found');
}

/** Staff list for the payroll screens with live (unsaved) or processed figures. */
export async function payrollOverview(businessId: number, year: number, month: number, opts: { departmentId?: number; search?: string }) {
  const staff = await prisma.staff.findMany({
    where: {
      businessId,
      deletedAt: null,
      isDeactivated: false,
      ...(opts.departmentId ? { departmentId: opts.departmentId } : {}),
      ...(opts.search ? { name: { contains: opts.search } } : {}),
    },
    include: { department: true, photos: { take: 1 }, business: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
  const [processed, attReviews, payReviews] = await Promise.all([
    prisma.payroll.findMany({ where: { businessId, month, year } }),
    prisma.payrollAttendanceReview.findMany({ where: { month, year, staff: { businessId } } }),
    prisma.payrollTotalPayReview.findMany({ where: { month, year, staff: { businessId } } }),
  ]);
  const rows = [];
  for (const s of staff) {
    const p = processed.find((x) => x.staffId === s.id);
    const calc = p ? null : await calculatePayroll(s.id, year, month);
    rows.push({
      id: s.id,
      staff_code: `${s.business.name.slice(0, 3).toUpperCase()}${s.id}`,
      name: [s.name, s.middleName, s.lastName].filter(Boolean).join(' '),
      phone_number: s.phoneNumber,
      department_id: s.departmentId,
      department: s.department?.name ?? null,
      photo: s.photos[0]?.url ?? null,
      salary_amount: Number(s.salaryAmount ?? 0),
      processed: !!p,
      attendance_reviewed: !!attReviews.find((r) => r.staffId === s.id)?.reviewed,
      total_pay_reviewed: !!payReviews.find((r) => r.staffId === s.id)?.reviewed,
      payroll: p ? payrollDto(p) : null,
      // processed rows keep the stored figures (presentDays already includes half days), so the UI can always read `preview`
      preview: calc ?? {
        staff_id: s.id,
        month,
        year,
        salary_amount: Number(s.salaryAmount ?? 0),
        working_days: p!.workingDays,
        present_days: p!.presentDays,
        half_days: 0,
        paid_leave_days: p!.paidLeaveDays,
        worked_seconds: p!.workedSeconds,
        overtime_seconds: p!.overtimeSeconds,
        base_salary: Number(p!.baseSalary),
        paid_leave_salary: 0,
        overtime_salary: Number(p!.overtimeSalary),
        break_deduction: Number(p!.breakDeduction),
        late_deduction: Number(p!.lateDeduction),
        early_deduction: Number(p!.earlyDeduction),
        pf_cut: Number(p!.pfCut),
        eps_amount: Number(p!.epsAmount),
        epf_amount: Number(p!.epfAmount),
        net_salary: Number(p!.netSalary),
      },
      net_salary: p ? Number(p.netSalary) : calc!.net_salary,
      worked_seconds: p ? p.workedSeconds : calc!.worked_seconds,
      overtime_seconds: p ? p.overtimeSeconds : calc!.overtime_seconds,
    });
  }
  return rows;
}

export async function setReview(businessId: number, kind: 'attendance' | 'total_pay', staffIds: number[], year: number, month: number, reviewed: boolean) {
  const valid = await prisma.staff.findMany({ where: { id: { in: staffIds }, businessId }, select: { id: true } });
  for (const { id } of valid) {
    const where = { staffId_month_year: { staffId: id, month, year } };
    if (kind === 'attendance') {
      await prisma.payrollAttendanceReview.upsert({ where, create: { staffId: id, month, year, reviewed }, update: { reviewed } });
    } else {
      await prisma.payrollTotalPayReview.upsert({ where, create: { staffId: id, month, year, reviewed }, update: { reviewed } });
    }
  }
  return valid.length;
}

export function monthRange(year: number, month: number) {
  const dates = daysInMonth(year, month);
  return { from: dates[0], to: dates[dates.length - 1], label: DateTime.utc(year, month, 1).toFormat('LLLL yyyy') };
}

export const asStaffName = (s: Pick<Staff, 'name' | 'middleName' | 'lastName'>) => [s.name, s.middleName, s.lastName].filter(Boolean).join(' ');
export const tzOrDefault = normalizeTz;
