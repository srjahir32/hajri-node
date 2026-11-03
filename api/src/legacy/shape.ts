/**
 * Serializers that reproduce the Laravel/Eloquent JSON the existing React Native apps expect
 * (snake_case relation names, file names instead of URLs, string flags, "HH:MM:SS" times).
 */
import { DateTime } from 'luxon';
import type { Attendance, Business, Department, Staff, StaffBankDetail, StaffDocument, StaffInfo, StaffPhoto, StaffProfile, User, WorkingShift, WorkingShiftUser } from '@prisma/client';
import { fmtDate, secondsToHm, secondsToHms } from '../lib/time';

export const base = (url?: string | null) => (url ? url.split('/').pop() ?? null : null);
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const flag = (b: boolean | null | undefined) => (b ? 1 : 0);
const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;

export type LegacyStaffSource = Staff & {
  department?: Department | null;
  profile?: StaffProfile | null;
  info?: StaffInfo | null;
  bank?: StaffBankDetail | null;
  photos?: StaffPhoto[];
  documents?: StaffDocument[];
  shiftUser?: (WorkingShiftUser & { shift: WorkingShift }) | null;
  business?: Pick<Business, 'id' | 'name' | 'businessAddress'> | null;
};

export function legacyStaff(s: LegacyStaffSource, extra: Record<string, unknown> = {}) {
  return {
    id: s.id,
    is_deactivate: flag(s.isDeactivated),
    deactivate_date: fmtDate(s.deactivatedAt),
    name: s.name,
    email: s.email,
    last_name: s.lastName,
    middle_name: s.middleName,
    phone_number: s.phoneNumber,
    country_code: s.countryCode,
    timezone: s.timezone,
    salary_amount: num(s.salaryAmount),
    salary_cycle: s.salaryCycle,
    department_id: s.departmentId,
    business_id: s.businessId,
    img_bytes: s.imgBytes,
    photo_face: base(s.photoFace),
    is_remote: flag(s.isRemote),
    overtime_rule: flag(s.overtimeRule),
    break_rule: flag(s.breakRule),
    late_entry_rule: flag(s.lateEntryRule),
    early_exit_rule: flag(s.earlyExitRule),
    auto_approve_attendance: flag(s.autoApproveAttendance),
    is_geo_fencing: flag(s.isGeoFencing),
    created_at: iso(s.createdAt),
    updated_at: iso(s.updatedAt),
    staff_photo: (s.photos ?? []).map((p) => ({ id: p.id, staff_id: p.staffId, photo: base(p.url) })),
    staff_bank_detail: s.bank
      ? {
          id: s.bank.id,
          staff_id: s.bank.staffId,
          bank_name: s.bank.bankName,
          account_holder_name: s.bank.accountHolderName,
          account_number: s.bank.accountNumber,
          IFSC_code: s.bank.ifscCode,
          UPI_id: s.bank.upiId,
        }
      : null,
    staff_info: s.info
      ? {
          id: s.info.id,
          staff_id: s.info.staffId,
          date_of_joining: fmtDate(s.info.dateOfJoining),
          designation: s.info.designation,
          UAN_number: s.info.uanNumber,
          ESI_number: s.info.esiNumber,
          PAN_number: s.info.panNumber,
        }
      : null,
    staff_profile: s.profile
      ? {
          id: s.profile.id,
          staff_id: s.profile.staffId,
          date_of_birth: fmtDate(s.profile.dateOfBirth),
          gender: s.profile.gender,
          address1: s.profile.address1,
          address2: s.profile.address2,
          city: s.profile.city,
          state: s.profile.state,
          country_id: s.profile.countryId,
          pincode: s.profile.pincode ? Number(s.profile.pincode) || s.profile.pincode : null,
          latitude: s.profile.latitude ? String(s.profile.latitude) : null,
          longitude: s.profile.longitude ? String(s.profile.longitude) : null,
        }
      : null,
    staff_document: (s.documents ?? []).map((d) => ({ id: d.id, staff_id: d.staffId, documents: base(d.url) })),
    department: s.department ? { id: s.department.id, name: s.department.name } : null,
    working_shift_users: s.shiftUser
      ? {
          id: s.shiftUser.id,
          staff_id: s.shiftUser.staffId,
          working_shift_id: s.shiftUser.workingShiftId,
          working_shift: { id: s.shiftUser.shift.id, business_id: s.shiftUser.shift.businessId, shift_type_id: s.shiftUser.shift.shiftTypeId, name: s.shiftUser.shift.name },
        }
      : null,
    business: s.business ? { id: s.business.id, name: s.business.name, business_address: s.business.businessAddress } : null,
    ...extra,
  };
}

export function legacyBusiness(b: Business & { category?: { id: number; name: string } | null; country?: { id: number; name: string } | null }) {
  return {
    id: b.id,
    name: b.name,
    category_id: b.categoryId,
    business_address: b.businessAddress,
    street: b.street,
    city: b.city,
    state: b.state,
    country_id: b.countryId,
    latitude: b.latitude ? String(b.latitude) : null,
    longitude: b.longitude ? String(b.longitude) : null,
    bank_account: b.bankAccount,
    business_logo: base(b.logoUrl),
    salary_duration: b.salaryDuration,
    salary_calculation: b.salaryCalculation,
    shift_hour: secondsToHms(b.shiftHourSeconds),
    is_active: b.isActive ? 1 : 0,
    category: b.category ?? null,
    country: b.country ?? null,
  };
}

export function legacyUser(
  u: User,
  businesses: (Business & { departments?: (Department & { staff?: Staff[] })[] })[],
  settings: Map<number, { locationUpdateInterval: number | null; locationApiCallInterval: number | null; staffAllowedRadius: number | null; timezone: string | null }> = new Map(),
) {
  return {
    id: u.id,
    is_admin: flag(u.isSubAdmin),
    admin_user_id: u.ownerId,
    name: u.name,
    email: u.email,
    country_code: u.countryCode,
    phone_number: u.phoneNumber,
    is_active: flag(u.isActive),
    trial_ends_at: iso(u.trialEndsAt),
    fcm_id: u.fcmId,
    last_login: iso(u.lastLoginAt),
    created_at: iso(u.createdAt),
    updated_at: iso(u.updatedAt),
    user_photo: u.photoUrl ? { id: u.id, user_id: u.id, photo: u.photoUrl } : null,
    business_user: businesses.map((b, i) => ({
      id: i + 1,
      business_id: b.id,
      user_id: u.ownerId ?? u.id,
      business: legacyBusiness(b),
      system_setting: settings.get(b.id)
        ? {
            business_id: b.id,
            location_update_interval: settings.get(b.id)!.locationUpdateInterval,
            location_api_call_interval: settings.get(b.id)!.locationApiCallInterval,
            staff_allowed_radius: settings.get(b.id)!.staffAllowedRadius,
            timezone: settings.get(b.id)!.timezone,
          }
        : null,
      department: (b.departments ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        business_id: d.businessId,
        department_staff: (d.staff ?? []).map((s) => ({ id: s.id, name: s.name, last_name: s.lastName, department_id: s.departmentId, business_id: s.businessId })),
      })),
    })),
  };
}

const hms = (d: Date | null, tz: string) => (d ? DateTime.fromJSDate(d).setZone(tz).toFormat('HH:mm:ss') : null);

export function legacyAttendanceRow(r: Attendance, tz: string, extra: Record<string, unknown> = {}) {
  return {
    id: r.id,
    staff_id: r.staffId,
    in_time: hms(r.inAt, tz),
    out_time: hms(r.outAt, tz),
    total_time: secondsToHms(r.totalSeconds),
    break_time: r.breakSeconds ? secondsToHms(r.breakSeconds) : null,
    status: r.status,
    behavior: r.behavior,
    date: fmtDate(r.date),
    is_manual: r.isManual ? 1 : 0,
    attendance_status: r.approval,
    latitude: num(r.latitude),
    longitude: num(r.longitude),
    note: r.note,
    ...extra,
  };
}

export const hm = secondsToHm;
