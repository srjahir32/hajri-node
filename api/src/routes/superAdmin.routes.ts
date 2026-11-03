import { Router } from 'express';
import { z } from 'zod';
import { DateTime } from 'luxon';
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';
import { ok, pageMeta, pageParams, wrap } from '../lib/http';
import { badRequest, notFound } from '../lib/errors';
import { requireSuperAdmin } from '../middleware/auth';
import { idParams, int, optInt, optStr, yearMonth } from '../lib/validation';
import { monthCalendar } from '../services/attendance.service';
import { activate, subscriptionDto } from '../services/subscription.service';
import { deleteStaff } from '../services/staff.service';
import { dateOnly } from '../lib/time';

/** Platform-wide administration for the Hajri team. */
export const superAdminRouter = Router();
superAdminRouter.use(requireSuperAdmin);

const sumAmount = async (where: object) => Number((await prisma.paymentLog.aggregate({ _sum: { amount: true }, where: { status: 'success', ...where } }))._sum.amount ?? 0);

/** Everything the Laravel super-admin dashboard shows (counts, INR/USD revenue splits, recent items, 6-month growth). */
superAdminRouter.get('/dashboard/overview', wrap(async (_req, res) => {
  const now = DateTime.now();
  const dayStart = now.startOf('day').toJSDate();
  const monthStart = now.startOf('month').toJSDate();
  const paid = { status: { in: ['success', 'SUCCESS', 'paid', 'PAID', 'SUCCESSFUL'] } };
  const sum = async (cur: string, from?: Date) => Number((await prisma.paymentLog.aggregate({ _sum: { amount: true }, where: { ...paid, currency: cur, ...(from ? { createdAt: { gte: from } } : {}) } }))._sum.amount ?? 0);
  const [totalBusinesses, todayBusinesses, monthBusinesses, totalStaff, todayStaff, activeStaff, totalUsers, registered, subs, active, pending, expired, recentBusinesses, recentPayments] = await Promise.all([
    prisma.business.count({ where: { deletedAt: null } }),
    prisma.business.count({ where: { deletedAt: null, createdAt: { gte: dayStart } } }),
    prisma.business.count({ where: { deletedAt: null, createdAt: { gte: monthStart } } }),
    prisma.staff.count({ where: { deletedAt: null } }),
    prisma.staff.count({ where: { deletedAt: null, createdAt: { gte: dayStart } } }),
    prisma.staff.count({ where: { deletedAt: null, isDeactivated: false } }),
    prisma.user.count({ where: { deletedAt: null, isSubAdmin: false } }),
    prisma.businessUser.count(),
    prisma.subscription.count(),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.subscription.count({ where: { status: 'pending' } }),
    prisma.subscription.count({ where: { status: 'expired' } }),
    prisma.business.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 5, include: { users: { include: { user: true }, take: 1 }, _count: { select: { staff: true } } } }),
    prisma.paymentLog.findMany({ orderBy: { id: 'desc' }, take: 5, include: { user: true, subscription: true } }),
  ]);
  const growth = [];
  for (let i = 5; i >= 0; i--) {
    const m = now.minus({ months: i }).startOf('month');
    const range = { gte: m.toJSDate(), lt: m.plus({ months: 1 }).toJSDate() };
    const [businesses, staff, rev] = await Promise.all([
      prisma.business.count({ where: { createdAt: range } }),
      prisma.staff.count({ where: { createdAt: range } }),
      prisma.paymentLog.aggregate({ _sum: { amount: true }, where: { ...paid, createdAt: range } }),
    ]);
    growth.push({ month: m.toFormat('LLL yyyy'), businesses, staff, revenue: Number(rev._sum.amount ?? 0) });
  }
  ok(res, {
    total_businesses: totalBusinesses, today_businesses: todayBusinesses, this_month_businesses: monthBusinesses,
    total_staff: totalStaff, today_staff: todayStaff, active_staff: activeStaff, deactive_staff: totalStaff - activeStaff,
    total_users: totalUsers, fully_registered_users: registered, not_fully_registered_users: Math.max(0, totalUsers - registered),
    total_subscriptions: subs, active_subscriptions: active, pending_subscriptions: pending, expired_subscriptions: expired,
    total_revenue_cashfree: await sum('INR'), total_revenue_kelviq: await sum('USD'),
    month_revenue_cashfree: await sum('INR', monthStart), month_revenue_kelviq: await sum('USD', monthStart),
    today_revenue_cashfree: await sum('INR', dayStart), today_revenue_kelviq: await sum('USD', dayStart),
    recent_businesses: recentBusinesses.map((b) => ({ id: b.id, name: b.name, owner: b.users[0]?.user.name ?? null, phone: b.users[0]?.user.phoneNumber ?? null, staff_count: b._count.staff, created_at: b.createdAt.toISOString() })),
    recent_payments: recentPayments.map((p) => ({ id: p.id, amount: Number(p.amount ?? 0), status: p.status, currency: p.currency, paid_at: p.createdAt.toISOString(), user_name: p.user?.name ?? null, plan: p.subscription?.plan ?? null, payment_method: p.subscription?.paymentMethod ?? null, billing_cycle: p.subscription?.billingCycle ?? null })),
    monthly_growth: growth,
  });
}));

superAdminRouter.get('/dashboard', wrap(async (_req, res) => {
  const now = new Date();
  const monthStart = DateTime.utc().startOf('month').toJSDate();
  const [businesses, owners, staff, activeSubs, trialUsers, revenueTotal, revenueMonth, newBusinesses] = await Promise.all([
    prisma.business.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, isSubAdmin: false } }),
    prisma.staff.count({ where: { deletedAt: null, isDeactivated: false } }),
    prisma.subscription.count({ where: { status: 'active', expiresAt: { gt: now } } }),
    prisma.user.count({ where: { deletedAt: null, isSubAdmin: false, trialEndsAt: { gt: now } } }),
    sumAmount({}),
    sumAmount({ createdAt: { gte: monthStart } }),
    prisma.business.count({ where: { deletedAt: null, createdAt: { gte: monthStart } } }),
  ]);
  const recent = await prisma.business.findMany({
    where: { deletedAt: null },
    orderBy: { id: 'desc' },
    take: 8,
    include: { _count: { select: { staff: true } }, users: { include: { user: true }, take: 1 } },
  });
  ok(res, {
    totals: { businesses, owners, staff, active_subscriptions: activeSubs, trial_users: trialUsers, revenue_total: revenueTotal, revenue_this_month: revenueMonth, new_businesses_this_month: newBusinesses },
    recent_businesses: recent.map((b) => ({ id: b.id, name: b.name, owner: b.users[0]?.user.name ?? null, phone: b.users[0]?.user.phoneNumber ?? null, staff_count: b._count.staff, is_active: b.isActive, created_at: b.createdAt.toISOString() })),
  });
}));

// ── businesses ──
superAdminRouter.get('/businesses', wrap(async (req, res) => {
  const q = z.object({ search: optStr, status: z.enum(['active', 'inactive']).optional() }).parse(req.query);
  const { page, size, skip, take } = pageParams(req.query, 20, 200);
  const where = {
    deletedAt: null,
    ...(q.status ? { isActive: q.status === 'active' } : {}),
    ...(q.search ? { OR: [{ name: { contains: q.search } }, { users: { some: { user: { phoneNumber: { contains: q.search } } } } }, { users: { some: { user: { name: { contains: q.search } } } } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.business.count({ where }),
    prisma.business.findMany({
      where,
      orderBy: { id: 'desc' },
      skip,
      take,
      include: { category: true, _count: { select: { staff: true } }, users: { include: { user: true }, where: { user: { isSubAdmin: false } }, take: 1 } },
    }),
  ]);
  ok(res, rows.map((b) => {
    const owner = b.users[0]?.user;
    return {
      id: b.id,
      name: b.name,
      category: b.category?.name ?? null,
      city: b.city,
      is_active: b.isActive,
      staff_count: b._count.staff,
      owner: owner ? { id: owner.id, name: owner.name, email: owner.email, phone: `+${owner.countryCode ?? ''} ${owner.phoneNumber}`, trial_ends_at: owner.trialEndsAt?.toISOString() ?? null } : null,
      created_at: b.createdAt.toISOString(),
    };
  }), 'success', pageMeta(page, size, total));
}));

superAdminRouter.get('/businesses/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const b = await prisma.business.findFirst({
    where: { id, deletedAt: null },
    include: { category: true, country: true, systemSetting: true, users: { include: { user: { include: { subscriptions: { orderBy: { id: 'desc' }, take: 5 } } } } }, _count: { select: { staff: true, departments: true, workingShifts: true } } },
  });
  if (!b) throw notFound('Business not found');
  const owner = b.users.find((u) => !u.user.isSubAdmin)?.user;
  const [active, deactivated] = await Promise.all([
    prisma.staff.count({ where: { businessId: id, deletedAt: null, isDeactivated: false } }),
    prisma.staff.count({ where: { businessId: id, deletedAt: null, isDeactivated: true } }),
  ]);
  ok(res, {
    id: b.id,
    name: b.name,
    address: b.businessAddress,
    city: b.city,
    state: b.state,
    country: b.country?.name ?? null,
    category: b.category?.name ?? null,
    timezone: b.systemSetting?.timezone ?? 'UTC',
    is_active: b.isActive,
    created_at: b.createdAt.toISOString(),
    staff: { active, deactivated, departments: b._count.departments, shifts: b._count.workingShifts },
    owner: owner && { id: owner.id, name: owner.name, email: owner.email, phone: `+${owner.countryCode ?? ''} ${owner.phoneNumber}`, trial_ends_at: owner.trialEndsAt?.toISOString() ?? null, is_active: owner.isActive },
    subscriptions: owner?.subscriptions.map((s) => subscriptionDto(s, active)) ?? [],
  });
}));

superAdminRouter.post('/businesses/:id/extend-trial', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const { days } = z.object({ days: int.pipe(z.number().min(1).max(365)) }).parse(req.body);
  const link = await prisma.businessUser.findFirst({ where: { businessId: id, user: { isSubAdmin: false } }, include: { user: true } });
  if (!link) throw notFound('Owner not found');
  const base = link.user.trialEndsAt && link.user.trialEndsAt > new Date() ? DateTime.fromJSDate(link.user.trialEndsAt) : DateTime.now();
  const trialEndsAt = base.plus({ days }).toJSDate();
  await prisma.user.update({ where: { id: link.userId }, data: { trialEndsAt } });
  ok(res, { trial_ends_at: trialEndsAt.toISOString() }, `Trial extended by ${days} day(s)`);
}));

superAdminRouter.post('/businesses/:id/toggle-status', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const b = await prisma.business.findFirst({ where: { id, deletedAt: null } });
  if (!b) throw notFound('Business not found');
  const isActive = !b.isActive;
  await prisma.business.update({ where: { id }, data: { isActive } });
  await prisma.user.updateMany({ where: { businessUsers: { some: { businessId: id } }, isSubAdmin: false }, data: { isActive } });
  ok(res, { is_active: isActive }, isActive ? 'Business activated' : 'Business deactivated');
}));

superAdminRouter.delete('/businesses/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  await prisma.$transaction([
    prisma.staff.updateMany({ where: { businessId: id }, data: { deletedAt: new Date(), isDeactivated: true } }),
    prisma.business.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } }),
  ]);
  ok(res, null, 'Business deleted');
}));

/** Grant a subscription manually (e.g. after an offline/bank payment). */
superAdminRouter.post('/businesses/:id/grant-subscription', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const b = z.object({ plan: z.enum(['monthly', 'yearly']), seats: int.pipe(z.number().min(1).max(500)) }).parse(req.body);
  const link = await prisma.businessUser.findFirst({ where: { businessId: id, user: { isSubAdmin: false } } });
  if (!link) throw notFound('Owner not found');
  const sub = await prisma.subscription.create({
    data: { userId: link.userId, plan: b.plan, billingCycle: b.plan, seats: b.seats, pricePerSeat: 0, totalAmount: 0, status: 'pending', paymentMethod: 'manual' },
  });
  await activate(sub, 'manual_grant', { amount: 0 });
  ok(res, null, 'Subscription granted');
}));

// ── users / staff ──
superAdminRouter.get('/users', wrap(async (req, res) => {
  const q = z.object({ search: optStr }).parse(req.query);
  const { page, size, skip, take } = pageParams(req.query, 20, 200);
  const where = {
    deletedAt: null,
    ...(q.search ? { OR: [{ name: { contains: q.search } }, { phoneNumber: { contains: q.search } }, { email: { contains: q.search } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: { id: 'desc' }, skip, take, include: { businessUsers: { include: { business: { select: { id: true, name: true } } } }, role: true } }),
  ]);
  ok(res, rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: `+${u.countryCode ?? ''} ${u.phoneNumber}`,
    is_sub_admin: u.isSubAdmin,
    role: u.role?.name ?? null,
    is_active: u.isActive,
    trial_ends_at: u.trialEndsAt?.toISOString() ?? null,
    businesses: u.businessUsers.map((b) => b.business),
    last_login_at: u.lastLoginAt?.toISOString() ?? null,
    created_at: u.createdAt.toISOString(),
  })), 'success', pageMeta(page, size, total));
}));

superAdminRouter.post('/users/:id/toggle-status', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const u = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!u) throw notFound('User not found');
  await prisma.user.update({ where: { id }, data: { isActive: !u.isActive } });
  ok(res, { is_active: !u.isActive });
}));

superAdminRouter.get('/staff', wrap(async (req, res) => {
  const q = z.object({ search: optStr, business_id: optInt }).parse(req.query);
  const { page, size, skip, take } = pageParams(req.query, 20, 200);
  const where = {
    deletedAt: null,
    ...(q.business_id ? { businessId: q.business_id } : {}),
    ...(q.search ? { OR: [{ name: { contains: q.search } }, { lastName: { contains: q.search } }, { phoneNumber: { contains: q.search } }, { business: { name: { contains: q.search } } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.staff.count({ where }),
    prisma.staff.findMany({ where, orderBy: { id: 'desc' }, skip, take, include: { business: { select: { id: true, name: true } }, department: true } }),
  ]);
  ok(res, rows.map((s) => ({
    id: s.id,
    name: [s.name, s.middleName, s.lastName].filter(Boolean).join(' '),
    phone: `+${s.countryCode ?? ''} ${s.phoneNumber}`,
    email: s.email,
    business: s.business,
    department: s.department?.name ?? null,
    is_deactivated: s.isDeactivated,
    created_at: s.createdAt.toISOString(),
  })), 'success', pageMeta(page, size, total));
}));

superAdminRouter.get('/staff/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const s = await prisma.staff.findFirst({ where: { id, deletedAt: null }, include: { business: true, department: true, profile: true, info: true, bank: true, photos: { take: 1 } } });
  if (!s) throw notFound('Staff not found');
  const q = z.object({ month: optStr }).parse(req.query);
  const ym = yearMonth.safeParse(q.month ?? DateTime.now().toFormat('yyyy-MM'));
  if (!ym.success) throw badRequest('Use month=YYYY-MM');
  const cal = await monthCalendar(s, ym.data.year, ym.data.month);
  const logs = await prisma.staffLog.findMany({ where: { staffId: id }, orderBy: { id: 'desc' }, take: 50 });
  ok(res, {
    staff: {
      id: s.id,
      name: [s.name, s.middleName, s.lastName].filter(Boolean).join(' '),
      phone: `+${s.countryCode ?? ''} ${s.phoneNumber}`,
      email: s.email,
      business: { id: s.business.id, name: s.business.name },
      department: s.department?.name ?? null,
      designation: s.info?.designation ?? null,
      photo: s.photos[0]?.url ?? null,
      is_deactivated: s.isDeactivated,
    },
    attendance: cal,
    logs: logs.map((l) => ({ id: l.id, detail: l.detail, created_at: l.createdAt.toISOString() })),
  });
}));

superAdminRouter.get('/staff/:id/location', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const date = (req.query.date as string) || DateTime.now().toISODate()!;
  const row = await prisma.liveLocation.findUnique({ where: { staffId_date: { staffId: id, date: dateOnly(date) } } });
  ok(res, row?.points ?? []);
}));

superAdminRouter.delete('/staff/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const s = await prisma.staff.findFirst({ where: { id, deletedAt: null } });
  if (!s) throw notFound('Staff not found');
  await deleteStaff(s.businessId, [id]);
  ok(res, null, 'Staff deleted');
}));

// ── subscriptions & revenue ──
superAdminRouter.get('/subscriptions', wrap(async (req, res) => {
  const q = z.object({ status: optStr, search: optStr }).parse(req.query);
  const { page, size, skip, take } = pageParams(req.query, 20, 200);
  const where = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.search ? { user: { OR: [{ name: { contains: q.search } }, { phoneNumber: { contains: q.search } }] } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({ where, orderBy: { id: 'desc' }, skip, take, include: { user: { select: { id: true, name: true, phoneNumber: true, email: true } } } }),
  ]);
  ok(res, rows.map((s) => ({ ...subscriptionDto(s), user: s.user })), 'success', pageMeta(page, size, total));
}));

superAdminRouter.get('/payments', wrap(async (req, res) => {
  const q = z.object({ gateway: z.enum(['cashfree', 'kelviq']).optional(), status: optStr }).parse(req.query);
  const { page, size, skip, take } = pageParams(req.query, 20, 200);
  const where = { ...(q.status ? { status: q.status } : {}), ...(q.gateway ? { subscription: { paymentMethod: q.gateway } } : {}) };
  const [total, rows] = await Promise.all([
    prisma.paymentLog.count({ where }),
    prisma.paymentLog.findMany({ where, orderBy: { id: 'desc' }, skip, take, include: { user: { select: { id: true, name: true, phoneNumber: true } }, subscription: { select: { paymentMethod: true, plan: true, seats: true } } } }),
  ]);
  ok(res, rows.map((p) => ({
    id: p.id,
    user: p.user,
    gateway: p.subscription?.paymentMethod ?? null,
    plan: p.subscription?.plan ?? null,
    seats: p.subscription?.seats ?? null,
    event_type: p.eventType,
    order_id: p.orderId,
    payment_id: p.paymentId,
    amount: p.amount ? Number(p.amount) : null,
    currency: p.currency,
    status: p.status,
    created_at: p.createdAt.toISOString(),
  })), 'success', pageMeta(page, size, total));
}));

/** Monthly revenue and signup series for the reports page. */
superAdminRouter.get('/reports', wrap(async (req, res) => {
  const q = z.object({ months: optInt }).parse(req.query);
  const n = Math.min(24, Math.max(1, q.months ?? 12));
  const start = DateTime.utc().startOf('month').minus({ months: n - 1 });
  const [payments, businesses] = await Promise.all([
    prisma.paymentLog.findMany({ where: { status: 'success', createdAt: { gte: start.toJSDate() } }, select: { amount: true, createdAt: true, currency: true } }),
    prisma.business.findMany({ where: { createdAt: { gte: start.toJSDate() } }, select: { createdAt: true } }),
  ]);
  const rows = Array.from({ length: n }, (_, i) => {
    const m = start.plus({ months: i });
    const key = m.toFormat('yyyy-MM');
    return {
      month: key,
      label: m.toFormat('LLL yyyy'),
      revenue: Math.round(payments.filter((p) => DateTime.fromJSDate(p.createdAt).toFormat('yyyy-MM') === key).reduce((s, p) => s + Number(p.amount ?? 0), 0) * 100) / 100,
      new_businesses: businesses.filter((b) => DateTime.fromJSDate(b.createdAt).toFormat('yyyy-MM') === key).length,
    };
  });
  ok(res, rows);
}));

superAdminRouter.get('/payments/export', wrap(async (_req, res) => {
  const rows = await prisma.paymentLog.findMany({ orderBy: { id: 'desc' }, take: 5000, include: { user: true, subscription: true } });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Payments');
  ws.addRow(['Date', 'Customer', 'Phone', 'Gateway', 'Plan', 'Seats', 'Event', 'Order', 'Payment', 'Amount', 'Currency', 'Status']).font = { bold: true };
  for (const p of rows) {
    ws.addRow([p.createdAt.toISOString().slice(0, 19).replace('T', ' '), p.user?.name ?? '', p.user?.phoneNumber ?? '', p.subscription?.paymentMethod ?? '', p.subscription?.plan ?? '', p.subscription?.seats ?? '', p.eventType, p.orderId ?? '', p.paymentId ?? '', Number(p.amount ?? 0), p.currency, p.status ?? '']);
  }
  ws.columns.forEach((c) => (c.width = 18));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="payments.xlsx"');
  res.send(Buffer.from(await wb.xlsx.writeBuffer()));
}));
