import ExcelJS from 'exceljs';
import { z } from 'zod';
import type { Prisma, Staff } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, conflict, notFound } from '../lib/errors';
import { dateOnly, fmtDate, normalizeTz } from '../lib/time';
import { bool, dateStr, int, optBool, optInt, optNum, optStr } from '../lib/validation';
import { businessTz } from './context.service';
import { logStaff } from './attendance.service';
import { sendStaffOnboarding, sendStaffWelcomeMail } from './comms.service';
import { ownerOfBusiness } from '../middleware/subscription';
import { removeUploadedFile } from '../lib/upload';

export const fullName = (s: Pick<Staff, 'name' | 'middleName' | 'lastName'>) => [s.name, s.middleName, s.lastName].filter(Boolean).join(' ');

// ───────────────────────────── Validation ─────────────────────────────

export const staffBody = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  middle_name: optStr,
  last_name: optStr,
  country_code: z.string().min(1, 'Country code is required'),
  phone_number: z.string().min(6, 'Phone number is required'),
  email: z.preprocess((v) => (v === '' ? undefined : v), z.string().email('Enter a valid email').optional()),
  salary_amount: optNum,
  salary_cycle: optInt,
  department_id: optInt,
  working_shift_id: optInt,
  timezone: optStr,
  is_remote: optBool,
  auto_approve_attendance: optBool,
  is_geo_fencing: optBool,
  // bank
  bank_name: optStr,
  account_holder_name: optStr,
  account_number: optStr,
  IFSC_code: optStr,
  UPI_id: optStr,
  // profile
  date_of_birth: z.preprocess((v) => (v === '' ? undefined : v), dateStr.optional()),
  gender: optStr,
  address1: optStr,
  address2: optStr,
  city: optStr,
  state: optStr,
  country_id: optInt,
  pincode: optStr,
  latitude: optNum,
  longitude: optNum,
  // employment
  date_of_joining: z.preprocess((v) => (v === '' ? undefined : v), dateStr.optional()),
  designation: optStr,
  UAN_number: optStr,
  ESI_number: optStr,
  PAN_number: optStr,
  img_bytes: optStr,
});
export type StaffBody = z.infer<typeof staffBody>;

export interface StaffFiles {
  photos?: string[];
  documents?: { url: string; name?: string }[];
  photoFace?: string;
}

// ───────────────────────────── Seats ─────────────────────────────

export async function assertSeatAvailable(businessId: number) {
  const ownerId = await ownerOfBusiness(businessId);
  if (!ownerId) return;
  const sub = await prisma.subscription.findFirst({
    where: { userId: ownerId, status: 'active', expiresAt: { gt: new Date() } },
    orderBy: { id: 'desc' },
  });
  if (!sub) return;
  const active = await prisma.staff.count({ where: { businessId, deletedAt: null, isDeactivated: false } });
  if (active >= sub.seats) {
    throw badRequest(`Seat limit reached (${sub.seats}). Increase your seats in Subscriptions to add more staff.`);
  }
}

// ───────────────────────────── DTO ─────────────────────────────

const staffInclude = {
  department: true,
  profile: true,
  info: true,
  bank: true,
  photos: { orderBy: { id: 'desc' } },
  documents: true,
  shiftUser: { include: { shift: { include: { details: true, type: true } } } },
  leavePolicies: { include: { policy: true } },
  holidayPolicies: { include: { policy: true } },
} satisfies Prisma.StaffInclude;

type StaffFull = Prisma.StaffGetPayload<{ include: typeof staffInclude }>;

export function staffDetailDto(s: StaffFull) {
  return {
    id: s.id,
    name: s.name,
    middle_name: s.middleName,
    last_name: s.lastName,
    full_name: fullName(s),
    email: s.email,
    country_code: s.countryCode,
    phone_number: s.phoneNumber,
    timezone: s.timezone,
    salary_amount: s.salaryAmount ? Number(s.salaryAmount) : null,
    salary_cycle: s.salaryCycle,
    department_id: s.departmentId,
    department: s.department ? { id: s.department.id, name: s.department.name } : null,
    is_remote: s.isRemote ? 1 : 0,
    auto_approve_attendance: s.autoApproveAttendance ? 1 : 0,
    is_geo_fencing: s.isGeoFencing ? 1 : 0,
    overtime_rule: s.overtimeRule ? 1 : 0,
    break_rule: s.breakRule ? 1 : 0,
    late_entry_rule: s.lateEntryRule ? 1 : 0,
    early_exit_rule: s.earlyExitRule ? 1 : 0,
    is_deactivate: s.isDeactivated ? 1 : 0,
    deactivate_date: fmtDate(s.deactivatedAt),
    photo_face: s.photoFace,
    photos: s.photos.map((p) => ({ id: p.id, url: p.url })),
    photo: s.photos[0]?.url ?? null,
    documents: s.documents.map((d) => ({ id: d.id, url: d.url, name: d.name })),
    profile: s.profile && {
      date_of_birth: fmtDate(s.profile.dateOfBirth),
      gender: s.profile.gender,
      address1: s.profile.address1,
      address2: s.profile.address2,
      city: s.profile.city,
      state: s.profile.state,
      country_id: s.profile.countryId,
      pincode: s.profile.pincode,
      latitude: s.profile.latitude ? Number(s.profile.latitude) : null,
      longitude: s.profile.longitude ? Number(s.profile.longitude) : null,
    },
    info: s.info && {
      date_of_joining: fmtDate(s.info.dateOfJoining),
      designation: s.info.designation,
      UAN_number: s.info.uanNumber,
      ESI_number: s.info.esiNumber,
      PAN_number: s.info.panNumber,
    },
    bank: s.bank && {
      bank_name: s.bank.bankName,
      account_holder_name: s.bank.accountHolderName,
      account_number: s.bank.accountNumber,
      IFSC_code: s.bank.ifscCode,
      UPI_id: s.bank.upiId,
    },
    shift: s.shiftUser && {
      working_shift_id: s.shiftUser.workingShiftId,
      name: s.shiftUser.shift.name,
      shift_type_id: s.shiftUser.shift.shiftTypeId,
      shift_type: s.shiftUser.shift.type.name,
      start_index: s.shiftUser.startIndex,
      working_type: s.shiftUser.workingType,
    },
    leave_policies: s.leavePolicies.map((l) => ({ id: l.policy.id, name: l.policy.templateName })),
    holiday_policies: s.holidayPolicies.map((h) => ({ id: h.policy.id, name: h.policy.name })),
    created_at: s.createdAt.toISOString(),
  };
}

export async function getStaffDetail(businessId: number, id: number) {
  const s = await prisma.staff.findFirst({ where: { id, businessId, deletedAt: null }, include: staffInclude });
  if (!s) throw notFound('Staff not found');
  return staffDetailDto(s);
}

// ───────────────────────────── Create / update ─────────────────────────────

const nullable = <T>(v: T | undefined): T | null => (v === undefined ? null : v);

export async function createStaff(businessId: number, b: StaffBody, files: StaffFiles, byUserId: number) {
  const code = b.country_code.replace(/\D/g, '');
  const phone = b.phone_number.replace(/\D/g, '').replace(/^0+/, '');

  if (await prisma.staff.findFirst({ where: { businessId, phoneNumber: phone, isDeactivated: false, deletedAt: null } })) {
    throw conflict('Phone number already exists');
  }
  if (b.email && (await prisma.staff.findFirst({ where: { businessId, email: b.email, deletedAt: null } }))) {
    throw conflict('Email already exists');
  }
  await assertSeatAvailable(businessId);

  const tz = b.timezone ? normalizeTz(b.timezone) : await businessTz(businessId);
  const now = dateOnly(new Date());

  let shiftId = b.working_shift_id;
  if (shiftId) {
    const shift = await prisma.workingShift.findFirst({ where: { id: shiftId, businessId, deletedAt: null } });
    if (!shift) throw badRequest('Selected shift does not exist');
  } else {
    shiftId = (await prisma.workingShift.findFirst({ where: { businessId, deletedAt: null }, orderBy: { id: 'asc' } }))?.id;
  }
  if (b.department_id) {
    const dep = await prisma.department.findFirst({ where: { id: b.department_id, OR: [{ businessId }, { businessId: null }], deletedAt: null } });
    if (!dep) throw badRequest('Selected department does not exist');
  }

  const staff = await prisma.$transaction(async (tx) => {
    const s = await tx.staff.create({
      data: {
        businessId,
        name: b.name,
        middleName: nullable(b.middle_name),
        lastName: nullable(b.last_name),
        email: nullable(b.email),
        countryCode: code,
        phoneNumber: phone,
        timezone: tz,
        salaryAmount: b.salary_amount ?? null,
        salaryCycle: b.salary_cycle ?? null,
        departmentId: b.department_id ?? null,
        isRemote: b.is_remote ?? false,
        autoApproveAttendance: b.auto_approve_attendance ?? false,
        isGeoFencing: b.is_geo_fencing ?? false,
        photoFace: files.photoFace ?? null,
        imgBytes: b.img_bytes ? safeJson(b.img_bytes) : undefined,
      },
    });
    await tx.staffProfile.create({
      data: {
        staffId: s.id,
        dateOfBirth: b.date_of_birth ? dateOnly(b.date_of_birth) : null,
        gender: nullable(b.gender),
        address1: nullable(b.address1),
        address2: nullable(b.address2),
        city: nullable(b.city),
        state: nullable(b.state),
        countryId: b.country_id ?? null,
        pincode: nullable(b.pincode),
        latitude: b.latitude ?? null,
        longitude: b.longitude ?? null,
      },
    });
    await tx.staffInfo.create({
      data: {
        staffId: s.id,
        dateOfJoining: b.date_of_joining ? dateOnly(b.date_of_joining) : null,
        designation: nullable(b.designation),
        uanNumber: nullable(b.UAN_number),
        esiNumber: nullable(b.ESI_number),
        panNumber: nullable(b.PAN_number),
      },
    });
    await tx.staffBankDetail.create({
      data: {
        staffId: s.id,
        bankName: nullable(b.bank_name),
        accountHolderName: nullable(b.account_holder_name),
        accountNumber: nullable(b.account_number),
        ifscCode: nullable(b.IFSC_code),
        upiId: nullable(b.UPI_id),
      },
    });
    if (b.department_id) await tx.departmentHistory.create({ data: { staffId: s.id, departmentId: b.department_id, startDate: now } });
    if (shiftId) {
      await tx.workingShiftUser.create({ data: { staffId: s.id, workingShiftId: shiftId } });
      await tx.workingShiftHistory.create({ data: { staffId: s.id, workingShiftId: shiftId, startDate: now } });
    }
    if (files.photos?.length) await tx.staffPhoto.createMany({ data: files.photos.map((url) => ({ staffId: s.id, url })) });
    if (files.documents?.length) await tx.staffDocument.createMany({ data: files.documents.map((d) => ({ staffId: s.id, url: d.url, name: d.name ?? null })) });
    return s;
  });

  await logStaff(staff.id, byUserId, `${fullName(staff)} was added to the team`);
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } });
  void sendStaffOnboarding(code, phone, fullName(staff), business?.name ?? 'Hajri');
  if (staff.email) void sendStaffWelcomeMail(staff.email, business?.name ?? 'Hajri', fullName(staff), `+${code} ${phone}`);
  return getStaffDetail(businessId, staff.id);
}

function safeJson(s: string): Prisma.InputJsonValue | undefined {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export async function updateStaff(
  businessId: number,
  id: number,
  b: Partial<StaffBody>,
  files: StaffFiles & { removePhotoIds?: number[]; removeDocumentIds?: number[] },
  byUserId: number,
) {
  const existing = await prisma.staff.findFirst({ where: { id, businessId, deletedAt: null } });
  if (!existing) throw notFound('Staff not found');
  const code = b.country_code ? b.country_code.replace(/\D/g, '') : undefined;
  const phone = b.phone_number ? b.phone_number.replace(/\D/g, '').replace(/^0+/, '') : undefined;

  if (phone && (await prisma.staff.findFirst({ where: { businessId, phoneNumber: phone, id: { not: id }, deletedAt: null, isDeactivated: false } }))) {
    throw conflict('This phone number is already used by another employee.');
  }
  if (b.email && (await prisma.staff.findFirst({ where: { businessId, email: b.email, id: { not: id }, deletedAt: null } }))) {
    throw conflict('Email should not be duplicate (two employees can not have same email)');
  }
  if (b.department_id) {
    const dep = await prisma.department.findFirst({ where: { id: b.department_id, OR: [{ businessId }, { businessId: null }], deletedAt: null } });
    if (!dep) throw badRequest('Selected department does not exist');
  }

  const today = dateOnly(new Date());
  const removedPhotos = files.removePhotoIds?.length ? await prisma.staffPhoto.findMany({ where: { id: { in: files.removePhotoIds }, staffId: id } }) : [];
  const removedDocs = files.removeDocumentIds?.length ? await prisma.staffDocument.findMany({ where: { id: { in: files.removeDocumentIds }, staffId: id } }) : [];

  await prisma.$transaction(async (tx) => {
    await tx.staff.update({
      where: { id },
      data: {
        ...(b.name !== undefined ? { name: b.name } : {}),
        ...(b.middle_name !== undefined ? { middleName: b.middle_name } : {}),
        ...(b.last_name !== undefined ? { lastName: b.last_name } : {}),
        ...(b.email !== undefined ? { email: b.email } : {}),
        ...(code ? { countryCode: code } : {}),
        ...(phone ? { phoneNumber: phone } : {}),
        ...(b.salary_amount !== undefined ? { salaryAmount: b.salary_amount } : {}),
        ...(b.salary_cycle !== undefined ? { salaryCycle: b.salary_cycle } : {}),
        ...(b.timezone ? { timezone: normalizeTz(b.timezone) } : {}),
        ...(b.is_remote !== undefined ? { isRemote: b.is_remote } : {}),
        ...(b.auto_approve_attendance !== undefined ? { autoApproveAttendance: b.auto_approve_attendance } : {}),
        ...(b.is_geo_fencing !== undefined ? { isGeoFencing: b.is_geo_fencing } : {}),
        ...(files.photoFace ? { photoFace: files.photoFace } : {}),
        ...(b.img_bytes ? { imgBytes: safeJson(b.img_bytes) } : {}),
      },
    });

    if (b.department_id !== undefined && b.department_id !== existing.departmentId) {
      await tx.departmentHistory.updateMany({ where: { staffId: id, endDate: null }, data: { endDate: today } });
      if (b.department_id) await tx.departmentHistory.create({ data: { staffId: id, departmentId: b.department_id, startDate: today } });
      await tx.staff.update({ where: { id }, data: { departmentId: b.department_id || null } });
    }

    if (b.working_shift_id) {
      const current = await tx.workingShiftUser.findUnique({ where: { staffId: id } });
      if (current?.workingShiftId !== b.working_shift_id) {
        const shift = await tx.workingShift.findFirst({ where: { id: b.working_shift_id, businessId, deletedAt: null } });
        if (!shift) throw badRequest('Selected shift does not exist');
        await tx.workingShiftHistory.updateMany({ where: { staffId: id, endDate: null }, data: { endDate: today } });
        await tx.workingShiftUser.upsert({
          where: { staffId: id },
          create: { staffId: id, workingShiftId: b.working_shift_id },
          update: { workingShiftId: b.working_shift_id, startIndex: null, workingType: null },
        });
        await tx.workingShiftHistory.create({ data: { staffId: id, workingShiftId: b.working_shift_id, startDate: today } });
      }
    }

    const profile = {
      ...(b.date_of_birth !== undefined ? { dateOfBirth: dateOnly(b.date_of_birth) } : {}),
      ...(b.gender !== undefined ? { gender: b.gender } : {}),
      ...(b.address1 !== undefined ? { address1: b.address1 } : {}),
      ...(b.address2 !== undefined ? { address2: b.address2 } : {}),
      ...(b.city !== undefined ? { city: b.city } : {}),
      ...(b.state !== undefined ? { state: b.state } : {}),
      ...(b.country_id !== undefined ? { countryId: b.country_id } : {}),
      ...(b.pincode !== undefined ? { pincode: b.pincode } : {}),
      ...(b.latitude !== undefined ? { latitude: b.latitude } : {}),
      ...(b.longitude !== undefined ? { longitude: b.longitude } : {}),
    };
    if (Object.keys(profile).length) await tx.staffProfile.upsert({ where: { staffId: id }, create: { staffId: id, ...profile }, update: profile });

    const info = {
      ...(b.date_of_joining !== undefined ? { dateOfJoining: dateOnly(b.date_of_joining) } : {}),
      ...(b.designation !== undefined ? { designation: b.designation } : {}),
      ...(b.UAN_number !== undefined ? { uanNumber: b.UAN_number } : {}),
      ...(b.ESI_number !== undefined ? { esiNumber: b.ESI_number } : {}),
      ...(b.PAN_number !== undefined ? { panNumber: b.PAN_number } : {}),
    };
    if (Object.keys(info).length) await tx.staffInfo.upsert({ where: { staffId: id }, create: { staffId: id, ...info }, update: info });

    const bank = {
      ...(b.bank_name !== undefined ? { bankName: b.bank_name } : {}),
      ...(b.account_holder_name !== undefined ? { accountHolderName: b.account_holder_name } : {}),
      ...(b.account_number !== undefined ? { accountNumber: b.account_number } : {}),
      ...(b.IFSC_code !== undefined ? { ifscCode: b.IFSC_code } : {}),
      ...(b.UPI_id !== undefined ? { upiId: b.UPI_id } : {}),
    };
    if (Object.keys(bank).length) await tx.staffBankDetail.upsert({ where: { staffId: id }, create: { staffId: id, ...bank }, update: bank });

    if (removedPhotos.length) await tx.staffPhoto.deleteMany({ where: { id: { in: removedPhotos.map((p) => p.id) } } });
    if (removedDocs.length) await tx.staffDocument.deleteMany({ where: { id: { in: removedDocs.map((p) => p.id) } } });
    if (files.photos?.length) await tx.staffPhoto.createMany({ data: files.photos.map((url) => ({ staffId: id, url })) });
    if (files.documents?.length) await tx.staffDocument.createMany({ data: files.documents.map((d) => ({ staffId: id, url: d.url, name: d.name ?? null })) });
  });

  removedPhotos.forEach((p) => removeUploadedFile(p.url));
  removedDocs.forEach((d) => removeUploadedFile(d.url));
  if (files.photoFace && existing.photoFace) removeUploadedFile(existing.photoFace);
  await logStaff(id, byUserId, 'Staff profile was updated');
  return getStaffDetail(businessId, id);
}

export async function setDeactivated(businessId: number, id: number, deactivate: boolean, byUserId: number) {
  const s = await prisma.staff.findFirst({ where: { id, businessId, deletedAt: null } });
  if (!s) throw notFound('Staff not found');
  if (!deactivate) await assertSeatAvailable(businessId);
  await prisma.staff.update({
    where: { id },
    data: { isDeactivated: deactivate, deactivatedAt: deactivate ? dateOnly(new Date()) : null, fcmId: deactivate ? null : s.fcmId },
  });
  await logStaff(id, byUserId, `${fullName(s)} was ${deactivate ? 'deactivated' : 'activated'}`);
}

export async function deleteStaff(businessId: number, ids: number[]) {
  const res = await prisma.staff.updateMany({
    where: { id: { in: ids }, businessId, deletedAt: null },
    data: { deletedAt: new Date(), isDeactivated: true, fcmId: null },
  });
  return res.count;
}

// ───────────────────────────── Listing ─────────────────────────────

export interface StaffListFilters {
  search?: string;
  departmentId?: number;
  status?: 'active' | 'deactivated' | 'all';
}

export async function listStaff(businessId: number, f: StaffListFilters, skip: number, take: number, today: string) {
  const where: Prisma.StaffWhereInput = {
    businessId,
    deletedAt: null,
    ...(f.status === 'deactivated' ? { isDeactivated: true } : f.status === 'all' ? {} : { isDeactivated: false }),
    ...(f.departmentId ? { departmentId: f.departmentId } : {}),
    ...(f.search
      ? {
          OR: [
            { name: { contains: f.search } },
            { lastName: { contains: f.search } },
            { phoneNumber: { contains: f.search } },
            { department: { name: { contains: f.search } } },
          ],
        }
      : {}),
  };
  const [total, staff] = await Promise.all([
    prisma.staff.count({ where }),
    prisma.staff.findMany({
      where,
      include: { department: true, photos: { take: 1, orderBy: { id: 'desc' } }, info: true, shiftUser: { include: { shift: true } } },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
  ]);
  const ids = staff.map((s) => s.id);
  const [rows, leaves] = await Promise.all([
    prisma.attendance.findMany({ where: { staffId: { in: ids }, date: dateOnly(today), deletedAt: null, approval: { not: 2 } }, orderBy: { id: 'asc' } }),
    prisma.staffLeave.findMany({
      where: { staffId: { in: ids }, status: 1, deletedAt: null, startDate: { lte: dateOnly(today) }, endDate: { gte: dateOnly(today) } },
    }),
  ]);
  return {
    total,
    data: staff.map((s) => {
      const mine = rows.filter((r) => r.staffId === s.id);
      const approved = mine.find((r) => r.approval === 1);
      return {
        id: s.id,
        name: s.name,
        middle_name: s.middleName,
        last_name: s.lastName,
        full_name: fullName(s),
        phone_number: s.phoneNumber,
        country_code: s.countryCode,
        email: s.email,
        salary_amount: s.salaryAmount ? Number(s.salaryAmount) : null,
        department_id: s.departmentId,
        department: s.department ? { id: s.department.id, name: s.department.name } : null,
        designation: s.info?.designation ?? null,
        shift: s.shiftUser?.shift.name ?? null,
        photo: s.photos[0]?.url ?? null,
        is_remote: s.isRemote ? 1 : 0,
        is_deactivate: s.isDeactivated ? 1 : 0,
        deactivate_date: fmtDate(s.deactivatedAt),
        is_leave: leaves.some((l) => l.staffId === s.id) ? 1 : 0,
        status: approved ? approved.status : mine.length ? 'Pending' : 'Not Marked',
        created_at: s.createdAt.toISOString(),
      };
    }),
  };
}

// ───────────────────────────── Excel import / export ─────────────────────────────

export const IMPORT_COLUMNS = [
  'Name',
  'Middle Name',
  'Last Name',
  'Country Code',
  'Phone Number',
  'Email',
  'Department',
  'Salary Amount',
  'Salary Cycle',
  'Designation',
  'Date Of Joining (YYYY-MM-DD)',
] as const;

export async function importTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Staff');
  ws.addRow([...IMPORT_COLUMNS]).font = { bold: true };
  ws.addRow(['Rahul', '', 'Sharma', '91', '9876543210', 'rahul@example.com', 'Sales', 20000, 1, 'Executive', '2026-01-15']);
  ws.columns.forEach((c) => (c.width = 22));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const cellText = (v: ExcelJS.CellValue): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'text' in v) return String((v as { text: string }).text);
  if (typeof v === 'object' && 'result' in v) return String((v as { result: unknown }).result ?? '');
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
};

export interface ImportResult {
  created: number;
  failed: { row: number; message: string }[];
}

export async function importStaff(businessId: number, buffer: Buffer, byUserId: number): Promise<ImportResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw badRequest('The file has no sheets');
  const result: ImportResult = { created: 0, failed: [] };
  const departments = new Map((await prisma.department.findMany({ where: { OR: [{ businessId }, { businessId: null }], deletedAt: null } })).map((d) => [d.name.toLowerCase(), d.id]));

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const get = (n: number) => cellText(row.getCell(n).value);
    if (!get(1) && !get(5)) continue;
    try {
      let departmentId: number | undefined;
      const depName = get(7);
      if (depName) {
        departmentId = departments.get(depName.toLowerCase());
        if (!departmentId) {
          const d = await prisma.department.create({ data: { businessId, name: depName } });
          departments.set(depName.toLowerCase(), d.id);
          departmentId = d.id;
        }
      }
      const body = staffBody.parse({
        name: get(1),
        middle_name: get(2),
        last_name: get(3),
        country_code: get(4) || '91',
        phone_number: get(5),
        email: get(6),
        department_id: departmentId,
        salary_amount: get(8),
        salary_cycle: get(9),
        designation: get(10),
        date_of_joining: get(11),
      });
      await createStaff(businessId, body, {}, byUserId);
      result.created++;
    } catch (e) {
      const message = e instanceof z.ZodError ? e.issues[0]?.message ?? 'Invalid data' : e instanceof Error ? e.message : 'Failed';
      result.failed.push({ row: i, message });
    }
  }
  return result;
}

export async function exportStaff(businessId: number): Promise<Buffer> {
  const staff = await prisma.staff.findMany({
    where: { businessId, deletedAt: null },
    include: { department: true, info: true, bank: true, profile: true },
    orderBy: { name: 'asc' },
  });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Staff');
  ws.addRow(['ID', 'Name', 'Phone', 'Email', 'Department', 'Designation', 'Date Of Joining', 'Salary', 'Status', 'Bank', 'Account Number', 'IFSC', 'UPI', 'City']).font = { bold: true };
  for (const s of staff) {
    ws.addRow([
      s.id,
      fullName(s),
      `+${s.countryCode ?? ''} ${s.phoneNumber}`,
      s.email ?? '',
      s.department?.name ?? '',
      s.info?.designation ?? '',
      fmtDate(s.info?.dateOfJoining) ?? '',
      Number(s.salaryAmount ?? 0),
      s.isDeactivated ? 'Deactivated' : 'Active',
      s.bank?.bankName ?? '',
      s.bank?.accountNumber ?? '',
      s.bank?.ifscCode ?? '',
      s.bank?.upiId ?? '',
      s.profile?.city ?? '',
    ]);
  }
  ws.columns.forEach((c) => (c.width = 20));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// re-exported so routes can share the same zod helpers
export { bool, int };
