import { DateTime } from 'luxon';
import type { LeavePolicy, Prisma, StaffLeave } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, notFound } from '../lib/errors';
import { dateOnly, fmtDate } from '../lib/time';
import { businessOwnerId, notifyStaff, notifyUser } from './comms.service';
import { logStaff } from './attendance.service';

const MONTH_FMT = ['MMM yyyy', 'MMMM yyyy', 'yyyy-MM', 'yyyy-MM-dd'];

/** "Jan 2026" | "2026-01" | "2026-01-15" → first day of that month (UTC). */
export function parsePeriod(v?: string | null): DateTime | null {
  if (!v) return null;
  for (const f of MONTH_FMT) {
    const dt = DateTime.fromFormat(v.trim(), f, { zone: 'utc' });
    if (dt.isValid) return dt.startOf('month');
  }
  return null;
}

const costPerDay = (leaveType: string) => (leaveType === 'Full Day' ? 1 : 0.5);

/** Leave days (0.5 for half days) of `leave` falling inside [from, to]. */
export function costWithin(leave: Pick<StaffLeave, 'startDate' | 'endDate' | 'leaveType'>, from: DateTime, to: DateTime): number {
  const s = DateTime.fromJSDate(leave.startDate, { zone: 'utc' });
  const e = DateTime.fromJSDate(leave.endDate, { zone: 'utc' });
  const effStart = s > from ? s : from;
  const effEnd = e < to ? e : to;
  if (effStart > effEnd) return 0;
  return (Math.floor(effEnd.diff(effStart, 'days').days) + 1) * costPerDay(leave.leaveType);
}

async function approvedLeaves(staffId: number, policyId: number, from: DateTime, to: DateTime) {
  return prisma.staffLeave.findMany({
    where: {
      staffId,
      status: 1,
      isUnpaid: false,
      deletedAt: null,
      leavePolicyId: policyId,
      startDate: { lte: to.toJSDate() },
      endDate: { gte: from.toJSDate() },
    },
  });
}

export interface LeaveCheck {
  ok: boolean;
  available: number;
  failedMonth?: string;
}

/** Can `policy` cover a request of [start, end]? */
export async function checkPolicyBalance(
  staffId: number,
  policy: LeavePolicy,
  start: DateTime,
  end: DateTime,
  leaveType: string,
  ignoreLeaveId?: number,
): Promise<LeaveCheck> {
  const days = Math.floor(end.diff(start, 'days').days) + 1;
  const reqCost = days * costPerDay(leaveType);
  const rate = policy.numberOfLeaves;
  const exclude = (rows: StaffLeave[]) => rows.filter((r) => r.id !== ignoreLeaveId);

  if (policy.cycle === 'monthly') {
    const startPeriod = parsePeriod(policy.startPeriod) ?? start.startOf('year');
    if (policy.isCarryForward) {
      const reqMonth = start.startOf('month');
      const elapsed = startPeriod > start ? 1 : Math.floor(reqMonth.diff(startPeriod, 'months').months) + 1;
      const accrued = elapsed * rate;
      const taken = exclude(await approvedLeaves(staffId, policy.id, startPeriod, end)).reduce((s, l) => s + costWithin(l, startPeriod, end), 0);
      const balance = Math.max(0, accrued - taken);
      return { ok: balance >= reqCost, available: balance };
    }
    let cursor = start.startOf('month');
    const last = end.startOf('month');
    while (cursor <= last) {
      const mStart = cursor;
      const mEnd = cursor.endOf('month').startOf('day');
      const reqInMonth = costWithin({ startDate: start.toJSDate(), endDate: end.toJSDate(), leaveType }, mStart, mEnd);
      const taken = exclude(await approvedLeaves(staffId, policy.id, mStart, mEnd)).reduce((s, l) => s + costWithin(l, mStart, mEnd), 0);
      const mBalance = Math.max(0, rate - taken);
      if (reqInMonth > mBalance) return { ok: false, available: mBalance, failedMonth: cursor.toFormat('LLLL yyyy') };
      cursor = cursor.plus({ months: 1 });
    }
    return { ok: true, available: rate };
  }

  // yearly
  const from = start.startOf('year');
  const to = end.endOf('year').startOf('day');
  const taken = exclude(await approvedLeaves(staffId, policy.id, from, to)).reduce((s, l) => s + costWithin(l, from, to), 0);
  const balance = Math.max(0, rate - taken);
  return { ok: balance >= reqCost, available: balance };
}

export interface LeaveCard {
  policy_id: number;
  template_name: string;
  leave_policy_cycle: string;
  period_text: string;
  is_carry_forward: 0 | 1;
  carry_forward_label: string;
  monthly_rate: number;
  total_period_balance: number;
  accrued_to_date: number;
  total_used: number;
  remaining_balance: number;
  remaining_label: string;
  progress_percent: number;
}

/** Balance cards shown to staff for each leave policy assigned to them. */
export async function leaveCards(staffId: number, now = DateTime.utc().startOf('day')): Promise<LeaveCard[]> {
  const links = await prisma.staffLeavePolicy.findMany({ where: { staffId }, include: { policy: true } });
  const cards: LeaveCard[] = [];

  for (const { policy } of links) {
    if (policy.deletedAt) continue;
    const rate = policy.numberOfLeaves;
    let periodStart: DateTime | null = null;
    let periodEnd: DateTime | null = null;
    let total = rate;
    let grossAccrued = rate;
    let periodText = 'All Period';

    if (policy.cycle === 'monthly') {
      periodStart = parsePeriod(policy.startPeriod) ?? now.startOf('year');
      periodEnd = parsePeriod(policy.endPeriod)?.endOf('month') ?? now.endOf('year');
      const totalMonths = Math.floor(periodEnd.startOf('month').diff(periodStart, 'months').months) + 1;
      total = totalMonths * rate;
      const elapsed = periodStart > now ? 1 : Math.floor(now.startOf('month').diff(periodStart, 'months').months) + 1;
      grossAccrued = elapsed * rate;
      periodText = `${policy.startPeriod ?? `Jan ${now.year}`} - ${policy.endPeriod ?? `Dec ${now.year}`}`;
    } else if (policy.cycle === 'yearly') {
      periodStart = now.startOf('year');
      periodEnd = now.endOf('year');
      periodText = `Jan ${now.year} - Dec ${now.year}`;
    }

    const leaves = await prisma.staffLeave.findMany({
      where: {
        staffId,
        status: 1,
        isUnpaid: false,
        deletedAt: null,
        leavePolicyId: policy.id,
        ...(periodStart && periodEnd ? { startDate: { lte: periodEnd.toJSDate() }, endDate: { gte: periodStart.toJSDate() } } : {}),
      },
    });
    const from = periodStart ?? DateTime.fromMillis(0, { zone: 'utc' });
    const to = periodEnd ?? DateTime.utc(2999, 12, 31);
    const taken = leaves.reduce((s, l) => s + costWithin(l, from, to), 0);
    const mStart = now.startOf('month');
    const mEnd = now.endOf('month');
    const takenThisMonth = leaves.reduce((s, l) => s + costWithin(l, mStart, mEnd), 0);

    let accruedToDate: number;
    let remaining: number;
    if (policy.cycle === 'monthly') {
      if (policy.isCarryForward) {
        accruedToDate = Math.max(0, grossAccrued - taken);
        remaining = Math.max(0, total - taken);
      } else {
        accruedToDate = remaining = Math.max(0, rate - takenThisMonth);
      }
    } else {
      accruedToDate = remaining = Math.max(0, total - taken);
    }

    cards.push({
      policy_id: policy.id,
      template_name: policy.templateName,
      leave_policy_cycle: policy.cycle,
      period_text: periodText,
      is_carry_forward: policy.isCarryForward ? 1 : 0,
      carry_forward_label: policy.isCarryForward ? 'Carry Forward: ON' : 'Carry Forward: OFF',
      monthly_rate: rate,
      total_period_balance: total,
      accrued_to_date: accruedToDate,
      total_used: taken,
      remaining_balance: remaining,
      remaining_label: policy.cycle === 'monthly' && !policy.isCarryForward ? 'Available This Month' : 'Available Now',
      progress_percent: total > 0 ? Math.round(Math.min(100, Math.max(0, (taken / total) * 100)) * 100) / 100 : 0,
    });
  }
  return cards;
}

export interface ApplyLeaveInput {
  staffId: number;
  leaveType: 'Full Day' | 'Half Day';
  shiftType?: 'First Half' | 'Last Half' | null;
  isUnpaid: boolean;
  leavePolicyId?: number | null;
  reason: string;
  startDate: string;
  endDate: string;
}

export const leaveDto = (l: StaffLeave) => ({
  id: l.id,
  staff_id: l.staffId,
  leave_type: l.leaveType,
  shift_type: l.shiftType,
  is_unpaid: l.isUnpaid ? 1 : 0,
  is_paid: l.isUnpaid ? '1' : String(l.leavePolicyId ?? 0), // legacy mobile contract
  leave_policy_id: l.leavePolicyId,
  reason: l.reason,
  start_date: fmtDate(l.startDate),
  end_date: fmtDate(l.endDate),
  status: l.status,
  apply_status: ['Pending', 'Approve', 'Rejected'][l.status] ?? 'Pending',
  requested_date: l.createdAt.toISOString(),
});

export async function applyLeave(input: ApplyLeaveInput, opts: { autoApprove?: boolean; byUserId?: number } = {}) {
  const staff = await prisma.staff.findFirst({ where: { id: input.staffId, deletedAt: null } });
  if (!staff) throw notFound('Staff not found');
  const start = DateTime.fromISO(input.startDate, { zone: 'utc' });
  const end = DateTime.fromISO(input.endDate, { zone: 'utc' });
  if (!start.isValid || !end.isValid) throw badRequest('Invalid dates');
  if (end < start) throw badRequest('End date must be on or after the start date');
  if (input.leaveType === 'Half Day' && !input.shiftType) throw badRequest('Choose First Half or Last Half for a half-day leave');

  // overlap with an existing pending/approved leave
  const clash = await prisma.staffLeave.findFirst({
    where: {
      staffId: staff.id,
      deletedAt: null,
      status: { in: [0, 1] },
      startDate: { lte: end.toJSDate() },
      endDate: { gte: start.toJSDate() },
    },
    orderBy: { id: 'desc' },
  });
  if (clash) throw badRequest(clash.status === 0 ? 'Leave already pending' : 'Leave already approved');

  let policyId: number | null = null;
  if (!input.isUnpaid) {
    const links = await prisma.staffLeavePolicy.findMany({
      where: { staffId: staff.id, ...(input.leavePolicyId ? { leavePolicyId: input.leavePolicyId } : {}) },
      include: { policy: true },
    });
    if (!links.length) throw badRequest('No leave policy is assigned to you. Apply as unpaid leave or contact your admin.');
    let maxAvailable = 0;
    let failedMonth = '';
    for (const { policy } of links) {
      const res = await checkPolicyBalance(staff.id, policy, start, end, input.leaveType);
      if (res.ok) {
        policyId = policy.id;
        break;
      }
      maxAvailable = Math.max(maxAvailable, res.available);
      failedMonth ||= res.failedMonth ?? '';
    }
    if (!policyId) {
      throw badRequest(`Insufficient leave balance${failedMonth ? ` for ${failedMonth}` : ''}. Available balance: ${maxAvailable} day(s)`);
    }
  }

  const leave = await prisma.staffLeave.create({
    data: {
      staffId: staff.id,
      leaveType: input.leaveType,
      shiftType: input.leaveType === 'Half Day' ? input.shiftType ?? null : null,
      isUnpaid: input.isUnpaid,
      leavePolicyId: policyId,
      reason: input.reason,
      startDate: dateOnly(input.startDate),
      endDate: dateOnly(input.endDate),
      status: opts.autoApprove ? 1 : 0,
    },
  });

  if (opts.autoApprove) {
    await logStaff(staff.id, opts.byUserId ?? null, `Leave added for ${input.startDate} - ${input.endDate}`);
    await notifyStaff(staff.id, { message: `A leave has been added for ${input.startDate} - ${input.endDate}.`, action: 'leave_approved', actionId: leave.id });
  } else {
    const owner = await businessOwnerId(staff.businessId);
    await notifyUser(owner, {
      message: `${[staff.name, staff.lastName].filter(Boolean).join(' ')} has applied for leave (${input.startDate}${input.startDate !== input.endDate ? ` - ${input.endDate}` : ''}).`,
      action: 'staff_leave_request',
      actionId: leave.id,
    });
  }
  return leave;
}

export async function decideLeaves(businessId: number, ids: number[], approve: boolean, byUserId: number) {
  const leaves = await prisma.staffLeave.findMany({ where: { id: { in: ids }, deletedAt: null, staff: { businessId } } });
  if (!leaves.length) throw notFound('Leave requests not found');

  let done = 0;
  for (const l of leaves) {
    if (approve && !l.isUnpaid && l.leavePolicyId) {
      const policy = await prisma.leavePolicy.findUnique({ where: { id: l.leavePolicyId } });
      if (policy) {
        const res = await checkPolicyBalance(
          l.staffId,
          policy,
          DateTime.fromJSDate(l.startDate, { zone: 'utc' }),
          DateTime.fromJSDate(l.endDate, { zone: 'utc' }),
          l.leaveType,
          l.id,
        );
        if (!res.ok) throw badRequest(`Cannot approve: insufficient balance${res.failedMonth ? ` for ${res.failedMonth}` : ''} (available ${res.available} day(s))`);
      }
    }
    await prisma.staffLeave.update({ where: { id: l.id }, data: { status: approve ? 1 : 2 } });
    await logStaff(l.staffId, byUserId, `Leave ${fmtDate(l.startDate)} - ${fmtDate(l.endDate)} was ${approve ? 'approved' : 'rejected'}`);
    await notifyStaff(l.staffId, {
      message: `Your leave request (${fmtDate(l.startDate)}${l.startDate.getTime() !== l.endDate.getTime() ? ` - ${fmtDate(l.endDate)}` : ''}) was ${approve ? 'approved' : 'rejected'}.`,
      action: approve ? 'leave_approved' : 'leave_rejected',
      actionId: l.id,
    });
    done++;
  }
  return done;
}

export async function cancelLeave(businessId: number, id: number, byUserId: number) {
  const leave = await prisma.staffLeave.findFirst({ where: { id, deletedAt: null, staff: { businessId } } });
  if (!leave) throw notFound('Leave not found');
  await prisma.staffLeave.update({ where: { id }, data: { deletedAt: new Date() } });
  await logStaff(leave.staffId, byUserId, `Leave ${fmtDate(leave.startDate)} - ${fmtDate(leave.endDate)} was cancelled`);
}

export async function listLeaves(
  businessId: number,
  f: { status?: number; staffId?: number; from?: string; to?: string; search?: string },
  skip: number,
  take: number,
) {
  const where: Prisma.StaffLeaveWhereInput = {
    deletedAt: null,
    ...(f.status !== undefined ? { status: f.status } : {}),
    ...(f.from ? { endDate: { gte: dateOnly(f.from) } } : {}),
    ...(f.to ? { startDate: { lte: dateOnly(f.to) } } : {}),
    staff: { businessId, ...(f.staffId ? { id: f.staffId } : {}), ...(f.search ? { name: { contains: f.search } } : {}) },
  };
  const [total, rows] = await Promise.all([
    prisma.staffLeave.count({ where }),
    prisma.staffLeave.findMany({
      where,
      include: { staff: { include: { department: true, photos: { take: 1 } } } },
      orderBy: { id: 'desc' },
      skip,
      take,
    }),
  ]);
  return {
    total,
    data: rows.map((l) => ({
      ...leaveDto(l),
      staff: {
        id: l.staff.id,
        name: [l.staff.name, l.staff.lastName].filter(Boolean).join(' '),
        phone_number: l.staff.phoneNumber,
        department: l.staff.department?.name ?? null,
        photo: l.staff.photos[0]?.url ?? null,
      },
    })),
  };
}
