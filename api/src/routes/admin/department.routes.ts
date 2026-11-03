import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, wrap } from '../../lib/http';
import { adminBusinessId, can } from '../../middleware/auth';
import { conflict, notFound } from '../../lib/errors';
import { idParams, int } from '../../lib/validation';
import { dateOnly } from '../../lib/time';

export const departmentRouter = Router();
departmentRouter.use(can('view_setting', 'view_staff_management'));

const body = z.object({ name: z.string().trim().min(1, 'Department name is required').max(120) });

async function nameTaken(businessId: number, name: string, exceptId?: number) {
  return prisma.department.findFirst({
    where: { name, deletedAt: null, OR: [{ businessId }, { businessId: null }], ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
}

departmentRouter.get('/', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const rows = await prisma.department.findMany({
    where: { deletedAt: null, OR: [{ businessId }, { businessId: null }] },
    include: { _count: { select: { staff: { where: { businessId, deletedAt: null, isDeactivated: false } } } } },
    orderBy: { name: 'asc' },
  });
  ok(res, rows.map((d) => ({ id: d.id, name: d.name, is_shared: d.businessId === null, staff_count: d._count.staff })));
}));

departmentRouter.post('/', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { name } = body.parse(req.body);
  if (await nameTaken(businessId, name)) throw conflict('Department name already exists.');
  const d = await prisma.department.create({ data: { businessId, name } });
  ok(res, { id: d.id, name: d.name }, 'Insert successfully');
}));

departmentRouter.put('/:id', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  const { name } = body.parse(req.body);
  const dep = await prisma.department.findFirst({ where: { id, businessId, deletedAt: null } });
  if (!dep) throw notFound('Department not found');
  if (await nameTaken(businessId, name, id)) throw conflict('Department name already exists.');
  await prisma.department.update({ where: { id }, data: { name } });
  ok(res, null, 'Update successfully');
}));

departmentRouter.delete('/:id', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  const dep = await prisma.department.findFirst({ where: { id, businessId, deletedAt: null } });
  if (!dep) throw notFound('Department not found');
  await prisma.$transaction([
    prisma.staff.updateMany({ where: { departmentId: id, businessId }, data: { departmentId: null } }),
    prisma.department.update({ where: { id }, data: { deletedAt: new Date() } }),
  ]);
  ok(res, null, 'Delete successfully');
}));

/** Staff of the business with a flag showing who currently belongs to this department. */
departmentRouter.get('/:id/staff', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  const staff = await prisma.staff.findMany({
    where: { businessId, deletedAt: null, isDeactivated: false },
    include: { department: true, photos: { take: 1 } },
    orderBy: { name: 'asc' },
  });
  ok(res, staff.map((s) => ({
    id: s.id,
    name: [s.name, s.lastName].filter(Boolean).join(' '),
    phone_number: s.phoneNumber,
    photo: s.photos[0]?.url ?? null,
    current_department: s.department?.name ?? null,
    assigned: s.departmentId === id,
  })));
}));

departmentRouter.post('/:id/assign', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  const b = z.object({ selected_ids: z.array(int).default([]), unselected_ids: z.array(int).default([]) }).parse(req.body);
  const dep = await prisma.department.findFirst({ where: { id, deletedAt: null, OR: [{ businessId }, { businessId: null }] } });
  if (!dep) throw notFound('Department not found');
  const today = dateOnly(new Date());
  const toAssign = await prisma.staff.findMany({ where: { id: { in: b.selected_ids }, businessId, departmentId: { not: id } }, select: { id: true } });
  await prisma.$transaction(async (tx) => {
    for (const s of toAssign) {
      await tx.departmentHistory.updateMany({ where: { staffId: s.id, endDate: null }, data: { endDate: today } });
      await tx.departmentHistory.create({ data: { staffId: s.id, departmentId: id, startDate: today } });
    }
    await tx.staff.updateMany({ where: { id: { in: toAssign.map((s) => s.id) } }, data: { departmentId: id } });
    if (b.unselected_ids.length) {
      await tx.departmentHistory.updateMany({ where: { staffId: { in: b.unselected_ids }, departmentId: id, endDate: null }, data: { endDate: today } });
      await tx.staff.updateMany({ where: { id: { in: b.unselected_ids }, businessId, departmentId: id }, data: { departmentId: null } });
    }
  });
  ok(res, null, 'Department applied successfully');
}));
