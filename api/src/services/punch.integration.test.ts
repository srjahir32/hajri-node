/**
 * Integration tests for the punch engine. They need the MySQL database from DATABASE_URL and create their
 * own throw-away business, removed again at the end. Skipped automatically when the database is unreachable.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Business, Prisma, Staff } from '@prisma/client';
import { DateTime } from 'luxon';
import { prisma } from '../lib/prisma';
import { dateOnly, localToUtc } from '../lib/time';
import { decideAttendance, monthCalendar, punch, setDayStatus, summarizeDay } from './attendance.service';
import { applyLeave, decideLeaves, leaveCards } from './leave.service';
import { calculatePayroll } from './payroll.service';

const TZ = 'Asia/Kolkata';
let available = true;
let business: Business;
let ownerId: number;
let shiftId: number;
let staff: Staff;
let remote: Staff;

const at = (date: string, time: string) => localToUtc(date, time, TZ);
const dayRows = (staffId: number, date: string) => prisma.attendance.findMany({ where: { staffId, date: dateOnly(date), deletedAt: null }, orderBy: { id: 'asc' } });

async function newStaff(over: Partial<Prisma.StaffUncheckedCreateInput> = {}): Promise<Staff> {
  const s = await prisma.staff.create({
    data: { businessId: business.id, name: 'Test', phoneNumber: String(Math.floor(1e9 + Math.random() * 8e9)), countryCode: '91', salaryAmount: 26000, timezone: TZ, ...over },
  });
  await prisma.workingShiftUser.create({ data: { staffId: s.id, workingShiftId: shiftId } });
  return s;
}

describe('punch engine', () => {
  before(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      available = false;
      return;
    }
    const owner = await prisma.user.create({ data: { phoneNumber: String(Math.floor(1e9 + Math.random() * 8e9)), countryCode: '91', name: 'Itest owner' } });
    ownerId = owner.id;
    business = await prisma.business.create({ data: { name: 'Itest Co', salaryDuration: 'monthly' } });
    await prisma.businessUser.create({ data: { businessId: business.id, userId: owner.id } });
    await prisma.systemSetting.create({ data: { businessId: business.id, timezone: TZ, staffAllowedRadius: 100 } });
    await prisma.attendanceSetting.create({ data: { businessId: business.id, punchInTimeTolerance: 30 } });
    const shift = await prisma.workingShift.create({ data: { businessId: business.id, shiftTypeId: 1, name: 'Day' } });
    shiftId = shift.id;
    await prisma.workingShiftDetail.create({ data: { workingShiftId: shift.id, shiftStartTime: '09:00:00', shiftEndTime: '18:00:00', breakSeconds: 3600, totalPayableSeconds: 8 * 3600 } });
    await prisma.weeklyHolidayBusiness.create({ data: { businessId: business.id, day: 0 } });
    staff = await newStaff();
    remote = await newStaff({ isRemote: true });
  });

  after(async () => {
    if (!available) return;
    await prisma.notification.deleteMany({ where: { userId: ownerId } });
    await prisma.business.delete({ where: { id: business.id } }); // cascades staff, shifts, attendance, …
    await prisma.user.delete({ where: { id: ownerId } });
    await prisma.$disconnect();
  });

  it('classifies the first punch-in as Early / Regular / Late using the tolerance', async (t) => {
    if (!available) return t.skip('database unavailable');
    const cases: [string, string, string][] = [['2026-03-02', '08:50:00', 'Early'], ['2026-03-03', '09:25:00', 'Regular'], ['2026-03-04', '09:45:00', 'Late']];
    for (const [date, time, expected] of cases) {
      const r = await punch(staff, { at: at(date, time) });
      assert.equal(r.attendance.behavior, expected, `${time} should be ${expected}`);
    }
  });

  it('blocks a punch-out within 30 seconds of the punch-in', async (t) => {
    if (!available) return t.skip('database unavailable');
    await punch(staff, { at: at('2026-03-05', '09:00:00') });
    await assert.rejects(() => punch(staff, { at: new Date(at('2026-03-05', '09:00:00').getTime() + 10_000) }), /Wait for 20s/);
  });

  it('tracks breaks across several punches and overtime beyond the shift', async (t) => {
    if (!available) return t.skip('database unavailable');
    const d = '2026-03-06';
    await punch(staff, { at: at(d, '09:00:00') });
    await punch(staff, { at: at(d, '13:00:00') }); // out
    await punch(staff, { at: at(d, '14:00:00') }); // in again → 1h break
    await punch(staff, { at: at(d, '19:00:00') }); // out
    const rows = await dayRows(staff.id, d);
    assert.equal(rows.length, 2);
    assert.equal(rows[1].breakSeconds, 3600);
    const s = summarizeDay(d, rows, TZ);
    assert.equal(s.total_seconds, 9 * 3600); // 4h + 5h
    assert.equal(s.break_seconds, 3600);
    assert.equal(s.overtime_seconds, 3600);
    assert.equal(s.first_in, '09:00:00');
    assert.equal(s.last_out, '19:00:00');
    assert.equal(rows[1].behavior, null, 'only the first punch of the day is classified');
  });

  it('puts remote staff punches in the approval queue until approved', async (t) => {
    if (!available) return t.skip('database unavailable');
    const d = '2026-03-09';
    const r = await punch(remote, { at: at(d, '09:00:00') });
    assert.equal(r.needs_approval, true);
    await punch(remote, { at: at(d, '18:00:00') });
    let s = summarizeDay(d, await dayRows(remote.id, d), TZ);
    assert.equal(s.status, 'Pending');
    assert.equal(s.total_seconds, 0, 'pending time is not counted');
    const rows = await dayRows(remote.id, d);
    await decideAttendance(business.id, rows.map((x) => x.id), true, ownerId);
    s = summarizeDay(d, await dayRows(remote.id, d), TZ);
    assert.equal(s.status, 'Present');
    assert.equal(s.total_seconds, 9 * 3600);
    assert.ok(await prisma.notification.findFirst({ where: { staffId: remote.id, action: 'attendance_approved' } }));
  });

  it('lets an admin mark a day and credits the shift hours', async (t) => {
    if (!available) return t.skip('database unavailable');
    await setDayStatus(business.id, staff.id, '2026-03-10', 'Present', ownerId);
    await setDayStatus(business.id, staff.id, '2026-03-11', 'Half Day', ownerId);
    const [p, h] = [summarizeDay('2026-03-10', await dayRows(staff.id, '2026-03-10'), TZ), summarizeDay('2026-03-11', await dayRows(staff.id, '2026-03-11'), TZ)];
    assert.equal(p.status, 'Present');
    assert.equal(p.total_seconds, 8 * 3600);
    assert.equal(h.status, 'Half Day');
    assert.equal(h.total_seconds, 4 * 3600);
  });

  it('refuses to punch on an approved full-day leave', async (t) => {
    if (!available) return t.skip('database unavailable');
    const l = await applyLeave({ staffId: staff.id, leaveType: 'Full Day', isUnpaid: true, reason: 'Sick', startDate: '2026-03-12', endDate: '2026-03-12' });
    await decideLeaves(business.id, [l.id], true, ownerId);
    await assert.rejects(() => punch(staff, { at: at('2026-03-12', '09:00:00') }), /on leave today/);
  });

  it('restricts punching during an approved half-day leave to the working half', async (t) => {
    if (!available) return t.skip('database unavailable');
    const l = await applyLeave({ staffId: staff.id, leaveType: 'Half Day', shiftType: 'First Half', isUnpaid: true, reason: 'Appointment', startDate: '2026-03-13', endDate: '2026-03-13' });
    await decideLeaves(business.id, [l.id], true, ownerId);
    await assert.rejects(() => punch(staff, { at: at('2026-03-13', '10:00:00') }), /First Half leave/); // before the 13:30 midpoint
    const ok = await punch(staff, { at: at('2026-03-13', '14:00:00') });
    assert.equal(ok.action, 'punch_in');
  });

  it('flags geo-fenced punches outside the allowed radius and notifies the owner', async (t) => {
    if (!available) return t.skip('database unavailable');
    const g = await newStaff({ isGeoFencing: true });
    await prisma.staffProfile.create({ data: { staffId: g.id, latitude: 21.17, longitude: 72.83 } });
    await punch(g, { at: at('2026-03-16', '09:00:00'), latitude: 21.17, longitude: 72.83 });
    assert.equal(await prisma.staffLog.count({ where: { staffId: g.id, detail: { contains: 'outside' } } }), 0);
    await punch(g, { at: at('2026-03-17', '09:00:00'), latitude: 21.2, longitude: 72.9 });
    assert.equal(await prisma.staffLog.count({ where: { staffId: g.id, detail: { contains: 'outside' } } }), 1);
    assert.ok(await prisma.notification.findFirst({ where: { userId: ownerId, action: 'staff_outside_punchin' } }));
  });

  it('computes a month calendar with weekly offs', async (t) => {
    if (!available) return t.skip('database unavailable');
    const cal = await monthCalendar(staff, 2026, 3);
    assert.equal(cal.days.length, 31);
    assert.equal(cal.days[0].status, 'Holiday'); // Sunday 1 March is the weekly off
    assert.equal(cal.days[5].date, '2026-03-06');
    assert.equal(cal.days[5].overtime_seconds, 3600);
    assert.ok(cal.count.present_count >= 5);
  });

  it('calculates payroll from approved attendance, leave and overtime rules', async (t) => {
    if (!available) return t.skip('database unavailable');
    const p = await newStaff({ overtimeRule: true, salaryAmount: 26000 });
    await prisma.overtimeRule.create({ data: { businessId: business.id, ruleType: 1, thresholdSeconds: 900, multiples: 2 } });
    // 26 working days in March 2026 (31 days − 5 Sundays) → ₹1000/day, ₹125/hour
    await punch(p, { at: at('2026-03-18', '09:00:00') });
    await punch(p, { at: at('2026-03-18', '19:00:00') }); // 10h → 2h overtime
    await setDayStatus(business.id, p.id, '2026-03-19', 'Present', ownerId); // 8h
    const calc = await calculatePayroll(p.id, 2026, 3);
    assert.equal(calc.working_days, 26);
    assert.equal(calc.per_day_salary, 1000);
    assert.equal(calc.per_hour_salary, 125);
    assert.equal(calc.present_days, 2);
    assert.equal(calc.worked_seconds, 18 * 3600);
    assert.equal(calc.overtime_seconds, 2 * 3600);
    assert.equal(calc.base_salary, 2000); // 16 regular hours × ₹125
    assert.equal(calc.overtime_salary, 500); // 120 min × (125/60) × 2
    assert.equal(calc.net_salary, 2500);
  });

  it('keeps leave balances consistent after approvals', async (t) => {
    if (!available) return t.skip('database unavailable');
    const s = await newStaff();
    const policy = await prisma.leavePolicy.create({ data: { businessId: business.id, templateName: 'CL', cycle: 'monthly', startPeriod: 'Jan 2026', endPeriod: 'Dec 2026', numberOfLeaves: 1, isCarryForward: false } });
    await prisma.staffLeavePolicy.create({ data: { staffId: s.id, leavePolicyId: policy.id } });
    const first = await applyLeave({ staffId: s.id, leaveType: 'Full Day', isUnpaid: false, leavePolicyId: policy.id, reason: 'x', startDate: '2026-03-20', endDate: '2026-03-20' });
    await decideLeaves(business.id, [first.id], true, ownerId);
    await assert.rejects(() => applyLeave({ staffId: s.id, leaveType: 'Half Day', shiftType: 'First Half', isUnpaid: false, leavePolicyId: policy.id, reason: 'y', startDate: '2026-03-23', endDate: '2026-03-23' }), /Insufficient leave balance for March 2026/);
    // a different month has its own allowance when carry-forward is off
    await applyLeave({ staffId: s.id, leaveType: 'Full Day', isUnpaid: false, leavePolicyId: policy.id, reason: 'z', startDate: '2026-04-06', endDate: '2026-04-06' });
    const cards = await leaveCards(s.id, DateTime.utc(2026, 3, 25) as DateTime<true>);
    assert.equal(cards[0].remaining_balance, 0);
    assert.equal(cards[0].total_used, 1);
  });
});
