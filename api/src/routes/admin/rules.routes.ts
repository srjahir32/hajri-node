import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, wrap } from '../../lib/http';
import { adminBusinessId, can } from '../../middleware/auth';
import { badRequest } from '../../lib/errors';
import { int, optInt, optNum } from '../../lib/validation';

/**
 * Automation rules: overtime pay, break deductions, late-entry and early-exit deductions.
 *  rule_type 1 → per-minute (multiple of the hourly rate) or a fixed amount
 *  rule_type 2 → half day salary
 *  rule_type 3 → full day salary
 * `threshold_minutes` is the minimum overtime/break/late/early duration at which the rule applies.
 */
export const rulesRouter = Router();
rulesRouter.use(can('view_setting'));

type Kind = 'overtime' | 'break' | 'late-entry' | 'early-exit';

interface KindConfig {
  staffField: 'overtimeRule' | 'breakRule' | 'lateEntryRule' | 'earlyExitRule';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: () => any;
  hasOccurrences: boolean;
}

const KINDS: Record<Kind, KindConfig> = {
  overtime: { staffField: 'overtimeRule', table: () => prisma.overtimeRule, hasOccurrences: false },
  break: { staffField: 'breakRule', table: () => prisma.breakRule, hasOccurrences: false },
  'late-entry': { staffField: 'lateEntryRule', table: () => prisma.lateEntryRule, hasOccurrences: true },
  'early-exit': { staffField: 'earlyExitRule', table: () => prisma.earlyExitRule, hasOccurrences: true },
};

const kindParam = z.enum(['overtime', 'break', 'late-entry', 'early-exit']);

const ruleBody = z.object({
  rule_type: int.pipe(z.number().min(1).max(3)),
  threshold_minutes: int.pipe(z.number().min(0).max(24 * 60)),
  multiples: optNum,
  fixed_amount: optInt,
  occurrences: optInt,
  enabled: z.boolean().optional(),
});

interface RuleRow {
  id: number;
  ruleType: number;
  thresholdSeconds: number;
  multiples: number | null;
  fixedAmount: number | null;
  isEnabled: boolean;
  occurrences?: number;
}

const dto = (r: RuleRow) => ({
  id: r.id,
  rule_type: r.ruleType,
  threshold_minutes: Math.round(r.thresholdSeconds / 60),
  threshold: `${String(Math.floor(r.thresholdSeconds / 3600)).padStart(2, '0')}:${String(Math.floor((r.thresholdSeconds % 3600) / 60)).padStart(2, '0')}`,
  multiples: r.multiples,
  fixed_amount: r.fixedAmount,
  occurrences: r.occurrences ?? 0,
  enabled: r.isEnabled,
});

rulesRouter.get('/:kind', wrap(async (req, res) => {
  const kind = kindParam.parse(req.params.kind);
  const businessId = adminBusinessId(req);
  const cfg = KINDS[kind];
  const rules: RuleRow[] = await cfg.table().findMany({ where: { businessId }, orderBy: { thresholdSeconds: 'asc' } });
  const staffCount = await prisma.staff.count({ where: { businessId, deletedAt: null, [cfg.staffField]: true } });
  ok(res, { rules: rules.map(dto), staff_count: staffCount });
}));

rulesRouter.put('/:kind', wrap(async (req, res) => {
  const kind = kindParam.parse(req.params.kind);
  const businessId = adminBusinessId(req);
  const cfg = KINDS[kind];
  const { rules } = z.object({ rules: z.array(ruleBody).max(30) }).parse(req.body);

  for (const t of [2, 3]) if (rules.filter((r) => r.rule_type === t).length > 1) throw badRequest(`Only one ${t === 2 ? 'half-day' : 'full-day'} rule is allowed`);
  for (const r of rules) {
    if (r.rule_type === 1 && !r.fixed_amount && !r.multiples) throw badRequest('Choose a multiple or enter a fixed amount for each per-minute rule');
  }
  const seen = new Set<string>();
  for (const r of rules) {
    const key = `${r.rule_type}-${r.threshold_minutes}`;
    if (seen.has(key)) throw badRequest('Two rules cannot have the same type and duration');
    seen.add(key);
  }

  await prisma.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = (tx as any)[kind === 'overtime' ? 'overtimeRule' : kind === 'break' ? 'breakRule' : kind === 'late-entry' ? 'lateEntryRule' : 'earlyExitRule'];
    await table.deleteMany({ where: { businessId } });
    if (rules.length) {
      await table.createMany({
        data: rules.map((r) => ({
          businessId,
          ruleType: r.rule_type,
          thresholdSeconds: r.threshold_minutes * 60,
          multiples: r.rule_type === 1 && !r.fixed_amount ? r.multiples ?? null : null,
          fixedAmount: r.rule_type === 1 ? r.fixed_amount ?? null : null,
          isEnabled: r.enabled ?? true,
          ...(cfg.hasOccurrences ? { occurrences: r.occurrences ?? 0 } : {}),
        })),
      });
    }
  });
  const saved: RuleRow[] = await cfg.table().findMany({ where: { businessId }, orderBy: { thresholdSeconds: 'asc' } });
  ok(res, saved.map(dto), 'Rules saved successfully.');
}));

rulesRouter.delete('/:kind', wrap(async (req, res) => {
  const kind = kindParam.parse(req.params.kind);
  const businessId = adminBusinessId(req);
  const cfg = KINDS[kind];
  await cfg.table().deleteMany({ where: { businessId } });
  await prisma.staff.updateMany({ where: { businessId }, data: { [cfg.staffField]: false } });
  ok(res, null, 'Rules deleted');
}));

rulesRouter.get('/:kind/staff', wrap(async (req, res) => {
  const kind = kindParam.parse(req.params.kind);
  const businessId = adminBusinessId(req);
  const cfg = KINDS[kind];
  const staff = await prisma.staff.findMany({
    where: { businessId, deletedAt: null, isDeactivated: false },
    include: { photos: { take: 1 }, department: true },
    orderBy: { name: 'asc' },
  });
  ok(res, staff.map((s) => ({
    id: s.id,
    name: [s.name, s.lastName].filter(Boolean).join(' '),
    phone_number: s.phoneNumber,
    department: s.department?.name ?? null,
    photo: s.photos[0]?.url ?? null,
    assigned: s[cfg.staffField],
  })));
}));

rulesRouter.post('/:kind/apply', wrap(async (req, res) => {
  const kind = kindParam.parse(req.params.kind);
  const businessId = adminBusinessId(req);
  const cfg = KINDS[kind];
  const b = z.object({ selected_ids: z.array(int).default([]), unselected_ids: z.array(int).default([]) }).parse(req.body);
  await prisma.$transaction([
    prisma.staff.updateMany({ where: { id: { in: b.selected_ids }, businessId }, data: { [cfg.staffField]: true } }),
    prisma.staff.updateMany({ where: { id: { in: b.unselected_ids }, businessId }, data: { [cfg.staffField]: false } }),
  ]);
  ok(res, null, 'Rule applied to staff');
}));
