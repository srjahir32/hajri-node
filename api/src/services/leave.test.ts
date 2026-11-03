import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DateTime } from 'luxon';
import { costWithin, parsePeriod } from './leave.service';

const d = (iso: string) => DateTime.fromISO(iso, { zone: 'utc' });
const leave = (start: string, end: string, leaveType = 'Full Day') => ({ startDate: new Date(`${start}T00:00:00Z`), endDate: new Date(`${end}T00:00:00Z`), leaveType });

describe('parsePeriod', () => {
  it('parses "Jan 2026" and ISO months', () => {
    assert.equal(parsePeriod('Jan 2026')?.toISODate(), '2026-01-01');
    assert.equal(parsePeriod('2026-03')?.toISODate(), '2026-03-01');
    assert.equal(parsePeriod('March 2026')?.toISODate(), '2026-03-01');
  });
  it('returns null for junk', () => {
    assert.equal(parsePeriod(null), null);
    assert.equal(parsePeriod('whenever'), null);
  });
});

describe('costWithin', () => {
  it('counts every day of a full-day leave inside the window', () => assert.equal(costWithin(leave('2026-03-10', '2026-03-12'), d('2026-03-01'), d('2026-03-31')), 3));
  it('counts half days as 0.5', () => assert.equal(costWithin(leave('2026-03-10', '2026-03-11', 'Half Day'), d('2026-03-01'), d('2026-03-31')), 1));
  it('clips leaves that straddle the window', () => {
    assert.equal(costWithin(leave('2026-02-27', '2026-03-02'), d('2026-03-01'), d('2026-03-31')), 2);
    assert.equal(costWithin(leave('2026-03-30', '2026-04-03'), d('2026-03-01'), d('2026-03-31')), 2);
  });
  it('is 0 outside the window', () => assert.equal(costWithin(leave('2026-05-01', '2026-05-02'), d('2026-03-01'), d('2026-03-31')), 0));
});
