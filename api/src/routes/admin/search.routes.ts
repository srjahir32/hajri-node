import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, wrap } from '../../lib/http';

/** Header search box: departments and staff of the active business matching the text. */
export const searchRouter = Router();

searchRouter.get('/', wrap(async (req, res) => {
  const { q } = z.object({ q: z.string().trim().min(1).max(60) }).parse(req.query);
  const businessId = req.admin!.businessId;
  const [departments, staff] = await Promise.all([
    prisma.department.findMany({ where: { businessId, name: { contains: q } }, select: { id: true, name: true }, take: 8 }),
    prisma.staff.findMany({
      where: { businessId, deletedAt: null, OR: [{ name: { contains: q } }, { lastName: { contains: q } }, { phoneNumber: { contains: q } }] },
      select: { id: true, name: true, lastName: true },
      take: 8,
    }),
  ]);
  ok(res, { departments, staff: staff.map((s) => ({ id: s.id, name: [s.name, s.lastName].filter(Boolean).join(' ') })) });
}));
