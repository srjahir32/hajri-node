import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { daysInMonth, dayOfWeek, hmsToSeconds, localToUtc, normalizeTz, secondsToHms, eachDate } from './time';
import { distanceMeters } from './geo';

describe('time helpers', () => {
  it('normalises legacy timezone aliases', () => {
    assert.equal(normalizeTz('Asia/Calcutta'), 'Asia/Kolkata');
    assert.equal(normalizeTz('Not/AZone'), 'UTC');
    assert.equal(normalizeTz(null), 'UTC');
  });
  it('converts between HH:mm:ss and seconds', () => {
    assert.equal(hmsToSeconds('09:30:15'), 9 * 3600 + 30 * 60 + 15);
    assert.equal(hmsToSeconds('9:30'), 9 * 3600 + 1800);
    assert.equal(secondsToHms(3661), '01:01:01');
  });
  it('builds UTC instants from local wall-clock time', () => {
    assert.equal(localToUtc('2026-03-02', '09:00:00', 'Asia/Kolkata').toISOString(), '2026-03-02T03:30:00.000Z');
    // a local time just after midnight maps to the previous UTC day
    assert.equal(localToUtc('2026-03-02', '00:30:00', 'Asia/Kolkata').toISOString(), '2026-03-01T19:00:00.000Z');
  });
  it('enumerates dates', () => {
    assert.equal(daysInMonth(2026, 2).length, 28);
    assert.equal(daysInMonth(2028, 2).length, 29);
    assert.deepEqual(eachDate('2026-03-30', '2026-04-01'), ['2026-03-30', '2026-03-31', '2026-04-01']);
  });
  it('numbers weekdays from Sunday = 0', () => {
    assert.equal(dayOfWeek('2026-03-01'), 0); // Sunday
    assert.equal(dayOfWeek('2026-03-02'), 1);
    assert.equal(dayOfWeek('2026-03-07'), 6);
  });
});

describe('distanceMeters', () => {
  it('is 0 for the same point', () => assert.equal(Math.round(distanceMeters(21.17, 72.83, 21.17, 72.83)), 0));
  it('is about 111 km per degree of latitude', () => {
    const d = distanceMeters(21, 72, 22, 72);
    assert.ok(d > 110_000 && d < 112_500, String(d));
  });
});
