import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BusinessPf } from '@prisma/client';
import { matchRule, pfAmounts, roundUpQuarterHours, ruleAmount, type Rule } from './payroll.service';

const rule = (over: Partial<Rule> = {}): Rule => ({ ruleType: 1, thresholdSeconds: 0, multiples: 1, fixedAmount: null, ...over });

describe('roundUpQuarterHours', () => {
  it('returns 0 for no work', () => assert.equal(roundUpQuarterHours(0), 0));
  it('keeps whole hours', () => assert.equal(roundUpQuarterHours(8 * 3600), 8));
  it('rounds minutes up to the next quarter', () => {
    assert.equal(roundUpQuarterHours(5 * 3600 + 60), 5.25); // 5:01
    assert.equal(roundUpQuarterHours(5 * 3600 + 15 * 60), 5.25); // 5:15
    assert.equal(roundUpQuarterHours(5 * 3600 + 16 * 60), 5.5);
    assert.equal(roundUpQuarterHours(5 * 3600 + 31 * 60), 5.75);
    assert.equal(roundUpQuarterHours(5 * 3600 + 46 * 60), 6);
  });
});

describe('matchRule', () => {
  const rules = [rule({ thresholdSeconds: 600, multiples: 1 }), rule({ thresholdSeconds: 1800, multiples: 2 }), rule({ ruleType: 2, thresholdSeconds: 7200 })];
  it('returns undefined below the first threshold', () => assert.equal(matchRule(rules, 599), undefined));
  it('picks the highest threshold not above the value', () => {
    assert.equal(matchRule(rules, 600)?.multiples, 1);
    assert.equal(matchRule(rules, 1799)?.multiples, 1);
    assert.equal(matchRule(rules, 1800)?.multiples, 2);
    assert.equal(matchRule(rules, 99999)?.ruleType, 2);
  });
});

describe('ruleAmount', () => {
  const perHour = 120;
  const perDay = 1000;
  it('per-minute rule uses the hourly rate × multiple', () => {
    // 30 min at ₹120/h = ₹60, ×1.5 = ₹90
    assert.equal(Math.round(ruleAmount(rule({ multiples: 1.5 }), 30 * 60, perHour, perDay)), 90);
  });
  it('fixed amount wins over the multiple', () => assert.equal(ruleAmount(rule({ fixedAmount: 250, multiples: 3 }), 3600, perHour, perDay), 250));
  it('half-day and full-day rules use the daily rate', () => {
    assert.equal(ruleAmount(rule({ ruleType: 2 }), 0, perHour, perDay), 500);
    assert.equal(ruleAmount(rule({ ruleType: 3 }), 0, perHour, perDay), 1000);
  });
});

describe('pfAmounts', () => {
  const pf = (o: Partial<BusinessPf>) => ({ isEnabled: true, employeePercentage: 12, employerEpsPercentage: 8.33, employerEpfPercentage: 3.67, cappedAmount: null, ...o }) as unknown as BusinessPf;
  it('is zero when disabled or missing', () => {
    assert.deepEqual(pfAmounts(null, 20000), { pfCut: 0, eps: 0, epf: 0 });
    assert.deepEqual(pfAmounts(pf({ isEnabled: false }), 20000), { pfCut: 0, eps: 0, epf: 0 });
  });
  it('applies percentages', () => assert.deepEqual(pfAmounts(pf({}), 10000), { pfCut: 1200, eps: 833, epf: 367 }));
  it('caps each component', () => assert.deepEqual(pfAmounts(pf({ cappedAmount: 1800 }), 20000), { pfCut: 1800, eps: 1666, epf: 734 }));
});
