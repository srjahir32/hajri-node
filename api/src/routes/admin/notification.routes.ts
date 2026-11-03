import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, pageMeta, pageParams, wrap } from '../../lib/http';
import { idParams } from '../../lib/validation';

/** Notification inbox, shared by admin users (`userId`) and staff (`staffId`). */
export function notificationRouter(scope: (req: Request) => { userId: number } | { staffId: number }) {
  const r = Router();

  r.get('/', wrap(async (req, res) => {
    const where = scope(req);
    const { page, size, skip, take } = pageParams(req.query, 10, 100);
    const [total, unread, rows] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
      prisma.notification.findMany({ where, orderBy: { id: 'desc' }, skip, take }),
    ]);
    ok(res, rows.map(dto), 'Success', { ...pageMeta(page, size, total), unread_count: unread });
  }));

  r.get('/unread-count', wrap(async (req, res) => {
    ok(res, { count: await prisma.notification.count({ where: { ...scope(req), isRead: false } }) });
  }));

  r.post('/read-all', wrap(async (req, res) => {
    await prisma.notification.updateMany({ where: { ...scope(req), isRead: false }, data: { isRead: true } });
    ok(res);
  }));

  r.post('/:id/read', wrap(async (req, res) => {
    const { id } = idParams.parse(req.params);
    await prisma.notification.updateMany({ where: { id, ...scope(req) }, data: { isRead: true } });
    ok(res);
  }));

  return r;
}

export const dto = (n: { id: number; title: string; message: string | null; action: string | null; actionId: number | null; isRead: boolean; createdAt: Date }) => ({
  id: n.id,
  title: n.title,
  message: n.message,
  action: n.action,
  action_id: n.actionId,
  is_read: n.isRead ? 0 : 1, // legacy mobile contract: 0 = read, 1 = unread
  read: n.isRead,
  created_at: n.createdAt.toISOString(),
});

export const _z = z;
