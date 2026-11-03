import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { DateTime } from 'luxon';
import { prisma } from '../lib/prisma';
import { ok, wrap } from '../lib/http';
import { badRequest } from '../lib/errors';
import { requireAdmin, requireStaff, requireSuperAdmin } from '../middleware/auth';
import * as auth from '../services/auth.service';
import { int, optInt, optNum, optStr } from '../lib/validation';
import { normalizeTz } from '../lib/time';
import { env } from '../config/env';

export const authRouter = Router();

const otpLimiter = rateLimit({ windowMs: 60_000, limit: env.NODE_ENV === 'production' ? 6 : 100, standardHeaders: true, legacyHeaders: false, message: { status: 0, message: 'Too many attempts, try again in a minute.' } });

const phoneBody = z.object({ country_code: z.string().min(1), phone: z.string().min(6) });
const verifyBody = z.object({ country_code: z.string().optional(), phone: z.string().min(6), otp: z.string().min(4).max(8) });

// ── Business owner / admin users ──
authRouter.post('/admin/send-otp', otpLimiter, wrap(async (req, res) => {
  const b = phoneBody.parse(req.body);
  ok(res, await auth.adminSendOtp(b.country_code, b.phone), 'OTP Sent');
}));

authRouter.post('/admin/verify-otp', otpLimiter, wrap(async (req, res) => {
  const b = verifyBody.parse(req.body);
  ok(res, await auth.adminVerifyOtp(b.country_code, b.phone, b.otp), 'You are logged in successfully.');
}));

const registerBody = z.object({
  name: z.string().min(1, 'Your name is required'),
  email: z.string().email('Enter a valid email'),
  business_name: z.string().min(1, 'Business name is required'),
  business_address: optStr,
  street: optStr,
  city: optStr,
  state: optStr,
  country_id: optInt,
  category_id: optInt,
  latitude: optNum,
  longitude: optNum,
  bank_account: optStr,
  salary_duration: optStr,
  shift_hour: optNum,
  shift_name: optStr,
  timezone: optStr,
});

/** Step 2 of registration: the freshly verified owner creates their first business. */
authRouter.post('/admin/register-business', requireAdmin, wrap(async (req, res) => {
  const b = registerBody.parse(req.body);
  const me = req.admin!;
  if (me.user.isSubAdmin) throw badRequest('Sub-admins cannot create businesses');
  await prisma.user.update({ where: { id: me.user.id }, data: { name: b.name, email: b.email } });
  const business = await auth.createBusiness(me.user.id, {
    name: b.business_name,
    businessAddress: b.business_address,
    street: b.street,
    city: b.city,
    state: b.state,
    countryId: b.country_id,
    categoryId: b.category_id,
    latitude: b.latitude,
    longitude: b.longitude,
    bankAccount: b.bank_account,
    salaryDuration: b.salary_duration,
    shiftHour: b.shift_hour,
    shiftName: b.shift_name,
    timezone: b.timezone,
  });
  ok(res, await auth.adminSession(me.user.id, business.id), 'Account successfully created');
}));

authRouter.get('/admin/me', requireAdmin, wrap(async (req, res) => {
  ok(res, await auth.adminSession(req.admin!.user.id, req.admin!.businessId));
}));

authRouter.post('/admin/switch-business', requireAdmin, wrap(async (req, res) => {
  const { business_id } = z.object({ business_id: int }).parse(req.body);
  if (!req.admin!.businessIds.includes(business_id)) throw badRequest('This is not your business');
  ok(res, await auth.adminSession(req.admin!.user.id, business_id));
}));

authRouter.post('/admin/fcm', requireAdmin, wrap(async (req, res) => {
  const { fcm_id } = z.object({ fcm_id: z.string().min(1) }).parse(req.body);
  await prisma.user.update({ where: { id: req.admin!.user.id }, data: { fcmId: fcm_id } });
  ok(res);
}));

authRouter.post('/admin/logout', requireAdmin, wrap(async (req, res) => {
  await prisma.user.update({ where: { id: req.admin!.user.id }, data: { otp: null, otpExpiresAt: null } });
  ok(res, null, 'Logout successfully');
}));

// ── Staff ──
authRouter.post('/staff/send-otp', otpLimiter, wrap(async (req, res) => {
  const b = phoneBody.parse(req.body);
  ok(res, await auth.staffSendOtp(b.country_code, b.phone), 'OTP Sent');
}));

authRouter.post('/staff/verify-otp', otpLimiter, wrap(async (req, res) => {
  const b = verifyBody.parse(req.body);
  ok(res, await auth.staffVerifyOtp(b.country_code, b.phone, b.otp));
}));

authRouter.post('/staff/select-business', wrap(async (req, res) => {
  const b = z.object({ staff_id: int, fcm_id: optStr }).parse(req.body);
  ok(res, await auth.staffSelectBusiness(b.staff_id, b.fcm_id), 'You are logged in successfully.');
}));

authRouter.get('/staff/me', requireStaff, wrap(async (req, res) => {
  ok(res, await auth.staffSession(req.staff!.id));
}));

authRouter.post('/staff/logout', requireStaff, wrap(async (req, res) => {
  await auth.staffLogout(req.staff!);
  ok(res, null, 'Logout successfully');
}));

// ── Super admin ──
authRouter.post('/super-admin/login', otpLimiter, wrap(async (req, res) => {
  const b = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  ok(res, await auth.superAdminLogin(b.email, b.password), 'Logged in');
}));

authRouter.get('/super-admin/me', requireSuperAdmin, wrap(async (req, res) => {
  const a = req.superAdmin!;
  ok(res, { id: a.id, name: a.name, email: a.email });
}));

// ── Reference data ──
authRouter.get('/reference/countries', wrap(async (_req, res) => {
  ok(res, await prisma.country.findMany({ orderBy: { name: 'asc' } }));
}));

authRouter.get('/reference/categories', wrap(async (_req, res) => {
  ok(res, await prisma.businessCategory.findMany({ orderBy: { id: 'asc' } }));
}));

authRouter.get('/reference/timezones', wrap(async (_req, res) => {
  const names = (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone');
  const list = names.map((tz) => {
    const offset = DateTime.now().setZone(normalizeTz(tz)).offset;
    const sign = offset >= 0 ? '+' : '-';
    const a = Math.abs(offset);
    const gmt = `GMT${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
    return { timezone: tz, gmt_offset: gmt, display: `${tz} (${gmt})` };
  });
  if (!list.some((t) => t.timezone === 'UTC')) list.unshift({ timezone: 'UTC', gmt_offset: 'GMT+00:00', display: 'UTC (GMT+00:00)' });
  ok(res, list);
}));

authRouter.get('/reference/shift-types', wrap(async (_req, res) => {
  ok(res, await prisma.shiftType.findMany({ orderBy: { id: 'asc' } }));
}));
