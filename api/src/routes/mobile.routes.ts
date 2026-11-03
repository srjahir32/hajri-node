/**
 * Drop-in replacement for the Laravel `routes/api.php` consumed by the two React Native apps
 * (mounted at /api). Endpoint names, request fields and response shapes mirror the old API;
 * the business logic is shared with the /api/v1 REST API through the services.
 *
 * Differences by design (security fixes): staff/owner ids in request bodies are checked against the
 * authenticated account, punch times come from the server clock, and OTPs expire.
 */
import { Router, type ErrorRequestHandler, type Request } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { DateTime } from 'luxon';
import { z, ZodError } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { wrap } from '../lib/http';
import { HttpError, badRequest, forbidden, notFound, unauthorized } from '../lib/errors';
import { signToken } from '../lib/jwt';
import { requireAdmin, requireStaff } from '../middleware/auth';
import { checkSubscription, trialState } from '../middleware/subscription';
import { dateOnly, fmtDate, localToUtc, normalizeTz, secondsToHms, todayIn, daysInMonth, hmsToSeconds } from '../lib/time';
import { fileUrl, folder, upload } from '../lib/upload';
import * as auth from '../services/auth.service';
import * as att from '../services/attendance.service';
import * as leaves from '../services/leave.service';
import * as staffSvc from '../services/staff.service';
import { businessTz, checkHoliday, clearTzCache, staffTz } from '../services/context.service';
import { legacyAttendanceRow, legacyBusiness, legacyStaff, legacyUser, base, hm } from '../legacy/shape';
import { UPLOAD_ROOT } from '../lib/upload';
import { notificationRouter } from './admin/notification.routes';

export const mobileRouter = Router();

// ───────────────────────────── helpers ─────────────────────────────

/** Laravel returned HTTP 200 + {status:0,message} for validation/business errors; keep that contract. */
const legacyErrors: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof ZodError) return void res.status(200).json({ status: 0, message: err.issues[0]?.message ?? 'Invalid input' });
  if (err instanceof HttpError) {
    if (err.status === 403 && err.extra?.is_expired) {
      return void res.status(403).json({ status: false, message: err.message, is_expired: true });
    }
    if ([400, 404, 409, 422].includes(err.status)) return void res.status(200).json({ status: 0, message: err.message, ...err.extra });
  }
  next(err);
};

const s = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : String(v));
const n = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));
const must = <T>(v: T | undefined, message: string): T => {
  if (v === undefined || v === null || (v as unknown) === '') throw badRequest(message);
  return v;
};

/** Parse "d M Y", "dd/MM/yyyy", ISO… into YYYY-MM-DD. */
function flexDate(v: unknown): string | undefined {
  const t = s(v);
  if (!t) return undefined;
  for (const f of ['yyyy-MM-dd', "yyyy-MM-dd'T'HH:mm:ss.SSSZ", 'd MMM yyyy', 'dd MMM yyyy', 'd MMMM yyyy', 'dd/MM/yyyy', 'd/M/yyyy', 'dd-MM-yyyy', 'MM/dd/yyyy']) {
    const dt = DateTime.fromFormat(t.slice(0, 40), f);
    if (dt.isValid) return dt.toISODate()!;
  }
  const iso = DateTime.fromISO(t);
  return iso.isValid ? iso.toISODate()! : undefined;
}

const ok1 = (res: import('express').Response, extra: Record<string, unknown> = {}, message = 'success') => res.json({ message, status: '1', ...extra });

function ownerBusiness(req: Request, requested?: unknown): number {
  const a = req.admin!;
  const id = n(requested) ?? a.businessId;
  if (!id || !a.businessIds.includes(id)) throw badRequest('This is not your business');
  return id;
}

const bearerFor = (res: import('express').Response, token: string) => {
  res.setHeader('Authorization', `Bearer ${token}`);
  res.setHeader('Access-Control-Expose-Headers', 'Authorization');
};

async function loadLegacyUser(userId: number, onlyBusinessId?: number) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const ownerId = u.isSubAdmin && u.ownerId ? u.ownerId : u.id;
  const links = await prisma.businessUser.findMany({
    where: { userId: ownerId, business: { deletedAt: null }, ...(onlyBusinessId ? { businessId: onlyBusinessId } : {}) },
    include: {
      business: {
        include: {
          category: true,
          country: true,
          systemSetting: true,
          departments: { where: { deletedAt: null }, include: { staff: { where: { deletedAt: null, isDeactivated: false } } } },
        },
      },
    },
    orderBy: { businessId: 'asc' },
  });
  const settings = new Map(links.filter((l) => l.business.systemSetting).map((l) => [l.businessId, l.business.systemSetting!]));
  return legacyUser(u, links.map((l) => l.business), settings);
}

const staffInclude = {
  department: true,
  profile: true,
  info: true,
  bank: true,
  photos: { orderBy: { id: 'desc' as const } },
  documents: true,
  shiftUser: { include: { shift: true } },
  business: { select: { id: true, name: true, businessAddress: true } },
} satisfies Prisma.StaffInclude;

// ───────────────────────────── public: owner auth ─────────────────────────────

mobileRouter.post('/login', wrap(async (req, res) => {
  const b = z.object({ phone: z.string().min(1, 'The phone field is required.'), country_code: z.preprocess(s, z.string({ message: 'The country code field is required.' })) }).parse(req.body);
  const out = await auth.adminSendOtp(b.country_code, b.phone);
  res.json({ message: 'OTP Sent', status: 1, data: out });
}));

mobileRouter.post('/verify_otp', wrap(async (req, res) => {
  const b = z.object({ phone: z.string().min(1, 'The phone field is required.'), otp: z.preprocess(s, z.string({ message: 'The otp field is required.' })), country_code: z.string().optional() }).parse(req.body);
  const session = await auth.adminVerifyOtp(b.country_code, b.phone, b.otp);
  const data = await loadLegacyUser(session.user.id);
  if (session.is_register) {
    bearerFor(res, session.token);
    return void res.json({ message: 'You are logged in successfully.', is_register: 1, status: '1', data: { ...data, token: session.token } });
  }
  res.json({ message: 'You are logged in successfully.', is_register: 0, status: '1', data });
}));

mobileRouter.post('/add_business', wrap(async (req, res) => {
  const b = req.body ?? {};
  let userId: number | undefined;
  const header = req.headers.authorization;
  if (header) {
    await new Promise<void>((resolve, reject) => requireAdmin(req, res, (e) => (e ? reject(e) : resolve())));
    userId = req.admin!.user.id;
  } else {
    userId = n(b.user_id);
    const u = userId ? await prisma.user.findFirst({ where: { id: userId, deletedAt: null } }) : null;
    const fresh = u?.otpVerifiedAt && DateTime.fromJSDate(u.otpVerifiedAt).plus({ minutes: 15 }) > DateTime.now();
    if (!u || !fresh) throw unauthorized('OTP verification expired, please log in again.');
  }
  must(s(b.name), 'The name field is required.');
  must(s(b.email), 'The email field is required.');
  must(s(b.business_name), 'The business name field is required.');
  await prisma.user.update({ where: { id: userId! }, data: { name: s(b.name), email: s(b.email) } });
  const business = await auth.createBusiness(userId!, {
    name: s(b.business_name)!,
    businessAddress: s(b.business_address),
    street: s(b.street),
    city: s(b.city),
    state: s(b.state),
    countryId: n(b.country_id),
    categoryId: n(b.category_id),
    bankAccount: s(b.bank_account),
    salaryDuration: s(b.salary_calculation),
    shiftHour: n(b.shift_hour) ?? 8,
    shiftName: s(b.shift_name),
    timezone: s(b.timezone),
  });
  const token = signToken({ typ: 'user', sub: userId!, bid: business.id });
  bearerFor(res, token);
  res.json({ message: 'Account successfully created', status: '1', data: { ...(await loadLegacyUser(userId!)), token } });
}));

// ───────────────────────────── public: staff auth ─────────────────────────────

mobileRouter.post('/staff_login', wrap(async (req, res) => {
  const b = z.object({ phone: z.string().min(1, 'The phone field is required.'), country_code: z.preprocess(s, z.string({ message: 'The country code field is required.' })) }).parse(req.body);
  res.json({ message: 'OTP Sent', status: 1, data: await auth.staffSendOtp(b.country_code, b.phone) });
}));

mobileRouter.post('/staff_verify_otp', wrap(async (req, res) => {
  const b = z.object({ phone: z.string().min(1), otp: z.preprocess(s, z.string({ message: 'The otp field is required.' })) }).parse(req.body);
  const list = await auth.staffVerifyOtp(undefined, b.phone, b.otp);
  ok1(res, { data: list.map((x) => ({ id: x.id, name: x.name, email: x.email, phone_number: x.phone_number, business_id: x.business_id, business: x.business })) });
}));

mobileRouter.post('/set_business', wrap(async (req, res) => {
  const staffId = must(n(req.body?.staff_id), 'The staff id field is required.');
  const session = await auth.staffSelectBusiness(staffId, s(req.body?.fcm_id));
  const staff = await prisma.staff.findUniqueOrThrow({ where: { id: staffId }, include: staffInclude });
  bearerFor(res, session.token);
  res.json({ message: 'You are logged in successfully.', is_register: 1, status: '1', data: { ...legacyStaff(staff), token: session.token } });
}));

mobileRouter.post('/get_country', wrap(async (_req, res) => ok1(res, { data: await prisma.country.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }) })));
mobileRouter.post('/get_category', wrap(async (_req, res) => ok1(res, { data: await prisma.businessCategory.findMany({ select: { id: true, name: true } }) })));
mobileRouter.post('/get_timezones', wrap(async (_req, res) => {
  const names = (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone');
  const data = names.map((tz) => {
    const off = DateTime.now().setZone(tz).offset;
    const a = Math.abs(off);
    const gmt = `GMT${off >= 0 ? '+' : '-'}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
    return { timezone: tz, gmt_offset: gmt, display: `${tz} (${gmt})` };
  });
  ok1(res, { data });
}));

// legacy licence-key file (kept for the owner app's device-licence check)
const LICENSE_FILE = path.resolve(process.cwd(), 'license_keys.json');
mobileRouter.get('/license_keys', (_req, res) => {
  res.json(fs.existsSync(LICENSE_FILE) ? JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8')) : []);
});
mobileRouter.post('/license_keys_approve', wrap(async (req, res) => {
  const b = req.body ?? {};
  must(s(b.license_key), 'The license key field is required.');
  must(s(b.phone_no), 'The phone no field is required.');
  must(s(b.device_id), 'The device id field is required.');
  if (!fs.existsSync(LICENSE_FILE)) return void res.json({ message: 'license_keys.json file not found', status: 0 });
  const keys = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8')) as Record<string, unknown>[];
  const item = keys.find((k) => k.license_key === b.license_key);
  if (!item) return void res.json({ message: 'Invalid license key', status: 0 });
  if (item.is_approve === 1) {
    return void res.json(item.device_id === b.device_id ? { message: 'License key already approved', status: 1, data: item } : { message: 'License key already used on another device', status: 0 });
  }
  Object.assign(item, { phone_no: b.phone_no, device_id: b.device_id, is_approve: 1, approved_at: new Date().toISOString() });
  fs.writeFileSync(LICENSE_FILE, JSON.stringify(keys, null, 2));
  res.json({ message: 'License key approved successfully', status: 1, data: item });
}));

// ───────────────────────────── owner (auth:api) ─────────────────────────────

type Handler = import('express').RequestHandler;
const ownerAuth: Handler[] = [requireAdmin, checkSubscription];
/** Registers a route behind owner (auth:api) authentication. */
const owner = {
  post: (p: string, ...h: Handler[]) => mobileRouter.post(p, ...ownerAuth, ...h),
  get: (p: string, ...h: Handler[]) => mobileRouter.get(p, ...ownerAuth, ...h),
};

owner.post('/edit_business', wrap(async (req, res) => {
  const b = req.body ?? {};
  const id = ownerBusiness(req, b.business_id);
  await prisma.business.update({
    where: { id },
    data: {
      ...(s(b.business_name) ? { name: s(b.business_name) } : {}),
      businessAddress: s(b.business_address) ?? null,
      bankAccount: s(b.bank_account) ?? null,
      street: s(b.street) ?? null,
      city: s(b.city) ?? null,
      state: s(b.state) ?? null,
      countryId: n(b.country_id) ?? null,
      categoryId: n(b.category_id) ?? null,
      ...(s(b.salary_duration) ? { salaryDuration: s(b.salary_duration) === 'daily' ? 'daily' : 'monthly' } : {}),
    },
  });
  await prisma.user.update({ where: { id: req.admin!.user.id }, data: { ...(s(b.name) ? { name: s(b.name) } : {}), ...(s(b.email) ? { email: s(b.email) } : {}) } });
  res.json({ message: 'Business edit successfully', status: 1, data: await loadLegacyUser(req.admin!.user.id) });
}));

owner.post('/get_user', wrap(async (req, res) => {
  const bid = ownerBusiness(req, req.body?.business_id);
  ok1(res, { data: await loadLegacyUser(req.admin!.user.id, bid) });
}));

owner.get('/logout', wrap(async (req, res) => {
  await prisma.user.update({ where: { id: req.admin!.user.id }, data: { otp: null, otpExpiresAt: null } });
  ok1(res, {}, 'Logout successfully');
}));

owner.post('/delete_user', wrap(async (req, res) => {
  const a = req.admin!;
  if (a.user.isSubAdmin) throw forbidden('Only the business owner can delete the account');
  const ids = a.businessIds;
  await prisma.$transaction([
    prisma.staff.updateMany({ where: { businessId: { in: ids } }, data: { deletedAt: new Date(), isDeactivated: true } }),
    prisma.business.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date(), isActive: false } }),
    prisma.user.updateMany({ where: { OR: [{ id: a.user.id }, { ownerId: a.user.id }] }, data: { deletedAt: new Date(), isActive: false } }),
  ]);
  ok1(res, {}, 'Delete business user successfully');
}));

// ── staff ──
owner.post('/get_staff', wrap(async (req, res) => {
  const bid = ownerBusiness(req, req.body?.business_id);
  const tz = await businessTz(bid);
  const today = todayIn(tz);
  const search = s(req.body?.search);
  const departmentId = n(req.body?.department_id);
  const page = Math.max(1, n(req.body?.page) ?? 1);
  const perPage = 10;

  const day = await att.listDay(bid, { date: today });
  const where: Prisma.StaffWhereInput = {
    businessId: bid,
    deletedAt: null,
    isDeactivated: false,
    ...(departmentId ? { departmentId } : {}),
    ...(search ? { OR: [{ name: { contains: search } }, { department: { name: { contains: search } } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.staff.count({ where }),
    prisma.staff.findMany({ where, include: staffInclude, orderBy: { name: 'asc' }, skip: (page - 1) * perPage, take: perPage }),
  ]);
  if (!rows.length) return void res.json({ message: 'fail', status: '0', data: [] });
  const byId = new Map(day.data.map((d) => [d.id, d]));
  const data = rows.map((r) => {
    const d = byId.get(r.id);
    const status = !d || d.status === 'Holiday' || d.status === 'Leave' ? (d?.is_leave ? 'Not Marked' : 'Not Marked') : d.status === 'Pending' ? 'Absent' : d.status;
    return legacyStaff(r, { is_leave: d?.is_leave ?? 0, status });
  });
  res.json({
    message: 'success',
    status: '1',
    staff_count: day.counts.staff_count,
    present_count: day.counts.present_count,
    absent_count: day.counts.absent_count,
    halfday_count: day.counts.halfday_count,
    late_staff_count: day.counts.late_count,
    data,
    current_page: page,
    last_page: Math.max(1, Math.ceil(total / perPage)),
    total,
  });
}));

const photoFields = upload.fields([
  { name: 'photo', maxCount: 5 },
  { name: 'photo[]', maxCount: 5 },
  { name: 'upload_idently_documents', maxCount: 5 },
  { name: 'upload_idently_documents[]', maxCount: 5 },
  { name: 'photo_face', maxCount: 1 },
]);

owner.post('/add_edit_staff', folder('staff'), photoFields, wrap(async (req, res) => {
  const b = req.body ?? {};
  const bid = ownerBusiness(req, b.business_id);
  for (const [k, msg] of [['name', 'name'], ['country_code', 'country code'], ['phone_number', 'phone number'], ['salary_cycle', 'salary cycle'], ['business_id', 'business id'], ['department_id', 'department id']] as const) {
    must(s(b[k]), `The ${msg} field is required.`);
  }
  const f = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
  const files = {
    photos: [...(f.photo ?? []), ...(f['photo[]'] ?? [])].map(fileUrl),
    documents: [...(f.upload_idently_documents ?? []), ...(f['upload_idently_documents[]'] ?? [])].map((d) => ({ url: fileUrl(d), name: d.originalname })),
    photoFace: f.photo_face?.[0] ? fileUrl(f.photo_face[0]) : undefined,
  };
  const body = staffSvc.staffBody.parse({
    ...b,
    date_of_birth: flexDate(b.date_of_birth),
    date_of_joining: flexDate(b.date_of_joining),
    email: s(b.email),
    img_bytes: typeof b.img_bytes === 'string' ? b.img_bytes : b.img_bytes ? JSON.stringify(b.img_bytes) : undefined,
  });
  const id = n(b.id);
  try {
    if (!id) {
      const created = await staffSvc.createStaff(bid, body, files, req.admin!.user.id);
      const full = await prisma.staff.findUniqueOrThrow({ where: { id: created.id }, include: staffInclude });
      return void ok1(res, { data: [legacyStaff(full)] }, 'Insert successfully');
    }
    const updated = await staffSvc.updateStaff(bid, id, body, files, req.admin!.user.id);
    const full = await prisma.staff.findUniqueOrThrow({ where: { id: updated.id }, include: staffInclude });
    ok1(res, { data: [legacyStaff(full)] }, 'update successfully');
  } catch (e) {
    if (e instanceof HttpError && e.status === 409) return void res.json({ message: e.message, status: 2 });
    throw e;
  }
}));

owner.post('/delete_staff', wrap(async (req, res) => {
  const id = must(n(req.body?.id), 'The id field is required.');
  const bid = ownerBusiness(req, req.body?.business_id);
  const c = await staffSvc.deleteStaff(bid, [id]);
  if (!c) throw badRequest('Something is wrong.');
  ok1(res, {}, 'Delete successfully');
}));

// ── departments ──
owner.post('/get_department', wrap(async (req, res) => {
  const bid = ownerBusiness(req, must(req.body?.business_id, 'The business id field is required.'));
  const rows = await prisma.department.findMany({
    where: { deletedAt: null, OR: [{ businessId: bid }, { businessId: null }] },
    include: { staff: { where: { businessId: bid, deletedAt: null } } },
    orderBy: { name: 'asc' },
  });
  ok1(res, {
    data: rows.map((d) => ({
      id: d.id,
      name: d.name,
      business_id: d.businessId,
      staff: d.staff.map((x) => ({ id: x.id, name: x.name, last_name: x.lastName, department_id: x.departmentId, business_id: x.businessId, is_deactivate: x.isDeactivated ? 1 : 0 })),
    })),
  });
}));

owner.post('/add_edit_department', wrap(async (req, res) => {
  const name = must(s(req.body?.name), 'The name field is required.');
  const bid = ownerBusiness(req, must(req.body?.business_id, 'The business id field is required.'));
  const id = n(req.body?.id);
  const dup = await prisma.department.findFirst({ where: { name, deletedAt: null, OR: [{ businessId: bid }, { businessId: null }], ...(id ? { id: { not: id } } : {}) } });
  if (dup) return void res.json({ message: 'Department name already exists.', status: id ? 0 : 2 });
  if (!id) {
    const d = await prisma.department.create({ data: { name, businessId: bid } });
    return void ok1(res, { data: [{ id: d.id, name: d.name, business_id: d.businessId }] }, 'Insert successfully');
  }
  const r = await prisma.department.updateMany({ where: { id, businessId: bid }, data: { name } });
  if (!r.count) throw badRequest('Something is wrong.');
  ok1(res, {}, 'Update successfully');
}));

owner.post('/delete_department', wrap(async (req, res) => {
  const id = must(n(req.body?.id), 'The id field is required.');
  const bid = ownerBusiness(req);
  const dep = await prisma.department.findFirst({ where: { id, businessId: bid, deletedAt: null } });
  if (!dep) throw badRequest('Something is wrong.');
  await prisma.$transaction([prisma.staff.updateMany({ where: { departmentId: id }, data: { departmentId: null } }), prisma.department.update({ where: { id }, data: { deletedAt: new Date() } })]);
  ok1(res, {}, 'Delete successfully');
}));

// ── attendance (owner side) ──
owner.post('/get_attendance', wrap(async (req, res) => {
  const date = must(s(req.body?.date), 'The date field is required.').slice(0, 10);
  const bid = ownerBusiness(req, req.body?.business_id);
  const day = await att.listDay(bid, { date, search: s(req.body?.search) });
  const staff = await prisma.staff.findMany({ where: { id: { in: day.data.map((d) => d.id) } }, include: staffInclude });
  const tz = await businessTz(bid);
  const rows = await prisma.attendance.findMany({ where: { staffId: { in: staff.map((x) => x.id) }, date: dateOnly(date), deletedAt: null }, orderBy: { id: 'asc' } });
  const byId = new Map(day.data.map((d) => [d.id, d]));
  const data = staff.map((st) => {
    const d = byId.get(st.id);
    const mine = rows.filter((r) => r.staffId === st.id);
    const status = !d || d.status === 'Holiday' || d.status === 'Leave' ? 'Not Marked' : d.status === 'Pending' ? 'Absent' : d.status;
    return legacyStaff(st, {
      is_leave: d?.is_leave ?? 0,
      status,
      attendance: mine.map((r) => legacyAttendanceRow(r, tz)),
    });
  });
  res.json({
    message: 'success',
    status: '1',
    count: { present_count: day.counts.present_count, absent_count: day.counts.absent_count, halfday_count: day.counts.halfday_count, staff_count: day.counts.staff_count },
    data,
  });
}));

/** Owner marks a staff member present (toggle punch), absent or half day. */
owner.post('/add_attendance', wrap(async (req, res) => {
  const b = req.body ?? {};
  const staffId = must(n(b.staff_id), 'The staff id field is required.');
  const status = must(n(b.status), 'The status field is required.');
  const date = must(s(b.date), 'The date field is required.').slice(0, 10);
  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: { in: req.admin!.businessIds }, deletedAt: null } });
  if (!staff) throw badRequest('Staff not found');
  if (staff.isDeactivated) return void res.json({ message: 'This staff is deactivated.', status: '0' });
  const byId = req.admin!.user.id;
  if (status === 2) {
    await att.setDayStatus(staff.businessId, staffId, date, 'Absent', byId);
    return void ok1(res);
  }
  if (status === 3) {
    await att.setDayStatus(staff.businessId, staffId, date, 'Half Day', byId);
    return void ok1(res);
  }
  const tz = await staffTz(staff);
  const time = s(b.time);
  const at = time ? localToUtc(date, time.length === 5 ? `${time}:00` : time, s(b.timezone) ?? tz) : new Date();
  const out = await att.punch(staff, { at, latitude: n(b.latitude), longitude: n(b.longitude) });
  res.json({ message: 'success', status: 1, action: out.action, punch_in_time: out.punch_in_time, punch_out_time: out.punch_out_time });
}));

owner.post('/get_all_attendance', wrap(async (req, res) => {
  const staffId = must(n(req.body?.staff_id), 'The staff id field is required.');
  const from = must(s(req.body?.start_date), 'The start date field is required.').slice(0, 10);
  const to = must(s(req.body?.end_date), 'The end date field is required.').slice(0, 10);
  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: { in: req.admin!.businessIds }, deletedAt: null }, include: { department: true, photos: { take: 1 } } });
  if (!staff) throw badRequest('Staff not found');
  const tz = await staffTz(staff);
  const rows = await prisma.attendance.findMany({ where: { staffId, deletedAt: null, date: { gte: dateOnly(from), lte: dateOnly(to) } }, orderBy: [{ date: 'asc' }, { id: 'asc' }] });
  const days = new Map<string, typeof rows>();
  for (const r of rows) days.set(fmtDate(r.date)!, [...(days.get(fmtDate(r.date)!) ?? []), r]);
  const data = [...days.entries()].map(([date, list]) => {
    const sum = att.summarizeDay(date, list, tz);
    const first = list[0];
    return {
      id: first.id,
      staff_id: staff.id,
      name: staff.name,
      department: staff.department?.name ?? null,
      photo: staff.photos[0]?.url ?? null,
      date: DateTime.fromISO(date).toFormat('dd LLL yyyy'),
      total_time: `${Math.floor(sum.total_seconds / 3600)}h ${Math.floor((sum.total_seconds % 3600) / 60)}m`,
      status: sum.status === 'Pending' ? 'Absent' : sum.status,
      note: sum.note ?? '-',
      overtime: sum.overtime_seconds ? hm(sum.overtime_seconds) : null,
      fine: null,
    };
  });
  res.json({ status: 1, message: 'success', staff_is_remote: staff.isRemote ? 1 : 0, data });
}));

owner.post('/get_shift', wrap(async (req, res) => {
  const bid = ownerBusiness(req, must(req.body?.business_id, 'The business id field is required.'));
  const shifts = await prisma.workingShift.findMany({ where: { businessId: bid, deletedAt: null }, include: { type: true }, orderBy: { id: 'asc' } });
  ok1(res, { working_shift: shifts.map((w) => ({ id: w.id, business_id: w.businessId, shift_type_id: w.shiftTypeId, name: w.name, working_type: { id: w.type.id, name: w.type.name, description: w.type.description } })) });
}));

owner.post('/months_attendance_chart', wrap(async (req, res) => {
  const start = must(s(req.body?.start_month), 'The start month field is required.');
  const bid = ownerBusiness(req, must(req.body?.business_id, 'The business id field is required.'));
  const dt = DateTime.fromISO(start.length === 7 ? `${start}-01` : start.slice(0, 10));
  const dates = daysInMonth(dt.year, dt.month);
  const rows = await prisma.attendance.findMany({
    where: { deletedAt: null, approval: 1, date: { gte: dateOnly(dates[0]), lte: dateOnly(dates[dates.length - 1]) }, staff: { businessId: bid, isDeactivated: false, deletedAt: null } },
    select: { staffId: true, date: true, status: true },
  });
  const series = (status: string) =>
    dates.map((d) => ({ day: String(Number(d.slice(8))), count: new Set(rows.filter((r) => r.status === status && fmtDate(r.date) === d).map((r) => r.staffId)).size }));
  res.json({
    message: 'success',
    status: '1',
    present_statusData: series('Present'),
    absent_statusData: series('Absent'),
    halfday_statusData: series('Half Day'),
    filteredMonths: dates.map((d) => String(Number(d.slice(8)))),
  });
}));

owner.post('/staff_records', wrap(async (req, res) => {
  const bid = ownerBusiness(req, must(req.body?.business_id, 'The business id field is required.'));
  const tz = await businessTz(bid);
  const today = todayIn(tz);
  const day = await att.listDay(bid, { date: today });
  const staff = await prisma.staff.findMany({ where: { id: { in: day.data.map((d) => d.id) } }, include: { department: true } });
  const attendanceFor = async (pred: (d: (typeof day.data)[number]) => boolean) => {
    const ids = day.data.filter(pred).slice(0, 5).map((d) => d.id);
    const rows = await prisma.attendance.findMany({ where: { staffId: { in: ids }, date: dateOnly(today), deletedAt: null }, orderBy: { id: 'desc' } });
    const seen = new Set<number>();
    return rows.filter((r) => (seen.has(r.staffId) ? false : seen.add(r.staffId))).map((r) => {
      const st = staff.find((x) => x.id === r.staffId)!;
      return { ...legacyAttendanceRow(r, tz), staff: [{ id: st.id, name: st.name, last_name: st.lastName, department: st.department ? { id: st.department.id, name: st.department.name } : null }] };
    });
  };
  const departments = await prisma.department.findMany({ where: { deletedAt: null, OR: [{ businessId: bid }, { businessId: null }] }, take: 5 });
  const holidays = await prisma.holidayList.findMany({ where: { policy: { businessId: bid }, date: { gte: dateOnly(today) } }, orderBy: { date: 'asc' } });
  res.json({
    message: 'success',
    status: '1',
    present_staff: await attendanceFor((d) => d.status === 'Present'),
    absent_staff: await attendanceFor((d) => d.status === 'Absent'),
    half_leave: await attendanceFor((d) => d.status === 'Half Day'),
    department_wise_late_count: departments.map((d) => ({ id: d.id, name: d.name, late_count: day.data.filter((x) => x.department_id === d.id && x.behavior === 'Late').length })),
    holiday: holidays.map((h) => ({ id: h.id, template_id: h.policyId, holiday_name: h.name, holiday_date: DateTime.fromJSDate(h.date, { zone: 'utc' }).toFormat('dd LLL yyyy | EEE') })),
  });
}));

// ── live location (owner views) ──
async function livePoints(staffIds: number[], date: string, businessId?: number) {
  return prisma.liveLocation.findMany({
    where: { staffId: { in: staffIds }, date: dateOnly(date), ...(businessId ? { businessId } : {}) },
    include: { staff: { include: { photos: { take: 1 } } } },
  });
}
const shapePoints = (points: unknown, tz: string) =>
  ((Array.isArray(points) ? points : []) as Record<string, any>[]).map((p) => {
    const iso = p.timestamp ?? (p.time ? `${p.date}T${p.time}Z` : null);
    const dt = iso ? DateTime.fromISO(String(iso), { zone: 'utc' }).setZone(tz) : null;
    return { ...p, ...(dt ? { time: dt.toFormat('HH:mm:ss'), formatted_time: dt.toFormat('h:mm a'), date: dt.toFormat('yyyy-MM-dd') } : {}) };
  });

owner.post('/get_live_location', wrap(async (req, res) => {
  const bid = ownerBusiness(req, req.body?.business_id);
  const tz = normalizeTz(s(req.body?.timezone) ?? s(req.body?.tz) ?? (await businessTz(bid)));
  const date = (s(req.body?.current_day) ?? s(req.body?.date) ?? todayIn(tz)).slice(0, 10);
  const staff = await prisma.staff.findMany({ where: { businessId: bid, isDeactivated: false, deletedAt: null }, select: { id: true } });
  const rows = await livePoints(staff.map((x) => x.id), date, bid);
  const locations = rows.flatMap((r) => {
    const pts = shapePoints(r.points, tz);
    if (!pts.length) return [];
    const last = { ...pts[pts.length - 1], staff_name: [r.staff.name, r.staff.lastName].filter(Boolean).join(' '), staff_image: r.staff.photos[0]?.url ?? null };
    return [{ staff_id: r.staffId, last_location: last, last_2_locations: pts.slice(-2), all_locations: pts }];
  });
  ok1(res, { locations });
}));

owner.post('/get_staff_live_location', wrap(async (req, res) => {
  const staffId = must(n(req.body?.staff_id), 'The staff id field is required.');
  const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: { in: req.admin!.businessIds } } });
  if (!staff) throw badRequest('Staff not found');
  const tz = normalizeTz(s(req.body?.timezone) ?? s(req.body?.tz) ?? (await staffTz(staff)));
  const date = (s(req.body?.date) ?? s(req.body?.current_day) ?? todayIn(tz)).slice(0, 10);
  const [row] = await livePoints([staffId], date);
  ok1(res, { locations: row ? shapePoints(row.points, tz) : [] });
}));

// ── notifications (owner) ──
const dtoN = (x: { id: number; userId: number | null; staffId: number | null; title: string; message: string | null; action: string | null; actionId: number | null; isRead: boolean; createdAt: Date }) => ({
  id: x.id,
  user_id: x.userId,
  staff_id: x.staffId,
  title: x.title,
  message: x.message,
  action: x.action,
  action_id: x.actionId,
  is_read: x.isRead ? 0 : 1,
  created_at: x.createdAt.toISOString(),
});

async function paged(where: Prisma.NotificationWhereInput, req: Request, res: import('express').Response) {
  const page = Math.max(1, n(req.body?.page) ?? 1);
  const perPage = Math.min(100, n(req.body?.per_page) ?? 10);
  const [total, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({ where, orderBy: { id: 'desc' }, skip: (page - 1) * perPage, take: perPage }),
  ]);
  res.json({ status: 1, message: 'Success', data: rows.map(dtoN), pagination: { current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage, total } });
}

owner.post('/notifications', wrap((req, res) => paged({ userId: req.admin!.user.id }, req, res)));
owner.post('/read_notification', wrap(async (req, res) => {
  const id = must(n(req.body?.notification_id), 'The notification id field is required.');
  await prisma.notification.updateMany({ where: { id, userId: req.admin!.user.id }, data: { isRead: true } });
  res.json({ message: 'success', status: 1 });
}));
owner.post('/mark_as_read', wrap(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.admin!.user.id, isRead: false }, data: { isRead: true } });
  res.json({ message: 'success', status: 1 });
}));

owner.post('/check_holiday', wrap(async (req, res) => {
  const date = must(s(req.body?.date), 'The date field is required.').slice(0, 10);
  const bid = ownerBusiness(req);
  const h = await checkHoliday(bid, date);
  res.json({ status: 1, date, is_holiday: h.isHoliday ? 1 : 0, holiday_type: h.type, message: h.isHoliday ? 'Holiday' : 'Working Day' });
}));

owner.post('/add_edit_timezone', wrap(async (req, res) => {
  const tz = must(s(req.body?.timezone), 'The timezone field is required.');
  const bid = ownerBusiness(req, must(req.body?.business_id, 'The business id field is required.'));
  await prisma.systemSetting.upsert({ where: { businessId: bid }, create: { businessId: bid, timezone: normalizeTz(tz) }, update: { timezone: normalizeTz(tz) } });
  clearTzCache(bid);
  res.json({ message: 'success', status: 1 });
}));

// ───────────────────────────── staff (auth:staff-api) ─────────────────────────────

const staffAuth: Handler[] = [requireStaff, checkSubscription];
/** Registers a route behind staff (auth:staff-api) authentication. */
const staffApi = {
  post: (p: string, ...h: Handler[]) => mobileRouter.post(p, ...staffAuth, ...h),
  get: (p: string, ...h: Handler[]) => mobileRouter.get(p, ...staffAuth, ...h),
};

/** The mobile app passes staff_id everywhere; it must be the logged-in staff member. */
const me = (req: Request, given?: unknown) => {
  const id = n(given);
  if (id && id !== req.staff!.id) throw forbidden('You can only access your own data');
  return req.staff!;
};

const staffBusinesses = wrap(async (req, res) => {
  const list = await prisma.staff.findMany({ where: { phoneNumber: req.staff!.phoneNumber, deletedAt: null, isDeactivated: false }, include: { business: { select: { id: true, name: true } } } });
  ok1(res, { data: list.map((x) => ({ id: x.id, name: x.name, email: x.email, phone_number: x.phoneNumber, business_id: x.businessId, business: x.business })) });
});
staffApi.post('/staff_businesses', staffBusinesses);
staffApi.post('/staff_company', staffBusinesses);

staffApi.get('/staff-logout', wrap(async (req, res) => {
  await auth.staffLogout(req.staff!);
  ok1(res, {}, 'Logout successfully');
}));

staffApi.post('/get_staff_data', wrap(async (req, res) => {
  const st = me(req, req.body?.staff_id);
  const full = await prisma.staff.findUniqueOrThrow({ where: { id: st.id }, include: staffInclude });
  ok1(res, { data: legacyStaff(full) });
}));

staffApi.post('/edit_staff_info', wrap(async (req, res) => {
  const st = me(req, req.body?.staff_id);
  const b = req.body ?? {};
  const u = await prisma.staff.update({
    where: { id: st.id },
    data: { name: s(b.name) ?? st.name, middleName: s(b.middle_name) ?? null, lastName: s(b.last_name) ?? null, email: s(b.email) ?? null },
  });
  ok1(res, { data: { id: u.id, name: u.name, middle_name: u.middleName, last_name: u.lastName, email: u.email, phone_number: u.phoneNumber } });
}));

/** Punch in/out. The server clock is authoritative (the `time` field of the old API is ignored). */
staffApi.post('/add_staff_attendance', wrap(async (req, res) => {
  const b = req.body ?? {};
  const st = me(req, must(b.staff_id, 'The staff id field is required.'));
  const status = n(b.status) ?? 1;
  if (status !== 1) throw badRequest('Only staff punch-in/out is supported from this endpoint');
  const out = await att.punch(st, { latitude: n(b.latitude), longitude: n(b.longitude), accuracy: n(b.accuracy) });
  res.json({ message: 'success', status: 1, action: out.action, punch_in_time: out.punch_in_time, punch_out_time: out.punch_out_time });
}));

staffApi.post('/add_staff_attendance_new', wrap(async (req, res) => {
  const b = req.body ?? {};
  const st = req.staff!;
  const punchIn = must(s(b.punch_in), 'The punch in field is required.');
  const punchOut = must(s(b.punch_out), 'The punch out field is required.');
  const reason = must(s(b.reason), 'The reason field is required.');
  const tz = await staffTz(st);
  const parse = (v: string) => (/([zZ]|[+-]\d{2}:?\d{2})$/.test(v) ? new Date(v) : DateTime.fromISO(v.replace(' ', 'T'), { zone: tz }).toUTC().toJSDate());
  try {
    await att.submitAttendanceRequest(st, { punchIn: parse(punchIn), punchOut: parse(punchOut), reason });
    res.json({ status: 1, message: 'Attendance request submitted successfully.' });
  } catch (e) {
    if (e instanceof HttpError) return void res.json({ status: 0, message: e.message });
    res.json({ status: 0, message: 'Something went wrong. Please try again.' });
  }
}));

staffApi.post('/get_last_attendance', wrap(async (req, res) => {
  const st = me(req, req.body?.staff_id);
  const tz = await staffTz(st);
  const date = (s(req.body?.date) ?? todayIn(tz)).slice(0, 10);
  const last = await prisma.attendance.findFirst({ where: { staffId: st.id, date: dateOnly(date), deletedAt: null }, orderBy: { id: 'desc' } });
  if (!last) return void res.json({ message: 'Something is wrong.', status: 0 });
  ok1(res, { data: legacyAttendanceRow(last, tz) });
}));

async function requestsFor(req: Request, res: import('express').Response) {
  const st = me(req, req.body?.staff_id);
  const tz = await staffTz(st);
  const statusFilter = req.body?.status !== undefined && req.body.status !== 'all' && req.body.status !== null ? n(req.body.status) : undefined;
  const reqs = await prisma.attendanceRequest.findMany({
    where: { staffId: st.id, attendance: { deletedAt: null, ...(statusFilter !== undefined ? { approval: statusFilter } : {}) } },
    include: { attendance: true },
  });
  const rows = reqs.map((r) => r.attendance).sort((a, b) => b.date.getTime() - a.date.getTime());
  const photo = await prisma.staffPhoto.findFirst({ where: { staffId: st.id }, orderBy: { id: 'desc' } });
  res.json({ message: 'success', status: 1, data: rows.map((r) => legacyAttendanceRow(r, tz, { staff_photo: photo ? { id: photo.id, staff_id: st.id, photo: base(photo.url) } : null })) });
}
staffApi.post('/get_attendance_request_new', wrap((req, res) => requestsFor(req, res)));
staffApi.post('/get_attendance_request', wrap(async (req, res) => {
  const st = me(req, req.body?.staff_id);
  const tz = await staffTz(st);
  const date = s(req.body?.date)?.slice(0, 10);
  const rows = await prisma.attendance.findMany({ where: { staffId: st.id, isManual: true, deletedAt: null, ...(date ? { date: dateOnly(date) } : {}) } });
  ok1(res, { data: rows.map((r) => ({ id: r.id, staff_id: r.staffId, in_time: legacyAttendanceRow(r, tz).in_time, status: r.status, attendance_status: r.approval })) });
}));

staffApi.post('/get_staff_attendance', wrap(async (req, res) => {
  const b = req.body ?? {};
  const st = me(req, must(b.staff_id, 'The staff id field is required.'));
  const month = must(n(b.month), 'The month field is required.');
  const year = must(n(b.year), 'The year field is required.');
  const tz = await staffTz(st);
  const dates = daysInMonth(year, month);
  const [rows, leaveRows] = await Promise.all([
    prisma.attendance.findMany({ where: { staffId: st.id, deletedAt: null, date: { gte: dateOnly(dates[0]), lte: dateOnly(dates[dates.length - 1]) } }, orderBy: [{ date: 'desc' }, { id: 'asc' }] }),
    prisma.staffLeave.findMany({ where: { staffId: st.id, status: 1, deletedAt: null, startDate: { lte: dateOnly(dates[dates.length - 1]) }, endDate: { gte: dateOnly(dates[0]) } } }),
  ]);
  const cal = await att.monthCalendar(st, year, month);
  const overtimeByDate = new Map(cal.days.map((d) => [d.date, d.overtime_seconds]));
  const attendance = rows.map((r) => {
    const date = fmtDate(r.date)!;
    const ot = overtimeByDate.get(date) ?? 0;
    const onLeave = leaveRows.some((l) => fmtDate(l.startDate)! <= date && fmtDate(l.endDate)! >= date);
    return legacyAttendanceRow(r, tz, { overtime: ot ? hm(ot) : null, fine: null, is_leave: onLeave ? 1 : 0 });
  });
  res.json({
    message: 'success',
    status: '1',
    count: { present_count: cal.count.present_count, absent_count: cal.count.absent_count, halfday_count: cal.count.halfday_count, leave: cal.count.leave, fine: cal.count.fine, overtime: cal.count.overtime },
    attendance,
  });
}));

staffApi.post('/staff_leave_attendance', wrap(async (req, res) => {
  const b = req.body ?? {};
  const st = me(req, must(b.staff_id, 'The staff id field is required.'));
  must(s(b.is_paid), 'The is paid field is required.');
  const leaveType = must(s(b.leave_type), 'The leave type field is required.');
  const reason = must(s(b.reason), 'The reason field is required.');
  const start = must(flexDate(b.start_date), 'The start date field is required.');
  const end = must(flexDate(b.end_date), 'The end date field is required.');
  const isPaid = String(b.is_paid);
  const leave = await leaves.applyLeave({
    staffId: st.id,
    leaveType: leaveType === 'Half Day' ? 'Half Day' : 'Full Day',
    shiftType: s(b.shift_type) === 'Last Half' ? 'Last Half' : s(b.shift_type) === 'First Half' ? 'First Half' : null,
    isUnpaid: isPaid === '1',
    leavePolicyId: isPaid !== '1' && Number(isPaid) > 0 ? Number(isPaid) : undefined,
    reason,
    startDate: start,
    endDate: end,
  });
  res.json({ message: 'success', status: 1, data: { staff_id: leave.staffId, is_paid: isPaid, leave_type: leave.leaveType, shift_type: leave.shiftType, reason: leave.reason, start_date: start, end_date: end, status: leave.status } });
}));

staffApi.post('/staff_applied_leave', wrap(async (req, res) => {
  const b = req.body ?? {};
  const st = me(req, b.staff_id);
  const month = n(b.month);
  const year = n(b.year);
  const rows = await prisma.staffLeave.findMany({
    where: {
      staffId: st.id,
      deletedAt: null,
      ...(year && month ? { createdAt: { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) } } : {}),
    },
    orderBy: { id: 'desc' },
  });
  const photo = await prisma.staffPhoto.findFirst({ where: { staffId: st.id }, orderBy: { id: 'desc' } });
  ok1(res, {
    data: rows.map((l) => ({
      id: l.id,
      staff_id: l.staffId,
      leave_type: l.leaveType,
      start_date: fmtDate(l.startDate),
      end_date: fmtDate(l.endDate),
      requested_date: DateTime.fromJSDate(l.createdAt).toFormat('dd LLL yyyy'),
      updated_date: DateTime.fromJSDate(l.updatedAt).toFormat('yyyy-MM-dd'),
      status: l.status,
      apply_status: ['Pending', 'Approve', 'Rejected'][l.status],
      staff: { id: st.id, name: st.name, last_name: st.lastName, business_id: st.businessId },
      staff_photo: photo ? { id: photo.id, staff_id: st.id, photo: base(photo.url) } : null,
    })),
  });
}));

staffApi.post('/get_staff_leave_cards', wrap(async (req, res) => {
  const st = me(req, must(req.body?.staff_id, 'The staff id field is required.'));
  res.json({ message: 'Staff leave cards retrieved successfully', status: 1, data: await leaves.leaveCards(st.id) });
}));

staffApi.post('/staff_holiday_list', wrap(async (req, res) => {
  const st = req.staff!;
  const policies = await prisma.holidayPolicy.findMany({ where: { businessId: st.businessId }, include: { holidays: { orderBy: { date: 'asc' } } } });
  ok1(res, {
    data: policies.map((p) => ({
      id: p.id,
      business_id: p.businessId,
      name: p.name,
      shift_start_time: `Jan ${p.year}`,
      shift_end_time: `Dec ${p.year}`,
      holiday_list: p.holidays.map((h) => ({ id: h.id, template_id: h.policyId, holiday_name: h.name, holiday_date: DateTime.fromJSDate(h.date, { zone: 'utc' }).toFormat('dd LLL yyyy | EEE') })),
    })),
  });
}));

staffApi.post('/live_location', wrap(async (req, res) => {
  const b = req.body ?? {};
  const st = me(req, b.staff_id);
  const tz = await staffTz(st);
  const date = (s(b.date) ?? todayIn(tz)).slice(0, 10);
  const last = await prisma.attendance.findFirst({ where: { staffId: st.id, date: dateOnly(date), deletedAt: null }, orderBy: { id: 'desc' } });
  if (last?.outAt) return void res.json({ message: 'Live location off', status: '2' });
  const location = Array.isArray(b.location) ? (b.location as Record<string, unknown>[]).filter((x) => x && typeof x === 'object') : [];
  if (location.length) await att.appendLiveLocations(st, date, location);
  res.json({ message: 'success', status: 1 });
}));

staffApi.post('/get_live_location_count', wrap(async (req, res) => {
  const st = me(req, req.body?.staff_id);
  const date = (s(req.body?.date) ?? todayIn(await staffTz(st))).slice(0, 10);
  const row = await prisma.liveLocation.findUnique({ where: { staffId_date: { staffId: st.id, date: dateOnly(date) } } });
  res.json({ message: 'success', status: 1, count: Array.isArray(row?.points) ? (row!.points as unknown[]).length : 0 });
}));

staffApi.post('/live_location_setting', wrap(async (req, res) => {
  const bid = n(req.body?.business_id) ?? req.staff!.businessId;
  if (bid !== req.staff!.businessId) throw forbidden('Not your business');
  const s2 = await prisma.systemSetting.findUnique({ where: { businessId: bid } });
  res.json({ message: s2 ? 'Success' : 'Settings not found for this business. Using defaults.', status: 1, data: { location_update_interval: s2?.locationUpdateInterval ?? 600, location_api_call_interval: s2?.locationApiCallInterval ?? 600 } });
}));

staffApi.post('/notification_list', wrap((req, res) => paged({ staffId: req.staff!.id }, req, res)));
staffApi.post('/staff_read_notification', wrap(async (req, res) => {
  const id = must(n(req.body?.notification_id), 'The notification id field is required.');
  await prisma.notification.updateMany({ where: { id, staffId: req.staff!.id }, data: { isRead: true } });
  res.json({ message: 'success', status: 1 });
}));
staffApi.post('/staff_mark_as_read', wrap(async (req, res) => {
  await prisma.notification.updateMany({ where: { staffId: req.staff!.id, isRead: false }, data: { isRead: true } });
  res.json({ message: 'success', status: 1 });
}));
staffApi.post('/staff_add_edit_timezone', wrap(async (req, res) => {
  const tz = must(s(req.body?.timezone), 'The timezone field is required.');
  await prisma.staff.update({ where: { id: req.staff!.id }, data: { timezone: normalizeTz(tz) } });
  res.json({ message: 'success', status: 1 });
}));

mobileRouter.use(legacyErrors);

/** Static aliases so file names stored by the old API resolve (e.g. /assets/admin/images/staff_photos/abc.jpg). */
export function legacyAssetAliases(app: import('express').Express, express: typeof import('express')) {
  const dir = path.join(UPLOAD_ROOT, 'staff');
  for (const p of ['staff_photos', 'staff_photo_face', 'staff_document', 'map_photos']) {
    app.use(`/assets/admin/images/${p}`, express.static(dir, { index: false, maxAge: '7d' }));
  }
}

export const _unused = [hmsToSeconds, secondsToHms, notFound, legacyBusiness, trialState, notificationRouter];
