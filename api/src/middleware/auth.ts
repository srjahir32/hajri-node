import type { NextFunction, Request, Response } from 'express';
import type { Staff, SuperAdmin, User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, type TokenPayload } from '../lib/jwt';
import { forbidden, unauthorized } from '../lib/errors';
import { PERMISSIONS, type Permission } from '../lib/permissions';
import { wrap } from '../lib/http';

export interface AdminContext {
  user: User;
  /** the business owner (== user for owners, the parent for sub-admins) */
  ownerId: number;
  owner: User;
  businessId: number;
  businessIds: number[];
  isOwner: boolean;
  permissions: Set<string>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminContext;
      staff?: Staff;
      staffBusinessId?: number;
      superAdmin?: SuperAdmin;
      token?: TokenPayload;
    }
  }
}

function bearer(req: Request): string {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) return h.slice(7);
  throw unauthorized('Authentication required');
}

function decode(req: Request, type: TokenPayload['typ']): TokenPayload {
  let payload: TokenPayload;
  try {
    payload = verifyToken(bearer(req));
  } catch (e) {
    if (e instanceof Error && e.name === 'TokenExpiredError') throw unauthorized('Session expired, please log in again');
    throw unauthorized('Invalid token');
  }
  if (payload.typ !== type) throw unauthorized('Wrong token type for this endpoint');
  return payload;
}

/** Business owner or sub-admin ("admin user"). Resolves the active business from X-Business-Id / token. */
export const requireAdmin = wrap(async (req, _res, next) => {
  const payload = decode(req, 'user');
  const user = await prisma.user.findFirst({ where: { id: payload.sub, deletedAt: null }, include: { role: true } });
  if (!user) throw unauthorized('Account not found');
  if (!user.isActive) throw forbidden('Your account is deactivated, please contact support.');

  const ownerId = user.isSubAdmin && user.ownerId ? user.ownerId : user.id;
  const owner = ownerId === user.id ? user : await prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
  const links = await prisma.businessUser.findMany({
    where: { userId: ownerId, business: { deletedAt: null } },
    select: { businessId: true },
    orderBy: { businessId: 'asc' },
  });
  const businessIds = links.map((l) => l.businessId);

  const requested = Number(req.headers['x-business-id'] ?? payload.bid ?? 0) || undefined;
  const businessId = requested && businessIds.includes(requested) ? requested : businessIds[0];

  const isOwner = !user.isSubAdmin;
  const perms = isOwner ? [...PERMISSIONS] : ((user.role?.permissions as string[] | undefined) ?? []);

  req.token = payload;
  req.admin = { user, owner, ownerId, businessId: businessId as number, businessIds, isOwner, permissions: new Set(perms) };
  next();
});

/** Same as requireAdmin but additionally demands that a business is selected/exists. */
export const requireBusiness = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.admin?.businessId) return next(forbidden('Create a business first'));
  next();
};

export const can =
  (...perms: Permission[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const a = req.admin;
    if (!a) return next(unauthorized());
    if (a.isOwner || perms.some((p) => a.permissions.has(p))) return next();
    next(forbidden('You do not have permission to perform this action'));
  };

export const requireStaff = wrap(async (req, _res, next) => {
  const payload = decode(req, 'staff');
  const staff = await prisma.staff.findFirst({ where: { id: payload.sub, deletedAt: null } });
  if (!staff) throw unauthorized('Account not found');
  if (staff.isDeactivated) throw forbidden('Your account is deactivated, please contact your business owner.');
  req.token = payload;
  req.staff = staff;
  req.staffBusinessId = staff.businessId;
  next();
});

export const requireSuperAdmin = wrap(async (req, _res, next) => {
  const payload = decode(req, 'super');
  const admin = await prisma.superAdmin.findUnique({ where: { id: payload.sub } });
  if (!admin) throw unauthorized('Account not found');
  req.token = payload;
  req.superAdmin = admin;
  next();
});

export const adminBusinessId = (req: Request): number => {
  const id = req.admin?.businessId;
  if (!id) throw forbidden('Create a business first');
  return id;
};
