import { Router } from 'express';
import { z } from 'zod';
import { DateTime } from 'luxon';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma';
import { ok, pageMeta, pageParams, wrap } from '../../lib/http';
import { adminBusinessId, can } from '../../middleware/auth';
import { badRequest } from '../../lib/errors';
import { fileUrl, folder, memoryUpload, upload } from '../../lib/upload';
import { idList, int, optInt, optStr, idParams } from '../../lib/validation';
import * as staffSvc from '../../services/staff.service';
import { monthCalendar, rangeCalendar, attendanceDto, summarizeDay, staffCard } from '../../services/attendance.service';
import { businessTz, staffTz } from '../../services/context.service';
import { todayIn, dateOnly, fmtDate } from '../../lib/time';

export const staffRouter = Router();
staffRouter.use(can('view_staff_management'));

const fields = upload.fields([
  { name: 'photos', maxCount: 5 },
  { name: 'documents', maxCount: 5 },
  { name: 'photo_face', maxCount: 1 },
]);

function collectFiles(req: Express.Request & { files?: unknown }) {
  const f = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
  return {
    photos: (f.photos ?? []).map(fileUrl),
    documents: (f.documents ?? []).map((d) => ({ url: fileUrl(d), name: d.originalname })),
    photoFace: f.photo_face?.[0] ? fileUrl(f.photo_face[0]) : undefined,
  };
}

staffRouter.get('/', wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const q = z.object({ search: optStr, department_id: optInt, status: z.enum(['active', 'deactivated', 'all']).optional() }).parse(req.query);
  const { page, size, skip, take } = pageParams(req.query, 20, 500);
  const today = todayIn(await businessTz(businessId));
  const list = await staffSvc.listStaff(businessId, { search: q.search, departmentId: q.department_id, status: q.status }, skip, take, today);
  const [activeCount, deactivatedCount] = await Promise.all([
    prisma.staff.count({ where: { businessId, deletedAt: null, isDeactivated: false } }),
    prisma.staff.count({ where: { businessId, deletedAt: null, isDeactivated: true } }),
  ]);
  ok(res, list.data, 'success', { ...pageMeta(page, size, list.total), active_count: activeCount, deactivated_count: deactivatedCount });
}));

staffRouter.post('/', can('add_staff'), folder('staff'), fields, wrap(async (req, res) => {
  const businessId = adminBusinessId(req);
  const body = staffSvc.staffBody.parse(req.body);
  ok(res, await staffSvc.createStaff(businessId, body, collectFiles(req), req.admin!.user.id), 'Staff added successfully');
}));

// ── bulk import / export (declared before /:id) ──
staffRouter.get('/import-template', wrap(async (_req, res) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="staff-import-template.xlsx"');
  res.send(await staffSvc.importTemplate());
}));

staffRouter.post('/import', can('add_staff'), memoryUpload.single('file'), wrap(async (req, res) => {
  if (!req.file) throw badRequest('Upload an .xlsx file');
  const result = await staffSvc.importStaff(adminBusinessId(req), req.file.buffer, req.admin!.user.id);
  ok(res, result, `${result.created} staff imported${result.failed.length ? `, ${result.failed.length} failed` : ''}`);
}));

staffRouter.get('/export', wrap(async (req, res) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="staff.xlsx"');
  res.send(await staffSvc.exportStaff(adminBusinessId(req)));
}));

staffRouter.post('/bulk-delete', wrap(async (req, res) => {
  const { ids } = z.object({ ids: idList }).parse(req.body);
  ok(res, { deleted: await staffSvc.deleteStaff(adminBusinessId(req), ids) }, 'Delete successfully');
}));

staffRouter.get('/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  ok(res, await staffSvc.getStaffDetail(adminBusinessId(req), id));
}));

staffRouter.put('/:id', can('add_staff'), folder('staff'), fields, wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const body = staffSvc.staffBody.partial().parse(req.body);
  const extra = z
    .object({
      remove_photo_ids: z.preprocess((v) => (typeof v === 'string' ? v.split(',').filter(Boolean).map(Number) : v), z.array(z.number()).optional()),
      remove_document_ids: z.preprocess((v) => (typeof v === 'string' ? v.split(',').filter(Boolean).map(Number) : v), z.array(z.number()).optional()),
    })
    .parse(req.body);
  const files = { ...collectFiles(req), removePhotoIds: extra.remove_photo_ids, removeDocumentIds: extra.remove_document_ids };
  ok(res, await staffSvc.updateStaff(adminBusinessId(req), id, body, files, req.admin!.user.id), 'Update successfully');
}));

staffRouter.delete('/:id', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  await staffSvc.deleteStaff(adminBusinessId(req), [id]);
  ok(res, null, 'Delete successfully');
}));

staffRouter.post('/:id/deactivate', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  await staffSvc.setDeactivated(adminBusinessId(req), id, true, req.admin!.user.id);
  ok(res, null, 'Staff deactivated');
}));

staffRouter.post('/:id/activate', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  await staffSvc.setDeactivated(adminBusinessId(req), id, false, req.admin!.user.id);
  ok(res, null, 'Staff activated');
}));

/** Partial updates used by the profile tabs (bank details / employment info). */
staffRouter.patch('/:id/rules', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const b = z
    .object({
      overtime_rule: z.boolean().optional(),
      break_rule: z.boolean().optional(),
      late_entry_rule: z.boolean().optional(),
      early_exit_rule: z.boolean().optional(),
    })
    .parse(req.body);
  await prisma.staff.updateMany({
    where: { id, businessId: adminBusinessId(req) },
    data: {
      ...(b.overtime_rule !== undefined ? { overtimeRule: b.overtime_rule } : {}),
      ...(b.break_rule !== undefined ? { breakRule: b.break_rule } : {}),
      ...(b.late_entry_rule !== undefined ? { lateEntryRule: b.late_entry_rule } : {}),
      ...(b.early_exit_rule !== undefined ? { earlyExitRule: b.early_exit_rule } : {}),
    },
  });
  ok(res);
}));

/** Date-range version of the calendar (staff profile page): days that have no punch, leave or holiday are left out. */
staffRouter.get('/:id/attendance-range', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const businessId = adminBusinessId(req);
  const staff = await prisma.staff.findFirst({ where: { id, businessId, deletedAt: null } });
  if (!staff) throw badRequest('Staff not found');
  const q = z.object({ start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.query);
  const from = DateTime.fromISO(q.start);
  const to = DateTime.fromISO(q.end);
  const span = Math.min(366, Math.max(1, Math.round(to.diff(from, 'days').days) + 1));
  const dates = Array.from({ length: span }, (_, i) => from.plus({ days: i }).toISODate()!);
  const cal = await rangeCalendar(staff, dates);
  ok(res, cal);
}));

staffRouter.get('/:id/attendance-export', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const staff = await prisma.staff.findFirst({ where: { id, businessId: adminBusinessId(req), deletedAt: null } });
  if (!staff) throw badRequest('Staff not found');
  const q = z.object({ start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.query);
  const from = DateTime.fromISO(q.start);
  const span = Math.min(366, Math.max(1, Math.round(DateTime.fromISO(q.end).diff(from, 'days').days) + 1));
  const cal = await rangeCalendar(staff, Array.from({ length: span }, (_, i) => from.plus({ days: i }).toISODate()!));
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Attendance');
  ws.addRow([`${staff.name} – attendance ${q.start} to ${q.end}`]).font = { bold: true, size: 13 };
  ws.addRow([]);
  ws.addRow(['Date', 'First in', 'Last out', 'Worked', 'Status', 'Overtime', 'Note']).font = { bold: true };
  const hm = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
  for (const d of cal.days) if (d.punches.length) ws.addRow([d.date, d.first_in ?? '', d.last_out ?? '', hm(d.total_seconds), d.status, hm(d.overtime_seconds), d.note ?? '']);
  ws.columns.forEach((c) => (c.width = 16));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-${staff.id}-${q.start}-${q.end}.xlsx"`);
  res.send(Buffer.from(await wb.xlsx.writeBuffer()));
}));

staffRouter.get('/:id/attendance', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const businessId = adminBusinessId(req);
  const staff = await prisma.staff.findFirst({ where: { id, businessId, deletedAt: null }, include: { department: true, photos: { take: 1 } } });
  if (!staff) throw badRequest('Staff not found');
  const now = new Date();
  const q = z.object({ month: int.optional(), year: int.optional() }).parse(req.query);
  const cal = await monthCalendar(staff, q.year ?? now.getUTCFullYear(), q.month ?? now.getUTCMonth() + 1);
  ok(res, { staff: staffCard(staff), ...cal });
}));

staffRouter.get('/:id/logs', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const { page, size, skip, take } = pageParams(req.query, 30, 200);
  const where = { staffId: id, staff: { businessId: adminBusinessId(req) } };
  const [total, logs] = await Promise.all([
    prisma.staffLog.count({ where }),
    prisma.staffLog.findMany({ where, orderBy: { id: 'desc' }, skip, take, include: { user: { select: { name: true } } } }),
  ]);
  ok(res, logs.map((l) => ({ id: l.id, detail: l.detail, by: l.user?.name ?? null, created_at: l.createdAt.toISOString() })), 'success', pageMeta(page, size, total));
}));

staffRouter.get('/:id/day', wrap(async (req, res) => {
  const { id } = idParams.parse(req.params);
  const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.query);
  const staff = await prisma.staff.findFirst({ where: { id, businessId: adminBusinessId(req), deletedAt: null } });
  if (!staff) throw badRequest('Staff not found');
  const tz = await staffTz(staff);
  const rows = await prisma.attendance.findMany({ where: { staffId: id, date: dateOnly(date), deletedAt: null }, orderBy: { id: 'asc' } });
  const leave = await prisma.staffLeave.findFirst({ where: { staffId: id, status: 1, deletedAt: null, startDate: { lte: dateOnly(date) }, endDate: { gte: dateOnly(date) } } });
  const logs = await prisma.staffLog.findMany({ where: { staffId: id, createdAt: { gte: dateOnly(date), lt: new Date(dateOnly(date).getTime() + 86400000) } }, orderBy: { id: 'desc' }, include: { user: { select: { name: true } } } });
  ok(res, {
    staff: { id: staff.id, name: staff.name },
    summary: summarizeDay(date, rows, tz, { leave }),
    logs: logs.map((l) => ({ id: l.id, detail: l.detail, by: l.user?.name ?? null, created_at: l.createdAt.toISOString() })),
  });
}));
