import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, wrap } from '../../lib/http';
import { adminBusinessId, can } from '../../middleware/auth';
import { businessTz, staffTz } from '../../services/context.service';
import { dateOnly, normalizeTz, todayIn } from '../../lib/time';
import { DateTime } from 'luxon';
import { idParams, optStr } from '../../lib/validation';
import { notFound } from '../../lib/errors';

export const locationRouter = Router();
locationRouter.use(can('view_locations', 'view_staff_management', 'view_attendance'));

type Point = { latitude?: number | string; longitude?: number | string; accuracy?: number | null; type?: string; timestamp?: string; time?: string; date?: string };

/** Normalise stored points to ISO timestamps + local time labels. */
function shape(points: unknown, date: string, tz: string) {
  const arr = (Array.isArray(points) ? points : []) as Point[];
  return arr
    .map((p) => {
      const iso = p.timestamp ?? (p.time ? `${p.date ?? date}T${p.time}Z` : null);
      const dt = iso ? DateTime.fromISO(iso, { zone: 'utc' }).setZone(tz) : null;
      return {
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        accuracy: p.accuracy ?? null,
        type: p.type ?? 'tracking',
        timestamp: dt?.toUTC().toISO() ?? null,
        time: dt?.toFormat('HH:mm:ss') ?? null,
        formatted_time: dt?.toFormat('h:mm a') ?? null,
      };
    })
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
}

/** Latest known position of every staff member for a date. */
locationRouter.get('/live', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const tz = await businessTz(businessId);
  const q = z.object({ date: optStr, timezone: optStr }).parse(req.query);
  const date = q.date ?? todayIn(q.timezone ? normalizeTz(q.timezone) : tz);
  const rows = await prisma.liveLocation.findMany({
    where: { businessId, date: dateOnly(date), staff: { deletedAt: null, isDeactivated: false } },
    include: { staff: { include: { photos: { take: 1 }, department: true } } },
  });
  const out = [];
  for (const r of rows) {
    const pts = shape(r.points, date, await staffTz(r.staff));
    if (!pts.length) continue;
    out.push({
      staff_id: r.staffId,
      staff_name: [r.staff.name, r.staff.lastName].filter(Boolean).join(' '),
      staff_image: r.staff.photos[0]?.url ?? null,
      department: r.staff.department?.name ?? null,
      last_location: pts[pts.length - 1],
      last_2_locations: pts.slice(-2),
      point_count: pts.length,
    });
  }
  ok(res, out, 'success', { date });
}));

locationRouter.get('/staff/:id', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  const staff = await prisma.staff.findFirst({ where: { id, businessId, deletedAt: null } });
  if (!staff) throw notFound('Staff not found');
  const tz = await staffTz(staff);
  const q = z.object({ date: optStr }).parse(req.query);
  const date = q.date ?? todayIn(tz);
  const row = await prisma.liveLocation.findUnique({ where: { staffId_date: { staffId: id, date: dateOnly(date) } } });
  ok(res, shape(row?.points, date, tz), 'success', { date });
}));
