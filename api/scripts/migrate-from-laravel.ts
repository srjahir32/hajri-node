/**
 * One-off data migration: legacy Laravel (hajri-laravel) MySQL database  →  this API's schema.
 *
 *   LARAVEL_DATABASE_URL="mysql://user:pass@host:3306/hajri" \
 *   DATABASE_URL="mysql://user:pass@host:3306/hajri_node" \
 *   npx tsx scripts/migrate-from-laravel.ts [--wipe] [--assets <laravel>/public] [--dry-run]
 *
 *  --wipe      delete everything in the target database first (otherwise it must be empty)
 *  --assets    copy staff photos / documents / business logos from the Laravel `public/` folder into ./uploads
 *  --dry-run   read + convert everything and print the counts without writing
 *
 * IDs are preserved. Things that are intentionally NOT migrated: OAuth/Sanctum tokens, OTPs, the activity-log
 * table, queued jobs, base64 profile images, and super-admin accounts (bcrypt hashes are not compatible —
 * run `npm run db:seed` to create the super admin).
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { DateTime } from 'luxon';
import { Prisma, PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const DRY = flag('--dry-run');

const legacyUrl = process.env.LARAVEL_DATABASE_URL;
if (!legacyUrl) {
  console.error('Set LARAVEL_DATABASE_URL to the old Laravel database.');
  process.exit(1);
}

const prisma = new PrismaClient();
const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

type Row = Record<string, any>;
const report: Record<string, { read: number; written: number; skipped: number }> = {};

// ───────────── helpers ─────────────

const str = (v: unknown) => (v === null || v === undefined || v === '' ? null : String(v));
const int = (v: unknown) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Math.trunc(Number(v)));
const num = (v: unknown) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const bool = (v: unknown) => v === 1 || v === true || v === '1';
const date = (v: unknown): Date | null => (v ? new Date(v as string | Date) : null);
const dateOnly = (v: unknown): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};
/** legacy `date` columns come back as local JS dates from mysql2; build YYYY-MM-DD without timezone drift */
const ymd = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  const d = v as Date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const secs = (t: unknown): number => {
  if (!t) return 0;
  const [h = 0, m = 0, s = 0] = String(t).split(':').map((x) => Number(x) || 0);
  return h * 3600 + m * 60 + s;
};
const hhmm = (t: unknown) => (t ? String(t).split(':').slice(0, 3).map((x) => x.padStart(2, '0')).join(':').padEnd(8, ':00').slice(0, 8) : null);
const tzOf = (v: unknown) => {
  const t = str(v);
  if (!t) return null;
  const z = t === 'Asia/Calcutta' ? 'Asia/Kolkata' : t;
  return DateTime.local().setZone(z).isValid ? z : null;
};
const json = (v: unknown): any => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return null;
  }
};
const assetUrl = (folder: string, file: unknown) => (file ? `${API_URL}/uploads/${folder}/${String(file).split('/').pop()}` : null);

async function chunked<T>(rows: T[], size: number, fn: (c: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

async function load(name: string, table: string, rows: Row[], map: (r: Row) => any | null, write: (data: any[]) => Promise<unknown>) {
  const data: any[] = [];
  let skipped = 0;
  for (const r of rows) {
    const m = map(r);
    if (m === null) skipped++;
    else data.push(m);
  }
  report[name] = { read: rows.length, written: data.length, skipped };
  if (!DRY && data.length) await chunked(data, 1000, write);
  void table;
}

// ───────────── main ─────────────

async function main() {
  const db = await mysql.createConnection({ uri: legacyUrl, dateStrings: ['TIME'] as any, timezone: 'Z' });
  const q = async (sql: string): Promise<Row[]> => {
    try {
      const [rows] = await db.query(sql);
      return rows as Row[];
    } catch (e: any) {
      if (e.code === 'ER_NO_SUCH_TABLE') return [];
      throw e;
    }
  };

  // --- target must be empty (or --wipe) ---
  const existing = await prisma.user.count();
  if (existing > 0 && !flag('--wipe') && !DRY) {
    console.error(`The target database already contains ${existing} users. Re-run with --wipe to replace its contents.`);
    process.exit(1);
  }
  if (flag('--wipe') && !DRY) {
    console.log('Wiping target database…');
    const tables = (await prisma.$queryRaw<{ t: string }[]>`SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()`).map((r) => r.t).filter((t) => !t.startsWith('_prisma'));
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of tables) await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``);
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
    // reference data the API needs
    await prisma.shiftType.createMany({
      data: [
        { id: 1, name: 'Fixed Shift', description: 'Same working hours every day' },
        { id: 2, name: 'Rotational Shift', description: 'Rotate between several shifts daily, weekly or monthly' },
        { id: 3, name: 'Flexible Shift', description: 'Work a set number of hours at any time of the day' },
      ],
      skipDuplicates: true,
    });
  }

  // --- read everything we need up-front ---
  const [users, businesses, businessUsers, settings, attSettings, pfs, countriesL, categories] = await Promise.all([
    q('SELECT * FROM users WHERE deleted_at IS NULL'),
    q('SELECT * FROM businesses WHERE deleted_at IS NULL'),
    q('SELECT * FROM business_users WHERE deleted_at IS NULL'),
    q('SELECT * FROM system_settings WHERE deleted_at IS NULL'),
    q('SELECT * FROM attendance_settings WHERE deleted_at IS NULL'),
    q('SELECT * FROM business_pfs WHERE deleted_at IS NULL'),
    q('SELECT * FROM countries'),
    q('SELECT * FROM business_categories'),
  ]);
  const tzByBusiness = new Map<number, string>(settings.map((s) => [s.business_id, tzOf(s.timezone) ?? 'UTC']));

  // ── reference data ──
  await load('countries', 'Country', countriesL, (r) => ({ id: r.id, name: r.name }), (d) => prisma.country.createMany({ data: d, skipDuplicates: true }));
  await load('business_categories', 'BusinessCategory', categories, (r) => ({ id: r.id, name: r.name }), (d) => prisma.businessCategory.createMany({ data: d, skipDuplicates: true }));

  // ── businesses ──
  const businessIds = new Set(businesses.map((b) => b.id as number));
  const countryIds = new Set(countriesL.map((c) => c.id as number));
  const categoryIds = new Set(categories.map((c) => c.id as number));
  await load('businesses', 'Business', businesses, (b) => ({
    id: b.id,
    name: b.name,
    categoryId: categoryIds.has(b.category_id) ? b.category_id : null,
    businessAddress: str(b.business_address),
    street: str(b.street),
    city: str(b.city),
    state: str(b.state),
    countryId: countryIds.has(b.country_id) ? b.country_id : null,
    latitude: num(b.latitude),
    longitude: num(b.longitude),
    bankAccount: str(b.bank_account),
    logoUrl: assetUrl('logos', b.business_logo),
    salaryDuration: b.salary_duration === 'daily' ? 'daily' : 'monthly',
    salaryCalculation: str(b.salary_calculation),
    shiftHourSeconds: secs(b.shift_hour) || 28800,
    isActive: b.is_active === null ? true : bool(b.is_active),
    createdAt: date(b.created_at) ?? new Date(),
  }), (d) => prisma.business.createMany({ data: d, skipDuplicates: true }));

  // ── roles (spatie) → Role.permissions ──
  const [roles, perms, rolePerms, modelRoles] = await Promise.all([q('SELECT * FROM roles'), q('SELECT * FROM permissions'), q('SELECT * FROM role_has_permissions'), q("SELECT * FROM model_has_roles WHERE model_type LIKE '%User'")]);
  const permName = new Map<number, string>(perms.map((p) => [Number(p.id), p.name]));
  const permsOfRole = new Map<number, string[]>();
  for (const rp of rolePerms) permsOfRole.set(Number(rp.role_id), [...(permsOfRole.get(Number(rp.role_id)) ?? []), permName.get(Number(rp.permission_id)) ?? ''].filter(Boolean));

  // ── users ──
  const userRoleLegacy = new Map<number, number>(modelRoles.map((m) => [Number(m.model_id), Number(m.role_id)]));
  const ownerFirstBusiness = new Map<number, number>();
  for (const bu of businessUsers) if (!ownerFirstBusiness.has(bu.user_id) && businessIds.has(bu.business_id)) ownerFirstBusiness.set(bu.user_id, bu.business_id);

  const newRoles: { id: number; businessId: number | null; name: string; permissions: string[] }[] = [];
  const roleKey = new Map<string, number>(); // "businessId|name" → new role id
  let nextRoleId = Math.max(0, ...roles.map((r) => Number(r.id))) + 1;
  for (const r of roles) {
    if (r.business_id && businessIds.has(r.business_id)) {
      newRoles.push({ id: Number(r.id), businessId: r.business_id, name: r.name, permissions: permsOfRole.get(Number(r.id)) ?? [] });
      roleKey.set(`${r.business_id}|${r.name}`, Number(r.id));
    }
  }
  const legacyRoleById = new Map<number, Row>(roles.map((r) => [Number(r.id), r]));
  const roleForUser = (u: Row): number | null => {
    if (!bool(u.is_admin)) return null; // owners have full access
    const lr = legacyRoleById.get(userRoleLegacy.get(u.id) ?? -1);
    if (!lr) return null;
    if (lr.business_id && businessIds.has(lr.business_id)) return Number(lr.id);
    // a global role (business_id NULL): give this owner their own copy
    const bid = ownerFirstBusiness.get(u.admin_user_id);
    if (!bid) return null;
    const key = `${bid}|${lr.name}`;
    if (!roleKey.has(key)) {
      const id = nextRoleId++;
      roleKey.set(key, id);
      newRoles.push({ id, businessId: bid, name: lr.name, permissions: permsOfRole.get(Number(lr.id)) ?? [] });
    }
    return roleKey.get(key)!;
  };

  const userRows = users.map((u) => ({ u, roleId: roleForUser(u) }));
  const userIds = new Set(users.map((u) => u.id as number));
  // roles must exist before users that reference them
  report.roles = { read: roles.length, written: newRoles.length, skipped: roles.length - newRoles.length };
  if (!DRY && newRoles.length) await prisma.role.createMany({ data: newRoles.map((r) => ({ ...r, permissions: r.permissions as Prisma.InputJsonValue })), skipDuplicates: true });

  // sub-admins reference their owner → insert owners first
  const ordered = [...userRows].sort((a, b) => Number(bool(a.u.is_admin)) - Number(bool(b.u.is_admin)));
  await load('users', 'User', ordered.map((x) => ({ ...x.u, __role: x.roleId })), (u) => ({
    id: u.id,
    isSubAdmin: bool(u.is_admin),
    ownerId: bool(u.is_admin) && userIds.has(u.admin_user_id) ? u.admin_user_id : null,
    roleId: u.__role,
    name: str(u.name),
    email: str(u.email),
    countryCode: str(u.country_code),
    phoneNumber: String(u.phone_number ?? ''),
    isActive: u.is_active === null ? true : bool(u.is_active),
    trialEndsAt: date(u.trial_ends_at),
    fcmId: str(u.fcm_id),
    lastLoginAt: date(u.last_login),
    createdAt: date(u.created_at) ?? new Date(),
  }), (d) => prisma.user.createMany({ data: d, skipDuplicates: true }));

  await load('business_users', 'BusinessUser', businessUsers, (r) => (businessIds.has(r.business_id) && userIds.has(r.user_id) ? { id: r.id, businessId: r.business_id, userId: r.user_id } : null), (d) => prisma.businessUser.createMany({ data: d, skipDuplicates: true }));
  await load('system_settings', 'SystemSetting', settings, (r) => (businessIds.has(r.business_id) ? { businessId: r.business_id, locationUpdateInterval: int(r.location_update_interval), locationApiCallInterval: int(r.location_api_call_interval), staffAllowedRadius: int(r.staff_allowed_radius), timezone: tzOf(r.timezone) ?? 'UTC' } : null), (d) => prisma.systemSetting.createMany({ data: d, skipDuplicates: true }));
  await load('attendance_settings', 'AttendanceSetting', attSettings, (r) => (businessIds.has(r.business_id) ? { businessId: r.business_id, punchInTimeTolerance: int(r.punch_in_time_tolerance) ?? 30 } : null), (d) => prisma.attendanceSetting.createMany({ data: d, skipDuplicates: true }));
  await load('business_pfs', 'BusinessPf', pfs, (r) => (businessIds.has(r.business_id) ? { businessId: r.business_id, employeePercentage: num(r.employee_percentage) ?? 12, employerEpsPercentage: num(r.employer_eps_percentage) ?? 8.33, employerEpfPercentage: num(r.employer_epf_percentage) ?? 3.67, cappedAmount: int(r.capped_amount), isEnabled: bool(r.is_enable) } : null), (d) => prisma.businessPf.createMany({ data: d, skipDuplicates: true }));

  // ── departments ──
  const departments = await q('SELECT * FROM departments WHERE deleted_at IS NULL');
  const departmentIds = new Set(departments.map((d) => d.id as number));
  await load('departments', 'Department', departments, (d) => ({ id: d.id, businessId: businessIds.has(d.business_id) ? d.business_id : null, name: d.name ?? '' }), (data) => prisma.department.createMany({ data, skipDuplicates: true }));

  // ── staff ──
  const staffRows = await q('SELECT * FROM staff WHERE deleted_at IS NULL');
  const staffIds = new Set(staffRows.map((s) => s.id as number));
  const staffTz = new Map<number, string>(staffRows.map((s) => [s.id, tzOf(s.timezone) ?? tzByBusiness.get(s.business_id) ?? 'UTC']));
  await load('staff', 'Staff', staffRows, (s) => (businessIds.has(s.business_id) ? {
    id: s.id,
    businessId: s.business_id,
    departmentId: departmentIds.has(s.department_id) ? s.department_id : null,
    name: s.name ?? '',
    middleName: str(s.middle_name),
    lastName: str(s.last_name),
    email: str(s.email),
    countryCode: str(s.country_code),
    phoneNumber: String(s.phone_number ?? ''),
    timezone: tzOf(s.timezone),
    salaryAmount: num(s.salary_amount),
    salaryCycle: int(s.salary_cycle),
    fcmId: str(s.fcm_id),
    imgBytes: json(s.img_bytes) ?? undefined,
    photoFace: assetUrl('staff', s.photo_face),
    isRemote: bool(s.is_remote),
    autoApproveAttendance: bool(s.auto_approve_attendance),
    isGeoFencing: bool(s.is_geo_fencing),
    overtimeRule: bool(s.overtime_rule),
    breakRule: bool(s.break_rule),
    lateEntryRule: bool(s.late_entry_rule),
    earlyExitRule: bool(s.early_exit_rule),
    isDeactivated: bool(s.is_deactivate),
    deactivatedAt: dateOnly(s.deactivate_date),
    createdAt: date(s.created_at) ?? new Date(),
  } : null), (d) => prisma.staff.createMany({ data: d, skipDuplicates: true }));

  const byStaff = (rows: Row[]) => rows.filter((r) => staffIds.has(r.staff_id));
  const [profiles, infos, banks, photos, docs] = await Promise.all([q('SELECT * FROM staff_profiles WHERE deleted_at IS NULL'), q('SELECT * FROM staff_infos WHERE deleted_at IS NULL'), q('SELECT * FROM staff_bank_details WHERE deleted_at IS NULL'), q('SELECT * FROM staff_photos WHERE deleted_at IS NULL'), q('SELECT * FROM staff_documents WHERE deleted_at IS NULL')]);
  const seen = new Set<string>();
  const once = (k: string, id: number) => (seen.has(`${k}${id}`) ? false : (seen.add(`${k}${id}`), true));
  await load('staff_profiles', 'StaffProfile', byStaff(profiles), (r) => (once('p', r.staff_id) ? { staffId: r.staff_id, dateOfBirth: dateOnly(r.date_of_birth), gender: str(r.gender), address1: str(r.address1), address2: str(r.address2), city: str(r.city), state: str(r.state), countryId: int(r.country_id), pincode: str(r.pincode), latitude: num(r.latitude), longitude: num(r.longitude) } : null), (d) => prisma.staffProfile.createMany({ data: d, skipDuplicates: true }));
  await load('staff_infos', 'StaffInfo', byStaff(infos), (r) => (once('i', r.staff_id) ? { staffId: r.staff_id, dateOfJoining: dateOnly(r.date_of_joining), designation: str(r.designation), uanNumber: str(r.UAN_number), esiNumber: str(r.ESI_number), panNumber: str(r.PAN_number) } : null), (d) => prisma.staffInfo.createMany({ data: d, skipDuplicates: true }));
  await load('staff_bank_details', 'StaffBankDetail', byStaff(banks), (r) => (once('b', r.staff_id) ? { staffId: r.staff_id, bankName: str(r.bank_name), accountHolderName: str(r.account_holder_name), accountNumber: str(r.account_number), ifscCode: str(r.IFSC_code), upiId: str(r.UPI_id) } : null), (d) => prisma.staffBankDetail.createMany({ data: d, skipDuplicates: true }));
  await load('staff_photos', 'StaffPhoto', byStaff(photos).filter((r) => r.photo), (r) => ({ staffId: r.staff_id, url: assetUrl('staff', r.photo)! }), (d) => prisma.staffPhoto.createMany({ data: d }));
  await load('staff_documents', 'StaffDocument', byStaff(docs).filter((r) => r.documents), (r) => ({ staffId: r.staff_id, url: assetUrl('staff', r.documents)!, name: String(r.documents).split('/').pop() }), (d) => prisma.staffDocument.createMany({ data: d }));

  const deptHist = await q('SELECT * FROM department_histories WHERE deleted_at IS NULL');
  await load('department_histories', 'DepartmentHistory', byStaff(deptHist), (r) => (departmentIds.has(r.department_id) ? { staffId: r.staff_id, departmentId: r.department_id, startDate: dateOnly(r.start_date) ?? new Date(), endDate: dateOnly(r.end_date) } : null), (d) => prisma.departmentHistory.createMany({ data: d }));

  // ── shifts ──
  const [shifts, details, shiftUsers, shiftHist, rot] = await Promise.all([q('SELECT * FROM working_shifts WHERE deleted_at IS NULL'), q('SELECT * FROM working_shift_details WHERE deleted_at IS NULL ORDER BY id'), q('SELECT * FROM working_shift_users WHERE deleted_at IS NULL'), q('SELECT * FROM working_shift_histories WHERE deleted_at IS NULL'), q('SELECT * FROM rotational_shifts WHERE deleted_at IS NULL')]);
  const shiftIds = new Set(shifts.map((s) => s.id as number));
  await load('working_shifts', 'WorkingShift', shifts, (s) => (businessIds.has(s.business_id) ? { id: s.id, businessId: s.business_id, shiftTypeId: [1, 2, 3].includes(s.shift_type_id) ? s.shift_type_id : 3, name: str(s.name) } : null), (d) => prisma.workingShift.createMany({ data: d, skipDuplicates: true }));
  const posByShift = new Map<number, number>();
  const detailIds = new Set<number>();
  const detailsByShift = new Map<number, Row[]>();
  await load('working_shift_details', 'WorkingShiftDetail', details.filter((d) => shiftIds.has(d.working_shift_id)), (d) => {
    const pos = posByShift.get(d.working_shift_id) ?? 0;
    posByShift.set(d.working_shift_id, pos + 1);
    detailIds.add(d.id);
    detailsByShift.set(d.working_shift_id, [...(detailsByShift.get(d.working_shift_id) ?? []), d]);
    return { id: d.id, workingShiftId: d.working_shift_id, name: str(d.name), shiftStartTime: hhmm(d.shift_start_time), shiftEndTime: hhmm(d.shift_end_time), breakSeconds: secs(d.break_time), totalPayableSeconds: secs(d.total_payable_hours) || 28800, position: pos };
  }, (d) => prisma.workingShiftDetail.createMany({ data: d, skipDuplicates: true }));
  await load('working_shift_users', 'WorkingShiftUser', byStaff(shiftUsers).filter((r) => shiftIds.has(r.working_shift_id)), (r) => (once('s', r.staff_id) ? { staffId: r.staff_id, workingShiftId: r.working_shift_id, startIndex: int(r.start_index), workingType: int(r.working_type) } : null), (d) => prisma.workingShiftUser.createMany({ data: d, skipDuplicates: true }));
  await load('working_shift_histories', 'WorkingShiftHistory', byStaff(shiftHist).filter((r) => shiftIds.has(r.working_shift_id)), (r) => ({ staffId: r.staff_id, workingShiftId: r.working_shift_id, startDate: dateOnly(r.start_date) ?? new Date(), endDate: dateOnly(r.end_date) }), (d) => prisma.workingShiftHistory.createMany({ data: d }));
  await load('rotational_shifts', 'RotationalShift', byStaff(rot).filter((r) => detailIds.has(r.working_shift_detail_id)), (r) => ({ staffId: r.staff_id, workingShiftDetailId: r.working_shift_detail_id, startDate: dateOnly(r.start_date) ?? new Date(), endDate: dateOnly(r.end_date) ?? new Date(), startTime: hhmm(r.start_time), endTime: hhmm(r.end_time) }), (d) => prisma.rotationalShift.createMany({ data: d }));

  // payable seconds per staff (for the Attendance.payableSeconds snapshot)
  const payableOf = new Map<number, number>();
  for (const su of shiftUsers) {
    const ds = detailsByShift.get(su.working_shift_id) ?? [];
    const d = ds[su.start_index ?? 0] ?? ds[0];
    payableOf.set(su.staff_id, secs(d?.total_payable_hours) || 28800);
  }

  // ── attendance ──
  const attendances = await q('SELECT * FROM attendances WHERE deleted_at IS NULL ORDER BY staff_id, date, id');
  const requests = await q('SELECT * FROM attendance_requests WHERE deleted_at IS NULL');
  const requested = new Set<number>(requests.map((r) => Number(r.attendance_id)));
  const attIds = new Set<number>();
  /** legacy stored UTC time-of-day + a local `date`: find the UTC instant whose local date equals `date` */
  const instant = (dateStr: string, time: unknown, tz: string, notBefore?: Date): Date | null => {
    if (!time || time === '-') return null;
    const base = DateTime.fromISO(dateStr, { zone: 'utc' });
    const [h = 0, m = 0, s = 0] = String(time).split(':').map(Number);
    const candidates = [-1, 0, 1].map((off) => base.plus({ days: off }).set({ hour: h, minute: m, second: s || 0 }));
    const sameLocalDay = candidates.filter((c) => c.setZone(tz).toISODate() === dateStr);
    let pool = sameLocalDay.length ? sameLocalDay : [candidates[1]];
    if (notBefore) {
      const after = candidates.filter((c) => c.toJSDate() >= notBefore);
      if (after.length) pool = after.sort((a, b) => a.toMillis() - b.toMillis());
    }
    return pool[0].toJSDate();
  };
  type A = { r: Row; inAt: Date | null; outAt: Date | null; date: string };
  const grouped = new Map<string, A[]>();
  for (const r of attendances) {
    if (!staffIds.has(r.staff_id)) continue;
    const d = ymd(r.date);
    if (!d) continue;
    const tz = staffTz.get(r.staff_id) ?? 'UTC';
    const inAt = instant(d, r.in_time, tz);
    const outAt = instant(d, r.out_time, tz, inAt ?? undefined);
    const key = `${r.staff_id}|${d}`;
    grouped.set(key, [...(grouped.get(key) ?? []), { r, inAt, outAt, date: d }]);
  }
  const attData: any[] = [];
  for (const list of grouped.values()) {
    list.sort((a, b) => a.r.id - b.r.id);
    list.forEach((x, i) => {
      const { r } = x;
      const prevOut = i > 0 ? list[i - 1].outAt : null;
      const breakSeconds = prevOut && x.inAt && x.inAt > prevOut ? Math.floor((x.inAt.getTime() - prevOut.getTime()) / 1000) : 0;
      const pending = r.attendance_status === 0 || requested.has(r.id) ? (r.attendance_status ?? 0) : null;
      // legacy "pending remote punch" rows were stored as status=Absent + attendance_status=0
      const approval = int(r.attendance_status) ?? 1;
      const status = approval === 0 && x.inAt && r.status === 'Absent' ? 'Present' : r.status || 'Absent';
      void pending;
      attIds.add(r.id);
      attData.push({
        id: r.id,
        staffId: r.staff_id,
        date: dateOnly(x.date),
        inAt: x.inAt,
        outAt: x.outAt,
        status,
        approval,
        isManual: bool(r.is_manual),
        behavior: str(r.behavior),
        totalSeconds: secs(r.total_time),
        breakSeconds,
        payableSeconds: payableOf.get(r.staff_id) ?? 28800,
        note: str(r.note),
        latitude: num(r.latitude),
        longitude: num(r.longitude),
        createdAt: date(r.created_at) ?? new Date(),
      });
    });
  }
  report.attendances = { read: attendances.length, written: attData.length, skipped: attendances.length - attData.length };
  if (!DRY) await chunked(attData, 1000, (d) => prisma.attendance.createMany({ data: d, skipDuplicates: true }));
  await load('attendance_requests', 'AttendanceRequest', byStaff(requests).filter((r) => attIds.has(r.attendance_id)), (r) => ({ staffId: r.staff_id, attendanceId: r.attendance_id }), (d) => prisma.attendanceRequest.createMany({ data: d, skipDuplicates: true }));

  const liveLocs = await q('SELECT * FROM live_locations');
  await load('live_locations', 'LiveLocation', byStaff(liveLocs).filter((r) => businessIds.has(r.business_id)), (r) => {
    const pts = json(r.json);
    const d = dateOnly(ymd(r.date));
    return Array.isArray(pts) && d ? { staffId: r.staff_id, businessId: r.business_id, date: d, points: pts } : null;
  }, (d) => prisma.liveLocation.createMany({ data: d, skipDuplicates: true }));

  const logs = await q('SELECT * FROM logs WHERE deleted_at IS NULL');
  await load('logs', 'StaffLog', byStaff(logs), (r) => ({ staffId: r.staff_id, logBy: userIds.has(r.log_by) ? r.log_by : null, detail: String(r.detail ?? ''), createdAt: date(r.created_at) ?? new Date() }), (d) => prisma.staffLog.createMany({ data: d }));

  // ── leave ──
  const [policies, staffPolicies, leaves] = await Promise.all([q('SELECT * FROM leave_policies WHERE deleted_at IS NULL'), q('SELECT * FROM staff_leave_policies WHERE deleted_at IS NULL'), q('SELECT * FROM staff_leaves WHERE deleted_at IS NULL')]);
  const policyIds = new Set(policies.map((p) => p.id as number));
  await load('leave_policies', 'LeavePolicy', policies, (p) => (businessIds.has(p.business_id) ? { id: p.id, businessId: p.business_id, templateName: p.template_name ?? 'Leave', cycle: p.leave_policy_cycle === 'yearly' ? 'yearly' : 'monthly', startPeriod: str(p.leave_start_period), endPeriod: str(p.leave_end_period), accrualType: str(p.accrual_type) ?? 'fixed', numberOfLeaves: num(p.number_of_leaves) ?? 0, isCarryForward: bool(p.is_carry_forward) } : null), (d) => prisma.leavePolicy.createMany({ data: d, skipDuplicates: true }));
  await load('staff_leave_policies', 'StaffLeavePolicy', byStaff(staffPolicies).filter((r) => policyIds.has(r.leave_policy_id)), (r) => ({ staffId: r.staff_id, leavePolicyId: r.leave_policy_id }), (d) => prisma.staffLeavePolicy.createMany({ data: d, skipDuplicates: true }));
  await load('staff_leaves', 'StaffLeave', byStaff(leaves), (r) => {
    const paid = str(r.is_paid) ?? '0';
    const isUnpaid = paid === '1';
    const pid = !isUnpaid && Number(paid) > 0 && policyIds.has(Number(paid)) ? Number(paid) : null;
    return { id: r.id, staffId: r.staff_id, leavePolicyId: pid, isUnpaid, leaveType: r.leave_type === 'Half Day' ? 'Half Day' : 'Full Day', shiftType: str(r.shift_type), reason: str(r.reason), startDate: dateOnly(ymd(r.start_date)) ?? new Date(), endDate: dateOnly(ymd(r.end_date)) ?? new Date(), status: int(r.status) ?? 0, createdAt: date(r.created_at) ?? new Date() };
  }, (d) => prisma.staffLeave.createMany({ data: d, skipDuplicates: true }));

  // ── holidays ──
  const [hPolicies, hLists, hStaff, wBiz, wStaff] = await Promise.all([q('SELECT * FROM holiday_policies WHERE deleted_at IS NULL'), q('SELECT * FROM holiday_lists WHERE deleted_at IS NULL'), q('SELECT * FROM holiday_policy_to_staff WHERE deleted_at IS NULL'), q('SELECT * FROM weekly_holiday_businesses WHERE deleted_at IS NULL'), q('SELECT * FROM weekly_holiday_staff WHERE deleted_at IS NULL')]);
  const parseHoliday = (s: unknown): string | null => {
    const first = String(s ?? '').split('|')[0].trim();
    for (const f of ['dd LLL yyyy', 'd LLL yyyy', 'dd LLLL yyyy', 'yyyy-MM-dd']) {
      const dt = DateTime.fromFormat(first, f, { zone: 'utc' });
      if (dt.isValid) return dt.toISODate();
    }
    return null;
  };
  const policyYear = new Map<number, number>();
  for (const p of hPolicies) {
    const m = /(\d{4})/.exec(`${p.shift_start_time ?? ''} ${p.shift_end_time ?? ''}`);
    if (m) policyYear.set(p.id, Number(m[1]));
  }
  const holidayRows = hLists.map((h) => ({ h, d: parseHoliday(h.holiday_date) }));
  for (const { h, d } of holidayRows) if (d && !policyYear.has(h.template_id)) policyYear.set(h.template_id, Number(d.slice(0, 4)));
  const hPolicyIds = new Set(hPolicies.filter((p) => businessIds.has(p.business_id)).map((p) => p.id as number));
  await load('holiday_policies', 'HolidayPolicy', hPolicies, (p) => (businessIds.has(p.business_id) ? { id: p.id, businessId: p.business_id, name: p.name ?? 'Holidays', year: policyYear.get(p.id) ?? new Date().getFullYear() } : null), (d) => prisma.holidayPolicy.createMany({ data: d, skipDuplicates: true }));
  await load('holiday_lists', 'HolidayList', holidayRows.filter((x) => hPolicyIds.has(x.h.template_id)), (x) => (x.d ? { policyId: x.h.template_id, name: x.h.holiday_name ?? 'Holiday', date: dateOnly(x.d)! } : null), (d) => prisma.holidayList.createMany({ data: d }));
  await load('holiday_policy_staff', 'HolidayPolicyStaff', byStaff(hStaff).filter((r) => hPolicyIds.has(r.template_id)), (r) => ({ policyId: r.template_id, staffId: r.staff_id }), (d) => prisma.holidayPolicyStaff.createMany({ data: d, skipDuplicates: true }));
  await load('weekly_holiday_businesses', 'WeeklyHolidayBusiness', wBiz, (r) => (businessIds.has(r.business_id) && r.days >= 0 && r.days <= 6 ? { businessId: r.business_id, day: r.days } : null), (d) => prisma.weeklyHolidayBusiness.createMany({ data: d, skipDuplicates: true }));
  await load('weekly_holiday_staff', 'WeeklyHolidayStaff', byStaff(wStaff), (r) => (r.days >= 0 && r.days <= 6 ? { staffId: r.staff_id, day: r.days } : null), (d) => prisma.weeklyHolidayStaff.createMany({ data: d, skipDuplicates: true }));

  // ── automation rules ──
  const ruleMap = (r: Row, occ: boolean) => (businessIds.has(r.business_id) ? { businessId: r.business_id, ruleType: int(r.rule_type) ?? 1, thresholdSeconds: secs(r.hour), multiples: num(r.multiples), fixedAmount: int(r.fixed_amount), isEnabled: r.status === null ? true : bool(r.status), ...(occ ? { occurrences: int(r.set_occurrences_count) ?? 0 } : {}) } : null);
  await load('overtime_rules', 'OvertimeRule', await q('SELECT * FROM overtime_rules WHERE deleted_at IS NULL'), (r) => ruleMap(r, false), (d) => prisma.overtimeRule.createMany({ data: d }));
  await load('break_rules', 'BreakRule', await q('SELECT * FROM break_rules WHERE deleted_at IS NULL'), (r) => ruleMap(r, false), (d) => prisma.breakRule.createMany({ data: d }));
  await load('late_entry_rules', 'LateEntryRule', await q('SELECT * FROM late_entry_rules WHERE deleted_at IS NULL'), (r) => ruleMap(r, true), (d) => prisma.lateEntryRule.createMany({ data: d }));
  await load('early_exit_rules', 'EarlyExitRule', await q('SELECT * FROM early_exit_rules WHERE deleted_at IS NULL'), (r) => ruleMap(r, true), (d) => prisma.earlyExitRule.createMany({ data: d }));

  // ── payroll ──
  const [payruns, payrolls, attReviews, payReviews] = await Promise.all([q('SELECT * FROM payruns WHERE deleted_at IS NULL'), q('SELECT * FROM payrolls WHERE deleted_at IS NULL'), q('SELECT * FROM payroll_attendance_reviews'), q('SELECT * FROM payroll_total_pay_reviews')]);
  const payrunKey = new Map<number, { month: number; year: number }>();
  const payrunSeen = new Set<string>();
  await load('payruns', 'Payrun', payruns, (r) => {
    const d = ymd(r.report_cycle);
    if (!d || !businessIds.has(r.business_id)) return null;
    const month = Number(d.slice(5, 7));
    const year = Number(d.slice(0, 4));
    const k = `${r.business_id}|${month}|${year}`;
    if (payrunSeen.has(k)) return null;
    payrunSeen.add(k);
    payrunKey.set(r.id, { month, year });
    return { id: r.id, businessId: r.business_id, month, year };
  }, (d) => prisma.payrun.createMany({ data: d, skipDuplicates: true }));
  const payrollSeen = new Set<string>();
  await load('payrolls', 'Payroll', byStaff(payrolls).filter((r) => payrunKey.has(r.payrun_id)), (r) => {
    const { month, year } = payrunKey.get(r.payrun_id)!;
    const k = `${r.staff_id}|${month}|${year}`;
    if (payrollSeen.has(k)) return null;
    payrollSeen.add(k);
    const net = num(r.net_salary) ?? 0;
    const overtimeSalary = num(r.overtime_salary) ?? 0;
    const deduction = num(r.deduction) ?? 0;
    return { businessId: r.business_id, staffId: r.staff_id, payrunId: r.payrun_id, month, year, workedSeconds: secs(r.worked_hours), overtimeSeconds: secs(r.overtime), baseSalary: Math.max(0, net - overtimeSalary + deduction), overtimeSalary, deduction, pfCut: num(r.pf_cut) ?? 0, epsAmount: num(r.eps_amount) ?? 0, epfAmount: num(r.epf_amount) ?? 0, netSalary: net, createdAt: date(r.created_at) ?? new Date() };
  }, (d) => prisma.payroll.createMany({ data: d, skipDuplicates: true }));
  const reviewSeen = new Set<string>();
  const review = (kind: string) => (r: Row) => {
    const k = `${kind}${r.staff_id}|${r.month}|${r.year}`;
    if (!r.month || !r.year || reviewSeen.has(k)) return null;
    reviewSeen.add(k);
    return { staffId: r.staff_id, month: r.month, year: r.year, reviewed: bool(r.review) };
  };
  await load('payroll_attendance_reviews', 'PayrollAttendanceReview', byStaff(attReviews), review('a'), (d) => prisma.payrollAttendanceReview.createMany({ data: d, skipDuplicates: true }));
  await load('payroll_total_pay_reviews', 'PayrollTotalPayReview', byStaff(payReviews), review('t'), (d) => prisma.payrollTotalPayReview.createMany({ data: d, skipDuplicates: true }));

  // ── notifications (legacy is_read: 0 = read, 1 = unread) ──
  const notifications = await q('SELECT * FROM notifications WHERE deleted_at IS NULL');
  await load('notifications', 'Notification', notifications.filter((n) => (n.user_id && userIds.has(n.user_id)) || (n.staff_id && staffIds.has(n.staff_id))), (n) => ({ userId: userIds.has(n.user_id) ? n.user_id : null, staffId: staffIds.has(n.staff_id) ? n.staff_id : null, title: n.title ?? '', message: str(n.message), action: str(n.action), actionId: int(n.action_id), isRead: n.is_read === 0, createdAt: date(n.created_at) ?? new Date() }), (d) => prisma.notification.createMany({ data: d }));

  // ── subscriptions ──
  const [subs, payLogs] = await Promise.all([q('SELECT * FROM subscriptions'), q('SELECT * FROM payment_logs')]);
  const subIds = new Set<number>();
  await load('subscriptions', 'Subscription', subs.filter((s) => userIds.has(Number(s.user_id))), (s) => {
    subIds.add(Number(s.id));
    return {
      id: Number(s.id),
      userId: Number(s.user_id),
      plan: s.plan ?? 'monthly',
      billingCycle: s.billing_cycle ?? s.plan ?? 'monthly',
      seats: int(s.seats) ?? 1,
      pricePerSeat: num(s.price_per_seat) ?? 0,
      totalAmount: num(s.total_amount) ?? 0,
      status: s.status ?? 'pending',
      paymentMethod: s.payment_method ?? 'cashfree',
      customerId: str(s.customer_id),
      cashfreePlanId: str(s.cashfree_plan_id),
      cashfreeSubscriptionId: str(s.cashfree_subscription_id),
      cashfreeAuthLink: str(s.cashfree_auth_link),
      cashfreeSubscriptionStatus: str(s.cashfree_subscription_status),
      cashfreeResponse: json(s.cashfree_response) ?? undefined,
      kelviqSessionId: str(s.kelviq_session_id),
      kelviqCheckoutUrl: str(s.kelviq_checkout_url),
      kelviqResponse: json(s.kelviq_response) ?? undefined,
      startsAt: date(s.starts_at),
      expiresAt: date(s.expires_at),
      paidAt: date(s.paid_at),
      createdAt: date(s.created_at) ?? new Date(),
    };
  }, (d) => prisma.subscription.createMany({ data: d, skipDuplicates: true }));
  await load('payment_logs', 'PaymentLog', payLogs, (p) => ({ userId: userIds.has(Number(p.user_id)) ? Number(p.user_id) : null, subscriptionId: subIds.has(Number(p.subscription_id)) ? Number(p.subscription_id) : null, eventType: p.event_type ?? 'unknown', orderId: str(p.cashfree_order_id ?? p.order_id), paymentId: str(p.cashfree_payment_id ?? p.payment_id), linkId: str(p.cashfree_link_id), amount: num(p.amount), currency: p.currency ?? 'INR', status: str(p.status), payload: json(p.payload) ?? undefined, createdAt: date(p.created_at) ?? new Date() }), (d) => prisma.paymentLog.createMany({ data: d }));

  // ── assets ──
  const assets = opt('--assets');
  if (assets && !DRY) {
    const copy = (srcSub: string, destSub: string) => {
      const src = path.join(assets, 'assets/admin/images', srcSub);
      if (!fs.existsSync(src)) return 0;
      const dest = path.resolve('uploads', destSub);
      fs.mkdirSync(dest, { recursive: true });
      let n = 0;
      for (const f of fs.readdirSync(src)) {
        if (!fs.statSync(path.join(src, f)).isFile()) continue;
        fs.copyFileSync(path.join(src, f), path.join(dest, f));
        n++;
      }
      return n;
    };
    const copied = copy('staff_photos', 'staff') + copy('staff_photo_face', 'staff') + copy('staff_document', 'staff') + copy('business_logo', 'logos') + copy('business_logos', 'logos');
    console.log(`Copied ${copied} asset files into ./uploads`);
  }

  await db.end();
  console.log(`\n${DRY ? 'DRY RUN – nothing written.' : 'Migration complete.'}\n`);
  console.table(Object.fromEntries(Object.entries(report).map(([k, v]) => [k, v])));
  console.log('\nNext: run `npm run db:seed` to create the super-admin account, and re-run the app.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
