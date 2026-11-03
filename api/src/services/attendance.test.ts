import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Attendance, StaffLeave } from '@prisma/client';
import { summarizeDay } from './attendance.service';

const row = (over: Partial<Attendance>): Attendance =>
  ({
    id: 1,
    staffId: 1,
    date: new Date('2026-03-02T00:00:00Z'),
    inAt: null,
    outAt: null,
    status: 'Present',
    approval: 1,
    isManual: false,
    behavior: null,
    totalSeconds: 0,
    breakSeconds: 0,
    payableSeconds: 8 * 3600,
    note: null,
    latitude: null,
    longitude: null,
    accuracy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...over,
  }) as Attendance;

const at = (t: string) => new Date(`2026-03-02T${t}Z`);

describe('summarizeDay', () => {
  it('is "Not Marked" with no rows', () => assert.equal(summarizeDay('2026-03-02', [], 'UTC').status, 'Not Marked'));

  it('sums punch rows, breaks and overtime', () => {
    const rows = [
      row({ id: 1, inAt: at('04:00:00'), outAt: at('08:00:00'), totalSeconds: 4 * 3600, behavior: 'Regular' }),
      row({ id: 2, inAt: at('08:30:00'), outAt: at('14:30:00'), totalSeconds: 6 * 3600, breakSeconds: 1800 }),
    ];
    const s = summarizeDay('2026-03-02', rows, 'UTC');
    assert.equal(s.status, 'Present');
    assert.equal(s.total_seconds, 10 * 3600);
    assert.equal(s.break_seconds, 1800);
    assert.equal(s.overtime_seconds, 2 * 3600);
    assert.equal(s.first_in, '04:00:00');
    assert.equal(s.last_out, '14:30:00');
    assert.equal(s.behavior, 'Regular');
  });

  it('flags short days only for Present rows', () => {
    const s = summarizeDay('2026-03-02', [row({ inAt: at('04:00:00'), outAt: at('09:00:00'), totalSeconds: 5 * 3600 })], 'UTC');
    assert.equal(s.shortfall_seconds, 3 * 3600);
  });

  it('shows Pending while any punch awaits approval and excludes it from totals', () => {
    const s = summarizeDay('2026-03-02', [row({ approval: 0, totalSeconds: 3600 })], 'UTC');
    assert.equal(s.status, 'Pending');
    assert.equal(s.total_seconds, 0);
  });

  it('ignores rejected punches', () => {
    const s = summarizeDay('2026-03-02', [row({ approval: 2, totalSeconds: 3600 })], 'UTC');
    assert.equal(s.status, 'Not Marked');
  });

  it('prefers Present over Half Day and reports Absent when only absent is recorded', () => {
    assert.equal(summarizeDay('2026-03-02', [row({ status: 'Half Day' }), row({ id: 2, status: 'Present' })], 'UTC').status, 'Present');
    assert.equal(summarizeDay('2026-03-02', [row({ status: 'Half Day' })], 'UTC').status, 'Half Day');
    assert.equal(summarizeDay('2026-03-02', [row({ status: 'Absent' })], 'UTC').status, 'Absent');
  });

  it('falls back to leave, then holiday, when nothing was punched', () => {
    const leave = { leaveType: 'Full Day' } as StaffLeave;
    assert.equal(summarizeDay('2026-03-02', [], 'UTC', { leave }).status, 'Leave');
    assert.equal(summarizeDay('2026-03-02', [], 'UTC', { holiday: { isHoliday: true, type: 'weekly_holiday', name: 'x' } }).status, 'Holiday');
    assert.equal(summarizeDay('2026-03-02', [], 'UTC', { leave, holiday: { isHoliday: true, type: 'weekly_holiday', name: 'x' } }).status, 'Leave');
  });

  it('formats local times in the requested timezone', () => {
    const s = summarizeDay('2026-03-02', [row({ inAt: at('03:30:00'), outAt: at('12:30:00'), totalSeconds: 9 * 3600 })], 'Asia/Kolkata');
    assert.equal(s.first_in, '09:00:00');
    assert.equal(s.last_out, '18:00:00');
  });
});
