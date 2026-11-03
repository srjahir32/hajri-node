import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, wrap } from '../../lib/http';
import { adminBusinessId, can } from '../../middleware/auth';
import { badRequest, notFound } from '../../lib/errors';
import { dateOnly, fmtDate } from '../../lib/time';
import { idParams, int, optInt } from '../../lib/validation';

export const holidayRouter = Router();
holidayRouter.use(can('view_setting'));

const month = z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM');
const policyBody = z.object({
  name: z.string().trim().min(1, 'Template name is required'),
  year: int.optional(),
  start_month: month.optional(),
  end_month: month.optional(),
  holidays: z.array(z.object({ id: optInt, name: z.string().trim().min(1), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).default([]),
});

const ym = (d: Date | null) => (d ? d.toISOString().slice(0, 7) : null);
/** year / start / end stay consistent: the range wins, otherwise a bare year covers Jan–Dec. */
function span(b: { year?: number; start_month?: string; end_month?: string }) {
  const year = b.year ?? (b.start_month ? Number(b.start_month.slice(0, 4)) : new Date().getFullYear());
  const start = b.start_month ?? `${year}-01`;
  const end = b.end_month ?? `${year}-12`;
  if (end < start) throw badRequest('Shift end time must be a future month/year after shift start time.');
  return { year, startsOn: dateOnly(`${start}-01`), endsOn: dateOnly(`${end}-01`) };
}

const policyDto = (p: { id: number; name: string; year: number; startsOn: Date | null; endsOn: Date | null; holidays: { id: number; name: string; date: Date }[]; _count?: { staff: number } }) => ({
  id: p.id,
  name: p.name,
  year: p.year,
  start_month: ym(p.startsOn),
  end_month: ym(p.endsOn),
  holiday_count: p.holidays.length,
  staff_count: p._count?.staff ?? 0,
  holidays: [...p.holidays].sort((a, b) => a.date.getTime() - b.date.getTime()).map((h) => ({ id: h.id, name: h.name, date: fmtDate(h.date) })),
});

// ── holiday templates ──
holidayRouter.get('/policies', wrap(async (req, res) => {
  const rows = await prisma.holidayPolicy.findMany({
    where: { businessId: adminBusinessId(req) },
    include: { holidays: true, _count: { select: { staff: true } } },
    orderBy: [{ year: 'desc' }, { id: 'desc' }],
  });
  ok(res, rows.map(policyDto));
}));

holidayRouter.post('/policies', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const b = policyBody.parse(req.body);
  const p = await prisma.holidayPolicy.create({
    data: { businessId, name: b.name, ...span(b), holidays: { create: b.holidays.map((h) => ({ name: h.name, date: dateOnly(h.date) })) } },
    include: { holidays: true },
  });
  ok(res, policyDto(p), 'Holiday template added');
}));

holidayRouter.put('/policies/:id', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  const b = policyBody.parse(req.body);
  const existing = await prisma.holidayPolicy.findFirst({ where: { id, businessId }, include: { holidays: true } });
  if (!existing) throw notFound('Template not found');
  const keep = new Set(b.holidays.map((h) => h.id).filter(Boolean) as number[]);
  await prisma.$transaction(async (tx) => {
    await tx.holidayPolicy.update({ where: { id }, data: { name: b.name, ...span(b) } });
    await tx.holidayList.deleteMany({ where: { policyId: id, id: { notIn: [...keep] } } });
    for (const h of b.holidays) {
      if (h.id && keep.has(h.id)) await tx.holidayList.update({ where: { id: h.id }, data: { name: h.name, date: dateOnly(h.date) } });
      else await tx.holidayList.create({ data: { policyId: id, name: h.name, date: dateOnly(h.date) } });
    }
  });
  const p = await prisma.holidayPolicy.findUniqueOrThrow({ where: { id }, include: { holidays: true } });
  ok(res, policyDto(p), 'Holiday template updated');
}));

holidayRouter.delete('/policies/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const r = await prisma.holidayPolicy.deleteMany({ where: { id, businessId: adminBusinessId(req) } });
  if (!r.count) throw notFound('Template not found');
  ok(res, null, 'Template deleted');
}));

holidayRouter.delete('/holidays/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const r = await prisma.holidayList.deleteMany({ where: { id, policy: { businessId: adminBusinessId(req) } } });
  if (!r.count) throw notFound('Holiday not found');
  ok(res, null, 'Holiday deleted');
}));

holidayRouter.get('/policies/:id/staff', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  const staff = await prisma.staff.findMany({
    where: { businessId, deletedAt: null, isDeactivated: false },
    include: { photos: { take: 1 }, department: true, holidayPolicies: { where: { policyId: id } } },
    orderBy: { name: 'asc' },
  });
  ok(res, staff.map((s) => ({ id: s.id, name: [s.name, s.lastName].filter(Boolean).join(' '), phone_number: s.phoneNumber, department: s.department?.name ?? null, photo: s.photos[0]?.url ?? null, assigned: s.holidayPolicies.length > 0 })));
}));

holidayRouter.post('/policies/:id/assign', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const { id } = idParams.parse(req.params);
  const b = z.object({ selected_ids: z.array(int).default([]), unselected_ids: z.array(int).default([]) }).parse(req.body);
  if (!(await prisma.holidayPolicy.findFirst({ where: { id, businessId } }))) throw notFound('Template not found');
  const valid = await prisma.staff.findMany({ where: { id: { in: b.selected_ids }, businessId }, select: { id: true } });
  await prisma.$transaction([
    prisma.holidayPolicyStaff.deleteMany({ where: { policyId: id, staffId: { in: b.unselected_ids } } }),
    prisma.holidayPolicyStaff.createMany({ data: valid.map((s) => ({ policyId: id, staffId: s.id })), skipDuplicates: true }),
  ]);
  ok(res, null, 'Holiday template applied');
}));

// ── weekly holidays ──
const days = z.array(int.pipe(z.number().min(0).max(6)));

holidayRouter.get('/weekly/business', wrap(async (req, res) => {
  const rows = await prisma.weeklyHolidayBusiness.findMany({ where: { businessId: adminBusinessId(req) }, orderBy: { day: 'asc' } });
  ok(res, { days: rows.map((r) => r.day) });
}));

holidayRouter.put('/weekly/business', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const b = z.object({ days }).parse(req.body);
  await prisma.$transaction([
    prisma.weeklyHolidayBusiness.deleteMany({ where: { businessId } }),
    prisma.weeklyHolidayBusiness.createMany({ data: [...new Set(b.days)].map((day) => ({ businessId, day })) }),
  ]);
  ok(res, null, 'Weekly holidays saved');
}));

holidayRouter.get('/weekly/staff', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const staff = await prisma.staff.findMany({
    where: { businessId, deletedAt: null, isDeactivated: false },
    include: { photos: { take: 1 }, department: true, weeklyHolidays: true },
    orderBy: { name: 'asc' },
  });
  ok(res, staff.map((s) => ({ id: s.id, name: [s.name, s.lastName].filter(Boolean).join(' '), phone_number: s.phoneNumber, department: s.department?.name ?? null, photo: s.photos[0]?.url ?? null, days: s.weeklyHolidays.map((w) => w.day), custom: s.weeklyHolidays.length > 0 })));
}));

/** Set weekly holidays for selected staff. An empty `days` list resets them to the business default. */
holidayRouter.put('/weekly/staff', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const b = z.object({ staff_ids: z.array(int).min(1), days }).parse(req.body);
  const valid = await prisma.staff.findMany({ where: { id: { in: b.staff_ids }, businessId }, select: { id: true } });
  const ids = valid.map((s) => s.id);
  await prisma.$transaction([
    prisma.weeklyHolidayStaff.deleteMany({ where: { staffId: { in: ids } } }),
    prisma.weeklyHolidayStaff.createMany({ data: ids.flatMap((staffId) => [...new Set(b.days)].map((day) => ({ staffId, day }))) }),
  ]);
  ok(res, { updated: ids.length }, 'Weekly holidays saved');
}));
