import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, wrap } from '../../lib/http';
import { can } from '../../middleware/auth';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors';
import { idParams, int, optBool, optStr } from '../../lib/validation';
import { cleanCode, cleanPhone } from '../../services/auth.service';

/** Sub-admins ("admin users") that share the owner's businesses with a limited role. */
export const adminUserRouter = Router();

const body = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.preprocess((v) => (v === '' ? undefined : v), z.string().email().optional()),
  country_code: z.string().min(1),
  phone_number: z.string().min(6),
  role_id: int,
  is_active: optBool,
});

const dto = (u: { id: number; name: string | null; email: string | null; countryCode: string | null; phoneNumber: string; isActive: boolean; role: { id: number; name: string } | null; lastLoginAt: Date | null; createdAt: Date }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  country_code: u.countryCode,
  phone_number: u.phoneNumber,
  is_active: u.isActive,
  role: u.role ? { id: u.role.id, name: u.role.name } : null,
  last_login_at: u.lastLoginAt?.toISOString() ?? null,
  created_at: u.createdAt.toISOString(),
});

function ownerOnly(userIsSub: boolean) {
  if (userIsSub) throw forbidden('Only the business owner can manage admin users');
}

adminUserRouter.get('/', can('view_admin_user'), wrap(async (req, res) => {
  const rows = await prisma.user.findMany({
    where: { ownerId: req.admin!.ownerId, isSubAdmin: true, deletedAt: null },
    include: { role: true },
    orderBy: { id: 'desc' },
  });
  ok(res, rows.map(dto));
}));

async function validate(req: { admin?: { ownerId: number; businessIds: number[] } }, b: z.infer<typeof body>, exceptId?: number) {
  const code = cleanCode(b.country_code);
  const phone = cleanPhone(b.phone_number);
  if (await prisma.user.findFirst({ where: { countryCode: code, phoneNumber: phone, deletedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) } })) {
    throw conflict('This phone number is already registered');
  }
  const role = await prisma.role.findFirst({ where: { id: b.role_id, businessId: { in: req.admin!.businessIds } } });
  if (!role) throw badRequest('Choose a valid role');
  return { code, phone };
}

adminUserRouter.post('/', can('add_admin_user'), wrap(async (req, res) => {
  ownerOnly(req.admin!.user.isSubAdmin);
  const b = body.parse(req.body);
  const { code, phone } = await validate(req, b);
  const u = await prisma.user.create({
    data: { name: b.name, email: b.email, countryCode: code, phoneNumber: phone, isSubAdmin: true, ownerId: req.admin!.ownerId, roleId: b.role_id, isActive: b.is_active ?? true },
    include: { role: true },
  });
  ok(res, dto(u), 'Admin user added');
}));

adminUserRouter.put('/:id', can('edit_admin_user'), wrap(async (req, res) => {
  ownerOnly(req.admin!.user.isSubAdmin);
  const { id } = idParams.parse(req.params);
  const b = body.parse(req.body);
  const existing = await prisma.user.findFirst({ where: { id, ownerId: req.admin!.ownerId, isSubAdmin: true, deletedAt: null } });
  if (!existing) throw notFound('Admin user not found');
  const { code, phone } = await validate(req, b, id);
  const u = await prisma.user.update({
    where: { id },
    data: { name: b.name, email: b.email ?? null, countryCode: code, phoneNumber: phone, roleId: b.role_id, isActive: b.is_active ?? existing.isActive },
    include: { role: true },
  });
  ok(res, dto(u), 'Admin user updated');
}));

adminUserRouter.delete('/:id', can('delete_admin_user'), wrap(async (req, res) => {
  ownerOnly(req.admin!.user.isSubAdmin);
  const { id } = idParams.parse(req.params);
  const r = await prisma.user.updateMany({ where: { id, ownerId: req.admin!.ownerId, isSubAdmin: true, deletedAt: null }, data: { deletedAt: new Date(), isActive: false } });
  if (!r.count) throw notFound('Admin user not found');
  ok(res, null, 'Admin user deleted');
}));

export const _s = optStr;
