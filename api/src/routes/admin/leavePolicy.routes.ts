import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, wrap } from '../../lib/http';
import { adminBusinessId, can } from '../../middleware/auth';
import { notFound } from '../../lib/errors';
import { idParams, int, num, optBool, optStr } from '../../lib/validation';

export const leavePolicyRouter = Router();
leavePolicyRouter.use(can('view_setting', 'view_leave_management'));

const body = z.object({
  template_name: z.string().trim().min(1, 'Template name is required'),
  cycle: z.enum(['monthly', 'yearly']),
  start_period: optStr,
  end_period: optStr,
  accrual_type: optStr,
  number_of_leaves: num.pipe(z.number().min(0.5, 'Enter at least half a leave')),
  is_carry_forward: optBool,
});

const dto = (p: { id: number; templateName: string; cycle: string; startPeriod: string | null; endPeriod: string | null; accrualType: string; numberOfLeaves: number; isCarryForward: boolean; _count?: { staff: number } }) => ({
  id: p.id,
  template_name: p.templateName,
  cycle: p.cycle,
  start_period: p.startPeriod,
  end_period: p.endPeriod,
  accrual_type: p.accrualType,
  number_of_leaves: p.numberOfLeaves,
  is_carry_forward: p.isCarryForward ? 1 : 0,
  staff_count: p._count?.staff ?? 0,
});

leavePolicyRouter.get('/', wrap(async (req, res) => {
  const rows = await prisma.leavePolicy.findMany({
    where: { businessId: adminBusinessId(req), deletedAt: null },
    include: { _count: { select: { staff: true } } },
    orderBy: { id: 'desc' },
  });
  ok(res, rows.map(dto));
}));

leavePolicyRouter.post('/', wrap(async (req, res) => {
  const b = body.parse(req.body);
  const p = await prisma.leavePolicy.create({
    data: {
      businessId: adminBusinessId(req),
      templateName: b.template_name,
      cycle: b.cycle,
      startPeriod: b.start_period ?? null,
      endPeriod: b.end_period ?? null,
      accrualType: b.accrual_type ?? 'fixed',
      numberOfLeaves: b.number_of_leaves,
      isCarryForward: b.cycle === 'monthly' ? b.is_carry_forward ?? false : false,
    },
  });
  ok(res, dto(p), 'Leave template added');
}));

leavePolicyRouter.put('/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const b = body.parse(req.body);
  const r = await prisma.leavePolicy.updateMany({
    where: { id, businessId: adminBusinessId(req), deletedAt: null },
    data: {
      templateName: b.template_name,
      cycle: b.cycle,
      startPeriod: b.start_period ?? null,
      endPeriod: b.end_period ?? null,
      accrualType: b.accrual_type ?? 'fixed',
      numberOfLeaves: b.number_of_leaves,
      isCarryForward: b.cycle === 'monthly' ? b.is_carry_forward ?? false : false,
    },
  });
  if (!r.count) throw notFound('Template not found');
  ok(res, null, 'Leave template updated');
}));

leavePolicyRouter.delete('/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const r = await prisma.leavePolicy.updateMany({ where: { id, businessId: adminBusinessId(req), deletedAt: null }, data: { deletedAt: new Date() } });
  if (!r.count) throw notFound('Template not found');
  await prisma.staffLeavePolicy.deleteMany({ where: { leavePolicyId: id } });
  ok(res, null, 'Template deleted');
}));

leavePolicyRouter.get('/:id/staff', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  const staff = await prisma.staff.findMany({
    where: { businessId, deletedAt: null, isDeactivated: false },
    include: { photos: { take: 1 }, department: true, leavePolicies: { where: { leavePolicyId: id } } },
    orderBy: { name: 'asc' },
  });
  ok(res, staff.map((s) => ({ id: s.id, name: [s.name, s.lastName].filter(Boolean).join(' '), phone_number: s.phoneNumber, department: s.department?.name ?? null, photo: s.photos[0]?.url ?? null, assigned: s.leavePolicies.length > 0 })));
}));

leavePolicyRouter.post('/:id/assign', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  const b = z.object({ selected_ids: z.array(int).default([]), unselected_ids: z.array(int).default([]) }).parse(req.body);
  if (!(await prisma.leavePolicy.findFirst({ where: { id, businessId, deletedAt: null } }))) throw notFound('Template not found');
  const valid = await prisma.staff.findMany({ where: { id: { in: b.selected_ids }, businessId }, select: { id: true } });
  await prisma.$transaction([
    prisma.staffLeavePolicy.deleteMany({ where: { leavePolicyId: id, staffId: { in: b.unselected_ids } } }),
    prisma.staffLeavePolicy.createMany({ data: valid.map((s) => ({ leavePolicyId: id, staffId: s.id })), skipDuplicates: true }),
  ]);
  ok(res, null, 'Leave template applied');
}));
