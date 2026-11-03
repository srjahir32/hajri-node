import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, wrap } from '../../lib/http';
import { adminBusinessId, can } from '../../middleware/auth';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { PERMISSIONS, PERMISSION_GROUPS } from '../../lib/permissions';
import { idParams } from '../../lib/validation';

export const roleRouter = Router();

const body = z.object({
  name: z.string().trim().min(1, 'Role name is required').max(60),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
});

const dto = (r: { id: number; name: string; permissions: unknown; _count?: { users: number } }) => ({
  id: r.id,
  name: r.name,
  permissions: (r.permissions as string[]) ?? [],
  user_count: r._count?.users ?? 0,
});

roleRouter.get('/permissions', can('view_roles', 'add_role', 'edit_role', 'add_admin_user', 'edit_admin_user'), (_req, res) => {
  ok(res, { permissions: PERMISSIONS, groups: PERMISSION_GROUPS });
});

roleRouter.get('/', can('view_roles', 'add_admin_user', 'edit_admin_user'), wrap(async (req, res) => {
  const rows = await prisma.role.findMany({
    where: { businessId: { in: req.admin!.businessIds } },
    include: { _count: { select: { users: true } } },
    orderBy: { name: 'asc' },
  });
  ok(res, rows.map(dto));
}));

roleRouter.post('/', can('add_role'), wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const b = body.parse(req.body);
  if (await prisma.role.findFirst({ where: { businessId, name: b.name } })) throw conflict('A role with this name already exists');
  const r = await prisma.role.create({ data: { businessId, name: b.name, permissions: b.permissions } });
  ok(res, dto(r), 'Role created');
}));

roleRouter.put('/:id', can('edit_role'), wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const b = body.parse(req.body);
  const role = await prisma.role.findFirst({ where: { id, businessId: { in: req.admin!.businessIds } } });
  if (!role) throw notFound('Role not found');
  if (await prisma.role.findFirst({ where: { businessId: role.businessId, name: b.name, id: { not: id } } })) throw conflict('A role with this name already exists');
  const r = await prisma.role.update({ where: { id }, data: { name: b.name, permissions: b.permissions } });
  ok(res, dto(r), 'Role updated');
}));

roleRouter.delete('/:id', can('delete_role'), wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const role = await prisma.role.findFirst({ where: { id, businessId: { in: req.admin!.businessIds } }, include: { _count: { select: { users: true } } } });
  if (!role) throw notFound('Role not found');
  if (role._count.users > 0) throw badRequest('Reassign the admin users with this role before deleting it');
  await prisma.role.delete({ where: { id } });
  ok(res, null, 'Role deleted');
}));
