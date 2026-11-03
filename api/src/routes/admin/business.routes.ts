import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { ok, wrap } from '../../lib/http';
import { adminBusinessId, can } from '../../middleware/auth';
import { badRequest, forbidden } from '../../lib/errors';
import { fileUrl, folder, removeUploadedFile, upload } from '../../lib/upload';
import { bool, int, num, optBool, optInt, optNum, optStr } from '../../lib/validation';
import { normalizeTz } from '../../lib/time';
import * as auth from '../../services/auth.service';
import * as subs from '../../services/subscription.service';
import { clearTzCache } from '../../services/context.service';

/** Business profile, PF, attendance/live-location/radius/timezone settings and the owner's account. */
export const businessRouter = Router();

const businessWithRefs = (id: number) => prisma.business.findUniqueOrThrow({ where: { id }, include: { category: true, country: true } });

businessRouter.get('/business', wrap(async (req, res) => {
  ok(res, auth.businessDto(await businessWithRefs(adminBusinessId(req))));
}));

const businessBody = z.object({
  name: z.string().trim().min(1, 'Business name is required'),
  business_address: optStr,
  street: optStr,
  city: optStr,
  state: optStr,
  country_id: optInt,
  category_id: optInt,
  latitude: optNum,
  longitude: optNum,
  bank_account: optStr,
  salary_duration: z.enum(['hourly', 'daily', 'monthly']).optional(),
  shift_hour: optNum,
});

businessRouter.put('/business', can('view_setting'), wrap(async (req, res) => {
  const id = adminBusinessId(req);
  const b = businessBody.partial().parse(req.body);
  await prisma.business.update({
    where: { id },
    data: {
      ...(b.name !== undefined ? { name: b.name } : {}),
      ...(b.business_address !== undefined ? { businessAddress: b.business_address } : {}),
      ...(b.street !== undefined ? { street: b.street } : {}),
      ...(b.city !== undefined ? { city: b.city } : {}),
      ...(b.state !== undefined ? { state: b.state } : {}),
      ...(b.country_id !== undefined ? { countryId: b.country_id } : {}),
      ...(b.category_id !== undefined ? { categoryId: b.category_id } : {}),
      ...(b.latitude !== undefined ? { latitude: b.latitude } : {}),
      ...(b.longitude !== undefined ? { longitude: b.longitude } : {}),
      ...(b.bank_account !== undefined ? { bankAccount: b.bank_account } : {}),
      ...(b.salary_duration !== undefined ? { salaryDuration: b.salary_duration } : {}),
      ...(b.shift_hour !== undefined ? { shiftHourSeconds: Math.round(b.shift_hour * 3600) } : {}),
    },
  });
  ok(res, auth.businessDto(await businessWithRefs(id)), 'Business edit successfully');
}));

businessRouter.post('/business/logo', can('view_setting'), folder('logos'), upload.single('logo'), wrap(async (req, res) => {
  if (!req.file) throw badRequest('Choose an image');
  const id = adminBusinessId(req);
  const old = await prisma.business.findUnique({ where: { id }, select: { logoUrl: true } });
  const url = fileUrl(req.file);
  await prisma.business.update({ where: { id }, data: { logoUrl: url } });
  removeUploadedFile(old?.logoUrl);
  ok(res, { logo: url }, 'Logo updated');
}));

/** Add another business under the same owner. */
businessRouter.post('/businesses', wrap(async (req, res) => {
  const a = req.admin!;
  if (a.user.isSubAdmin) throw forbidden('Only the business owner can add businesses');
  const b = businessBody.extend({ timezone: optStr, shift_name: optStr }).parse(req.body);
  const created = await auth.createBusiness(a.ownerId, {
    name: b.name,
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
  ok(res, await auth.adminSession(a.user.id, created.id), 'Business added');
}));

// ── PF ──
const pfBody = z.object({
  is_enabled: bool,
  employee_percentage: num.pipe(z.number().min(0).max(100)),
  employer_eps_percentage: num.pipe(z.number().min(0).max(100)),
  employer_epf_percentage: num.pipe(z.number().min(0).max(100)),
  capped_amount: optInt,
});

businessRouter.get('/pf', can('view_setting'), wrap(async (req, res) => {
  const pf = await prisma.businessPf.findUnique({ where: { businessId: adminBusinessId(req) } });
  ok(res, {
    is_enabled: pf?.isEnabled ?? false,
    employee_percentage: Number(pf?.employeePercentage ?? 12),
    employer_eps_percentage: Number(pf?.employerEpsPercentage ?? 8.33),
    employer_epf_percentage: Number(pf?.employerEpfPercentage ?? 3.67),
    capped_amount: pf?.cappedAmount ?? null,
  });
}));

businessRouter.put('/pf', can('view_setting'), wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const b = pfBody.parse(req.body);
  const data = {
    isEnabled: b.is_enabled,
    employeePercentage: b.employee_percentage,
    employerEpsPercentage: b.employer_eps_percentage,
    employerEpfPercentage: b.employer_epf_percentage,
    cappedAmount: b.capped_amount ?? null,
  };
  await prisma.businessPf.upsert({ where: { businessId }, create: { businessId, ...data }, update: data });
  ok(res, null, 'PF settings saved');
}));

/** Everything the Settings landing page summarises (counts, current values, plan) in one round-trip. */
businessRouter.get('/settings/overview', can('view_setting'), wrap(async (req, res) => {
  const a = req.admin!;
  const businessId = adminBusinessId(req);
  const [biz, businesses, departments, pf, holidayPolicies, weekly, leavePolicies, shifts, att, roles, sys, sub] = await Promise.all([
    businessWithRefs(businessId),
    prisma.businessUser.count({ where: { userId: a.ownerId } }),
    prisma.department.count({ where: { deletedAt: null, OR: [{ businessId }, { businessId: null }] } }),
    prisma.businessPf.findUnique({ where: { businessId } }),
    prisma.holidayPolicy.count({ where: { businessId } }),
    prisma.weeklyHolidayBusiness.count({ where: { businessId } }),
    prisma.leavePolicy.count({ where: { businessId } }),
    prisma.workingShift.count({ where: { businessId, deletedAt: null } }),
    prisma.attendanceSetting.findUnique({ where: { businessId } }),
    prisma.role.count({ where: { businessId } }),
    prisma.systemSetting.findUnique({ where: { businessId } }),
    subs.overview(a.ownerId, businessId),
  ]);
  ok(res, {
    user: auth.userDto(a.user),
    business: auth.businessDto(biz),
    businesses,
    departments,
    pf_enabled: pf?.isEnabled ?? false,
    holiday_policies: holidayPolicies,
    weekly_holidays: weekly,
    leave_policies: leavePolicies,
    shifts,
    punch_in_time_tolerance: att?.punchInTimeTolerance ?? null,
    roles,
    staff_allowed_radius: sys?.staffAllowedRadius ?? null,
    timezone: sys?.timezone ?? null,
    subscription: { ...sub, transactions: await subs.transactions(a.owner, { name: biz.name, businessAddress: biz.businessAddress }) },
  });
}));

// ── small settings ──
businessRouter.get('/settings', can('view_setting'), wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const [sys, att] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { businessId } }),
    prisma.attendanceSetting.findUnique({ where: { businessId } }),
  ]);
  ok(res, {
    punch_in_time_tolerance: att?.punchInTimeTolerance ?? 30,
    location_update_interval: sys?.locationUpdateInterval ?? 600,
    location_api_call_interval: sys?.locationApiCallInterval ?? 600,
    staff_allowed_radius: sys?.staffAllowedRadius ?? 100,
    timezone: sys?.timezone ?? 'UTC',
  });
}));

businessRouter.put('/settings', can('view_setting'), wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const b = z
    .object({
      punch_in_time_tolerance: optInt,
      location_update_interval: optInt,
      location_api_call_interval: optInt,
      staff_allowed_radius: optInt,
      timezone: optStr,
    })
    .parse(req.body);
  if (b.punch_in_time_tolerance !== undefined) {
    await prisma.attendanceSetting.upsert({ where: { businessId }, create: { businessId, punchInTimeTolerance: b.punch_in_time_tolerance }, update: { punchInTimeTolerance: b.punch_in_time_tolerance } });
  }
  const sys = {
    ...(b.location_update_interval !== undefined ? { locationUpdateInterval: b.location_update_interval } : {}),
    ...(b.location_api_call_interval !== undefined ? { locationApiCallInterval: b.location_api_call_interval } : {}),
    ...(b.staff_allowed_radius !== undefined ? { staffAllowedRadius: b.staff_allowed_radius } : {}),
    ...(b.timezone ? { timezone: normalizeTz(b.timezone) } : {}),
  };
  if (Object.keys(sys).length) {
    await prisma.systemSetting.upsert({ where: { businessId }, create: { businessId, ...sys }, update: sys });
    clearTzCache(businessId);
  }
  ok(res, null, 'Settings saved');
}));

// ── owner account ──
businessRouter.get('/account', wrap(async (req, res) => {
  ok(res, auth.userDto(req.admin!.user));
}));

businessRouter.put('/account', folder('avatars'), upload.single('photo'), wrap(async (req, res) => {
  const b = z.object({ name: optStr, email: z.preprocess((v) => (v === '' ? undefined : v), z.string().email().optional()) }).parse(req.body);
  const user = req.admin!.user;
  const photoUrl = req.file ? fileUrl(req.file) : undefined;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { ...(b.name ? { name: b.name } : {}), ...(b.email ? { email: b.email } : {}), ...(photoUrl ? { photoUrl } : {}) },
  });
  if (photoUrl) removeUploadedFile(user.photoUrl);
  ok(res, auth.userDto(updated), 'Profile updated');
}));

businessRouter.delete('/account', wrap(async (req, res) => {
  const a = req.admin!;
  if (a.user.isSubAdmin) throw forbidden('Only the business owner can delete the account');
  const links = await prisma.businessUser.findMany({ where: { userId: a.user.id }, select: { businessId: true } });
  const ids = links.map((l) => l.businessId);
  await prisma.$transaction([
    prisma.staff.updateMany({ where: { businessId: { in: ids } }, data: { deletedAt: new Date(), isDeactivated: true } }),
    prisma.business.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date(), isActive: false } }),
    prisma.user.updateMany({ where: { OR: [{ id: a.user.id }, { ownerId: a.user.id }] }, data: { deletedAt: new Date(), isActive: false } }),
  ]);
  ok(res, null, 'Account deleted');
}));

export const _unused = [int, optBool];
