import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, wrap } from '../../lib/http';
import { adminBusinessId, can } from '../../middleware/auth';
import { badRequest, notFound } from '../../lib/errors';
import { hmsToSeconds, dateOnly } from '../../lib/time';
import { idParams, int, optInt, optStr, timeStr } from '../../lib/validation';

export const shiftRouter = Router();
shiftRouter.use(can('view_setting'));

const detailBody = z.object({
  id: optInt,
  name: optStr,
  start_time: timeStr,
  end_time: timeStr,
  break_minutes: int.default(0),
});

const shiftBody = z.discriminatedUnion('shift_type_id', [
  z.object({ shift_type_id: z.literal(1), name: z.string().trim().min(1), details: z.array(detailBody).length(1) }),
  z.object({ shift_type_id: z.literal(2), name: z.string().trim().min(1), details: z.array(detailBody).min(2, 'A rotational shift needs at least two shifts') }),
  z.object({ shift_type_id: z.literal(3), name: z.string().trim().min(1), working_hours: z.preprocess((v) => (typeof v === 'string' ? (v.includes(':') ? hmsToSeconds(v) / 3600 : Number(v)) : v), z.number().min(0.5).max(24)) }),
]);

export function payableSeconds(start: string, end: string, breakMinutes: number) {
  let s = hmsToSeconds(start);
  let e = hmsToSeconds(end);
  if (e <= s) e += 86400;
  const total = e - s - breakMinutes * 60;
  if (total <= 0) throw badRequest('Break time is longer than the shift');
  return total;
}

const include = { type: true, details: { orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }] }, _count: { select: { users: true } } };

const dto = (s: Awaited<ReturnType<typeof loadShift>>) => ({
  id: s.id,
  name: s.name,
  shift_type_id: s.shiftTypeId,
  shift_type: s.type.name,
  staff_count: s._count.users,
  details: s.details.map((d) => ({
    id: d.id,
    name: d.name,
    start_time: d.shiftStartTime,
    end_time: d.shiftEndTime,
    break_minutes: Math.round(d.breakSeconds / 60),
    total_payable_hours: d.totalPayableSeconds / 3600,
    total_payable_seconds: d.totalPayableSeconds,
  })),
});

async function loadShift(businessId: number, id: number) {
  const s = await prisma.workingShift.findFirst({ where: { id, businessId, deletedAt: null }, include });
  if (!s) throw notFound('Shift not found');
  return s;
}

shiftRouter.get('/', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const rows = await prisma.workingShift.findMany({ where: { businessId, deletedAt: null }, include, orderBy: { id: 'asc' } });
  ok(res, rows.map((s) => dto(s)));
}));

shiftRouter.get('/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  ok(res, dto(await loadShift(adminBusinessId(req), id)));
}));

shiftRouter.post('/', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const b = shiftBody.parse(req.body);
  const shift = await prisma.$transaction(async (tx) => {
    const s = await tx.workingShift.create({ data: { businessId, shiftTypeId: b.shift_type_id, name: b.name } });
    if (b.shift_type_id === 3) {
      await tx.workingShiftDetail.create({ data: { workingShiftId: s.id, totalPayableSeconds: Math.round(b.working_hours * 3600) } });
    } else {
      await tx.workingShiftDetail.createMany({
        data: b.details.map((d, i) => ({
          workingShiftId: s.id,
          name: d.name ?? null,
          shiftStartTime: d.start_time,
          shiftEndTime: d.end_time,
          breakSeconds: d.break_minutes * 60,
          totalPayableSeconds: payableSeconds(d.start_time, d.end_time, d.break_minutes),
          position: i,
        })),
      });
    }
    return s;
  });
  ok(res, dto(await loadShift(businessId, shift.id)), 'Shift insert successfully');
}));

shiftRouter.put('/:id', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  const existing = await loadShift(businessId, id);
  const b = shiftBody.parse({ ...req.body, shift_type_id: existing.shiftTypeId });
  await prisma.$transaction(async (tx) => {
    await tx.workingShift.update({ where: { id }, data: { name: b.name } });
    if (b.shift_type_id === 3) {
      const first = existing.details[0];
      const seconds = Math.round(b.working_hours * 3600);
      if (first) await tx.workingShiftDetail.update({ where: { id: first.id }, data: { totalPayableSeconds: seconds } });
      else await tx.workingShiftDetail.create({ data: { workingShiftId: id, totalPayableSeconds: seconds } });
      return;
    }
    const keep = new Set(b.details.map((d) => d.id).filter(Boolean) as number[]);
    const removed = existing.details.filter((d) => !keep.has(d.id)).map((d) => d.id);
    if (removed.length) await tx.workingShiftDetail.deleteMany({ where: { id: { in: removed }, workingShiftId: id } });
    for (const [i, d] of b.details.entries()) {
      const data = {
        name: d.name ?? null,
        shiftStartTime: d.start_time,
        shiftEndTime: d.end_time,
        breakSeconds: d.break_minutes * 60,
        totalPayableSeconds: payableSeconds(d.start_time, d.end_time, d.break_minutes),
        position: i,
      };
      if (d.id && existing.details.some((x) => x.id === d.id)) await tx.workingShiftDetail.update({ where: { id: d.id }, data });
      else await tx.workingShiftDetail.create({ data: { workingShiftId: id, ...data } });
    }
  });
  ok(res, dto(await loadShift(businessId, id)), 'Shift updated successfully');
}));

shiftRouter.delete('/:id', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  const s = await loadShift(businessId, id);
  if (s._count.users > 0) throw badRequest('Remove the staff assigned to this shift before deleting it');
  const total = await prisma.workingShift.count({ where: { businessId, deletedAt: null } });
  if (total <= 1) throw badRequest('At least one shift is required');
  await prisma.workingShift.update({ where: { id }, data: { deletedAt: new Date() } });
  ok(res, null, 'Shift deleted');
}));

shiftRouter.get('/:id/staff', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  await loadShift(businessId, id);
  const staff = await prisma.staff.findMany({
    where: { businessId, deletedAt: null, isDeactivated: false },
    include: { photos: { take: 1 }, department: true, shiftUser: { include: { shift: true } } },
    orderBy: { name: 'asc' },
  });
  ok(res, staff.map((s) => ({
    id: s.id,
    name: [s.name, s.lastName].filter(Boolean).join(' '),
    phone_number: s.phoneNumber,
    photo: s.photos[0]?.url ?? null,
    department: s.department?.name ?? null,
    current_shift: s.shiftUser?.shift.name ?? null,
    assigned: s.shiftUser?.workingShiftId === id,
    start_index: s.shiftUser?.workingShiftId === id ? s.shiftUser.startIndex : null,
    working_type: s.shiftUser?.workingShiftId === id ? s.shiftUser.workingType : null,
  })));
}));

shiftRouter.post('/:id/assign', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  const shift = await loadShift(businessId, id);
  const b = z
    .object({
      staff_ids: z.array(int).min(1),
      /** rotational shifts: which shift in the sequence each staff member starts with */
      start_index: optInt,
      /** rotational shifts: 0 = daily, 1 = weekly, 2 = monthly rotation */
      working_type: optInt,
    })
    .parse(req.body);
  if (shift.shiftTypeId === 2) {
    if (b.working_type === undefined || ![0, 1, 2].includes(b.working_type)) throw badRequest('Choose how often the rotation changes (daily, weekly or monthly)');
    if ((b.start_index ?? 0) >= shift.details.length) throw badRequest('Invalid starting shift');
  }
  const today = dateOnly(new Date());
  const staff = await prisma.staff.findMany({ where: { id: { in: b.staff_ids }, businessId, deletedAt: null }, include: { shiftUser: true } });
  await prisma.$transaction(async (tx) => {
    for (const s of staff) {
      if (s.shiftUser?.workingShiftId !== id) {
        await tx.workingShiftHistory.updateMany({ where: { staffId: s.id, endDate: null }, data: { endDate: today } });
        await tx.workingShiftHistory.create({ data: { staffId: s.id, workingShiftId: id, startDate: today } });
      }
      const data = { workingShiftId: id, startIndex: shift.shiftTypeId === 2 ? b.start_index ?? 0 : null, workingType: shift.shiftTypeId === 2 ? b.working_type ?? 0 : null };
      await tx.workingShiftUser.upsert({ where: { staffId: s.id }, create: { staffId: s.id, ...data }, update: data });
    }
  });
  ok(res, { assigned: staff.length }, 'Shift assigned');
}));

shiftRouter.post('/:id/unassign', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  await loadShift(businessId, id);
  const { staff_ids } = z.object({ staff_ids: z.array(int).min(1) }).parse(req.body);
  const res2 = await prisma.workingShiftUser.deleteMany({ where: { workingShiftId: id, staffId: { in: staff_ids }, staff: { businessId } } });
  ok(res, { removed: res2.count }, 'Staff removed from shift');
}));
