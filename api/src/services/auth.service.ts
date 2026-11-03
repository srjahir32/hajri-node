import crypto from 'node:crypto';
import { DateTime } from 'luxon';
import type { Business, Staff, User } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { badRequest, forbidden, notFound, unauthorized } from '../lib/errors';
import { signToken } from '../lib/jwt';
import { verifyPassword } from '../lib/password';
import { normalizeTz } from '../lib/time';
import { sendOtp } from './comms.service';
import { autoPunchOutOnLogout } from './attendance.service';
import { clearTzCache } from './context.service';
import { trialState } from '../middleware/subscription';

const OTP_VERIFIED_WINDOW_MIN = 15;

export const cleanPhone = (v: string) => v.replace(/\D/g, '').replace(/^0+/, '');
export const cleanCode = (v?: string | null) => (v ? v.replace(/\D/g, '') : '');

const newOtp = () => String(crypto.randomInt(1000, 10000));

function otpMatches(stored: string | null, expires: Date | null, given: string): boolean {
  if (env.OTP_DEV_MODE && given === '1234') return true;
  if (!stored || stored !== given) return false;
  return !expires || expires > new Date();
}

export const userDto = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  country_code: u.countryCode,
  phone_number: u.phoneNumber,
  photo: u.photoUrl,
  is_sub_admin: u.isSubAdmin,
  owner_id: u.ownerId,
  is_active: u.isActive,
  trial_ends_at: u.trialEndsAt?.toISOString() ?? null,
});

export const businessDto = (b: Business & { category?: { id: number; name: string } | null; country?: { id: number; name: string } | null }) => ({
  id: b.id,
  name: b.name,
  business_address: b.businessAddress,
  street: b.street,
  city: b.city,
  state: b.state,
  country_id: b.countryId,
  country: b.country?.name ?? null,
  category_id: b.categoryId,
  category: b.category?.name ?? null,
  latitude: b.latitude ? Number(b.latitude) : null,
  longitude: b.longitude ? Number(b.longitude) : null,
  bank_account: b.bankAccount,
  logo: b.logoUrl,
  salary_duration: b.salaryDuration,
  shift_hour: b.shiftHourSeconds / 3600,
  is_active: b.isActive,
});

// ───────────────────────────── Owner / admin OTP login ─────────────────────────────

export async function adminSendOtp(countryCode: string, phone: string) {
  const code = cleanCode(countryCode);
  const number = cleanPhone(phone);
  if (number.length < 6) throw badRequest('Enter a valid phone number');
  const otp = newOtp();
  const expires = DateTime.now().plus({ minutes: env.OTP_TTL_MINUTES }).toJSDate();

  let user = await prisma.user.findFirst({ where: { phoneNumber: number, countryCode: code, ownerId: null, deletedAt: null } });
  if (user && !user.isActive) throw forbidden('Your account is deactivated, please contact admin.');
  // sub-admins sign in with their own number
  if (!user) user = await prisma.user.findFirst({ where: { phoneNumber: number, countryCode: code, isSubAdmin: true, deletedAt: null } });
  if (user && !user.isActive) throw forbidden('Your account is deactivated, please contact admin.');

  if (user) await prisma.user.update({ where: { id: user.id }, data: { otp, otpExpiresAt: expires } });
  else await prisma.user.create({ data: { countryCode: code, phoneNumber: number, otp, otpExpiresAt: expires } });

  await sendOtp(code, number, otp);
  return { phone: number };
}

export async function adminVerifyOtp(countryCode: string | undefined, phone: string, otp: string) {
  const number = cleanPhone(phone);
  const code = cleanCode(countryCode);
  const candidates = await prisma.user.findMany({
    where: { phoneNumber: number, deletedAt: null, ...(code ? { countryCode: code } : {}) },
    orderBy: { id: 'asc' },
  });
  const user = candidates.find((u) => otpMatches(u.otp, u.otpExpiresAt, otp));
  if (!user) throw badRequest('Please enter correct OTP.');
  if (!user.isActive) throw forbidden('Your account is deactivated, please contact admin.');

  await prisma.user.update({ where: { id: user.id }, data: { otp: null, otpExpiresAt: null, otpVerifiedAt: new Date(), lastLoginAt: new Date() } });
  return adminSession(user.id);
}

/** Build the login payload (token + businesses) for an admin user. */
export async function adminSession(userId: number, businessId?: number) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { role: true } });
  const ownerId = user.isSubAdmin && user.ownerId ? user.ownerId : user.id;
  const links = await prisma.businessUser.findMany({
    where: { userId: ownerId, business: { deletedAt: null } },
    include: { business: { include: { category: true, country: true } } },
    orderBy: { businessId: 'asc' },
  });
  const businesses = links.map((l) => businessDto(l.business));
  const current = businesses.find((b) => b.id === businessId)?.id ?? businesses[0]?.id;
  const token = signToken({ typ: 'user', sub: user.id, bid: current });
  const trial = await trialState(ownerId);
  return {
    token,
    is_register: businesses.length > 0,
    user: userDto(user),
    permissions: user.isSubAdmin ? ((user.role?.permissions as string[]) ?? []) : ['*'],
    businesses,
    current_business_id: current ?? null,
    subscription: {
      trial_expired: trial.expired,
      has_active_subscription: trial.hasActiveSubscription,
      trial_ends_at: trial.trialEndsAt?.toISOString() ?? null,
      message: trial.message ?? null,
      plan: trial.plan?.plan ?? null,
      billing_cycle: trial.plan?.billingCycle ?? null,
      seats: trial.plan?.seats ?? null,
      starts_at: trial.plan?.startsAt?.toISOString() ?? null,
      expires_at: trial.plan?.expiresAt?.toISOString() ?? null,
    },
  };
}

export interface CreateBusinessInput {
  name: string;
  businessAddress?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  countryId?: number | null;
  categoryId?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  bankAccount?: string | null;
  salaryDuration?: string | null;
  shiftHour?: number | null;
  shiftName?: string | null;
  timezone?: string | null;
}

/** Create a business for an owner, with its default shift, settings and (first time) the free trial. */
export async function createBusiness(ownerId: number, input: CreateBusinessInput) {
  const shiftSeconds = Math.round((input.shiftHour ?? 8) * 3600);
  const tz = normalizeTz(input.timezone);
  const business = await prisma.$transaction(async (tx) => {
    const b = await tx.business.create({
      data: {
        name: input.name,
        businessAddress: input.businessAddress,
        street: input.street,
        city: input.city,
        state: input.state,
        countryId: input.countryId ?? null,
        categoryId: input.categoryId ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        bankAccount: input.bankAccount,
        salaryDuration: input.salaryDuration === 'daily' ? 'daily' : 'monthly',
        shiftHourSeconds: shiftSeconds,
      },
    });
    await tx.businessUser.create({ data: { businessId: b.id, userId: ownerId } });
    await tx.systemSetting.create({ data: { businessId: b.id, timezone: tz } });
    await tx.attendanceSetting.create({ data: { businessId: b.id } });
    const shift = await tx.workingShift.create({ data: { businessId: b.id, shiftTypeId: 3, name: input.shiftName || 'Flexible Shift' } });
    await tx.workingShiftDetail.create({ data: { workingShiftId: shift.id, totalPayableSeconds: shiftSeconds } });
    const owner = await tx.user.findUniqueOrThrow({ where: { id: ownerId } });
    if (!owner.trialEndsAt) {
      await tx.user.update({ where: { id: ownerId }, data: { trialEndsAt: DateTime.now().plus({ days: env.FREE_TRIAL_DAYS }).toJSDate() } });
    }
    return b;
  });
  clearTzCache(business.id);
  return business;
}

// ───────────────────────────── Staff OTP login ─────────────────────────────

export async function staffSendOtp(countryCode: string, phone: string) {
  const code = cleanCode(countryCode);
  const number = cleanPhone(phone);
  const matches = await prisma.staff.findMany({ where: { phoneNumber: number, countryCode: code, deletedAt: null } });
  if (!matches.length) throw notFound('Staff not exists.');
  if (matches.every((s) => s.isDeactivated)) throw forbidden('Your account is deactivate please connect business owner.');

  const otp = newOtp();
  const expires = DateTime.now().plus({ minutes: env.OTP_TTL_MINUTES }).toJSDate();
  await prisma.staff.updateMany({ where: { id: { in: matches.map((m) => m.id) } }, data: { otp, otpExpiresAt: expires, otpVerifiedAt: null } });
  await sendOtp(code, number, otp);
  return { phone: number };
}

/** Verify the OTP and return the businesses this phone number works for. */
export async function staffVerifyOtp(countryCode: string | undefined, phone: string, otp: string) {
  const number = cleanPhone(phone);
  const code = cleanCode(countryCode);
  const matches = await prisma.staff.findMany({
    where: { phoneNumber: number, deletedAt: null, isDeactivated: false, ...(code ? { countryCode: code } : {}) },
    include: { business: { select: { id: true, name: true } } },
  });
  const valid = matches.filter((s) => otpMatches(s.otp, s.otpExpiresAt, otp));
  if (!valid.length) throw badRequest('Wrong otp.');
  await prisma.staff.updateMany({ where: { id: { in: valid.map((s) => s.id) } }, data: { otp: null, otpExpiresAt: null, otpVerifiedAt: new Date() } });
  return valid.map((s) => ({ id: s.id, name: s.name, email: s.email, phone_number: s.phoneNumber, business_id: s.businessId, business: s.business }));
}

export const staffDto = (s: Staff & { department?: { id: number; name: string } | null; business?: { id: number; name: string; businessAddress?: string | null } | null; photos?: { url: string }[] }) => ({
  id: s.id,
  name: s.name,
  middle_name: s.middleName,
  last_name: s.lastName,
  email: s.email,
  country_code: s.countryCode,
  phone_number: s.phoneNumber,
  timezone: s.timezone,
  department_id: s.departmentId,
  department: s.department ?? null,
  business_id: s.businessId,
  business: s.business ? { id: s.business.id, name: s.business.name, business_address: s.business.businessAddress ?? null } : null,
  photo: s.photos?.[0]?.url ?? null,
  photo_face: s.photoFace,
  img_bytes: s.imgBytes,
  is_remote: s.isRemote ? 1 : 0,
  is_geo_fencing: s.isGeoFencing ? 1 : 0,
  auto_approve_attendance: s.autoApproveAttendance ? 1 : 0,
  salary_amount: s.salaryAmount ? Number(s.salaryAmount) : null,
  salary_cycle: s.salaryCycle,
});

/** After OTP verification, the staff member chooses a business and receives a token. */
export async function staffSelectBusiness(staffId: number, fcmId?: string | null) {
  const staff = await prisma.staff.findFirst({ where: { id: staffId, deletedAt: null } });
  if (!staff) throw notFound('Staff not found');
  if (staff.isDeactivated) throw forbidden('Your account is deactivate please connect business owner.');
  const verifiedAt = staff.otpVerifiedAt;
  if (!verifiedAt || DateTime.fromJSDate(verifiedAt).plus({ minutes: OTP_VERIFIED_WINDOW_MIN }) < DateTime.now()) {
    throw unauthorized('OTP verification expired, please log in again.');
  }
  await prisma.staff.update({ where: { id: staffId }, data: { otpVerifiedAt: null, ...(fcmId ? { fcmId } : {}) } });
  return staffSession(staffId);
}

export async function staffSession(staffId: number) {
  const staff = await prisma.staff.findUniqueOrThrow({
    where: { id: staffId },
    include: { department: { select: { id: true, name: true } }, business: true, photos: { take: 1, orderBy: { id: 'desc' } }, shiftUser: { include: { shift: true } } },
  });
  const token = signToken({ typ: 'staff', sub: staff.id, bid: staff.businessId });
  const owner = await prisma.businessUser.findFirst({ where: { businessId: staff.businessId, user: { isSubAdmin: false } } });
  const trial = owner ? await trialState(owner.userId) : null;
  return {
    token,
    staff: {
      ...staffDto(staff),
      shift: staff.shiftUser ? { working_shift_id: staff.shiftUser.workingShiftId, name: staff.shiftUser.shift.name, shift_type_id: staff.shiftUser.shift.shiftTypeId } : null,
    },
    subscription: trial ? { trial_expired: trial.expired, message: trial.message ?? null } : null,
  };
}

export async function staffLogout(staff: Staff) {
  await autoPunchOutOnLogout(staff);
  await prisma.staff.update({ where: { id: staff.id }, data: { otp: null, otpVerifiedAt: null, fcmId: null } });
}

// ───────────────────────────── Super admin ─────────────────────────────

export async function superAdminLogin(email: string, password: string) {
  const admin = await prisma.superAdmin.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!admin || !verifyPassword(password, admin.passwordHash)) throw unauthorized('Invalid email or password');
  return {
    token: signToken({ typ: 'super', sub: admin.id }),
    admin: { id: admin.id, name: admin.name, email: admin.email },
  };
}
