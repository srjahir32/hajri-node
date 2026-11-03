import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { DateTime } from 'luxon';
import { prisma } from '../lib/prisma';
import { badRequest } from '../lib/errors';
import { dateOnly, eachDate, fmtDate, secondsToHm } from '../lib/time';
import { businessTz, holidayCalendar } from './context.service';
import { summarizeDay } from './attendance.service';
import { monthRange, payrollOverview, asStaffName } from './payroll.service';

const MAX_RANGE_DAYS = 62;

const CODE: Record<string, string> = {
  Present: 'P',
  Absent: 'A',
  'Half Day': 'HD',
  'Paid Leave': 'PL',
  Leave: 'L',
  Holiday: 'H',
  Pending: 'PN',
  'Not Marked': '-',
};

export interface AttendanceReportRow {
  staff_id: number;
  name: string;
  department: string | null;
  days: { date: string; status: string; code: string; total_seconds: number }[];
  present: number;
  absent: number;
  half_day: number;
  leave: number;
  holidays: number;
  late: number;
  worked_seconds: number;
  overtime_seconds: number;
}

export async function attendanceReport(businessId: number, f: { from: string; to: string; departmentId?: number; staffId?: number; search?: string }) {
  const dates = eachDate(f.from, f.to);
  if (!dates.length) throw badRequest('Invalid date range');
  if (dates.length > MAX_RANGE_DAYS) throw badRequest(`Choose a range of at most ${MAX_RANGE_DAYS} days`);
  const tz = await businessTz(businessId);
  const staff = await prisma.staff.findMany({
    where: {
      businessId,
      deletedAt: null,
      ...(f.departmentId ? { departmentId: f.departmentId } : {}),
      ...(f.staffId ? { id: f.staffId } : {}),
      ...(f.search ? { name: { contains: f.search } } : {}),
    },
    include: { department: true },
    orderBy: { name: 'asc' },
  });
  const ids = staff.map((s) => s.id);
  const [rows, leaves, holidayFor] = await Promise.all([
    prisma.attendance.findMany({ where: { staffId: { in: ids }, deletedAt: null, date: { gte: dateOnly(f.from), lte: dateOnly(f.to) } }, orderBy: { id: 'asc' } }),
    prisma.staffLeave.findMany({ where: { staffId: { in: ids }, status: 1, deletedAt: null, startDate: { lte: dateOnly(f.to) }, endDate: { gte: dateOnly(f.from) } } }),
    holidayCalendar(businessId, undefined, dates),
  ]);

  const out: AttendanceReportRow[] = staff.map((s) => {
    const mine = rows.filter((r) => r.staffId === s.id);
    const myLeaves = leaves.filter((l) => l.staffId === s.id);
    const row: AttendanceReportRow = {
      staff_id: s.id,
      name: asStaffName(s),
      department: s.department?.name ?? null,
      days: [],
      present: 0,
      absent: 0,
      half_day: 0,
      leave: 0,
      holidays: 0,
      late: 0,
      worked_seconds: 0,
      overtime_seconds: 0,
    };
    for (const date of dates) {
      const dayRows = mine.filter((r) => fmtDate(r.date) === date);
      const leave = myLeaves.find((l) => fmtDate(l.startDate)! <= date && fmtDate(l.endDate)! >= date) ?? null;
      const sum = summarizeDay(date, dayRows, tz, { leave, holiday: holidayFor(date) });
      row.days.push({ date, status: sum.status, code: CODE[sum.status] ?? '-', total_seconds: sum.total_seconds });
      if (sum.status === 'Present') row.present++;
      else if (sum.status === 'Absent') row.absent++;
      else if (sum.status === 'Half Day') row.half_day++;
      else if (sum.status === 'Leave' || sum.status === 'Paid Leave') row.leave++;
      else if (sum.status === 'Holiday') row.holidays++;
      if (sum.behavior === 'Late') row.late++;
      row.worked_seconds += sum.total_seconds;
      row.overtime_seconds += sum.overtime_seconds;
    }
    return row;
  });
  return { dates, rows: out };
}

export async function attendanceReportXlsx(businessId: number, f: Parameters<typeof attendanceReport>[1]): Promise<Buffer> {
  const { dates, rows } = await attendanceReport(businessId, f);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Attendance');
  ws.addRow([`Attendance report ${f.from} to ${f.to}`]).font = { bold: true, size: 13 };
  ws.addRow([]);
  const head = ws.addRow(['Staff', 'Department', ...dates.map((d) => d.slice(8)), 'Present', 'Absent', 'Half Day', 'Leave', 'Holidays', 'Late', 'Worked (h:m)', 'Overtime (h:m)']);
  head.font = { bold: true };
  for (const r of rows) {
    ws.addRow([r.name, r.department ?? '', ...r.days.map((d) => d.code), r.present, r.absent, r.half_day, r.leave, r.holidays, r.late, secondsToHm(r.worked_seconds), secondsToHm(r.overtime_seconds)]);
  }
  ws.getColumn(1).width = 26;
  ws.getColumn(2).width = 18;
  ws.addRow([]);
  ws.addRow(['P = Present, A = Absent, HD = Half Day, PL/L = Leave, H = Holiday, PN = Pending approval']);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function salaryReportXlsx(businessId: number, year: number, month: number, opts: { departmentId?: number }): Promise<Buffer> {
  const rows = await payrollOverview(businessId, year, month, opts);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Salary');
  ws.addRow([`Salary report – ${monthRange(year, month).label}`]).font = { bold: true, size: 13 };
  ws.addRow([]);
  ws.addRow(['Staff ID', 'Name', 'Department', 'Monthly Salary', 'Worked (h:m)', 'Overtime (h:m)', 'Base + Leave', 'Overtime Pay', 'Deductions', 'PF', 'Net Salary', 'Status']).font = { bold: true };
  for (const r of rows) {
    const p = r.payroll;
    const pv = r.preview;
    ws.addRow([
      r.staff_code,
      r.name,
      r.department ?? '',
      r.salary_amount,
      secondsToHm(r.worked_seconds),
      secondsToHm(r.overtime_seconds),
      p ? p.base_salary : (pv?.base_salary ?? 0) + (pv?.paid_leave_salary ?? 0),
      p ? p.overtime_salary : pv?.overtime_salary ?? 0,
      p ? p.break_deduction + p.late_deduction + p.early_deduction : (pv?.break_deduction ?? 0) + (pv?.late_deduction ?? 0) + (pv?.early_deduction ?? 0),
      p ? p.pf_cut : pv?.pf_cut ?? 0,
      r.net_salary,
      r.processed ? 'Processed' : 'Not processed',
    ]);
  }
  const total = rows.reduce((s, r) => s + r.net_salary, 0);
  ws.addRow([]);
  ws.addRow(['', '', '', '', '', '', '', '', '', 'Total', Math.round(total * 100) / 100]).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 17));
  ws.getColumn(2).width = 26;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const money = (n: number) => `INR ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** One page per staff member. Uses processed payroll rows only. */
export async function salarySlipsPdf(businessId: number, year: number, month: number, staffIds?: number[]): Promise<Buffer> {
  const payrolls = await prisma.payroll.findMany({
    where: { businessId, month, year, ...(staffIds?.length ? { staffId: { in: staffIds } } : {}) },
    include: { staff: { include: { department: true, info: true, bank: true } }, business: true },
    orderBy: { staff: { name: 'asc' } },
  });
  if (!payrolls.length) throw badRequest('No processed payroll found for this month. Process payroll first.');
  const label = monthRange(year, month).label;

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  payrolls.forEach((p, i) => {
    if (i > 0) doc.addPage();
    const n = (v: unknown) => Number(v ?? 0);
    const s = p.staff;
    doc.fontSize(18).font('Helvetica-Bold').text(p.business.name, { align: 'center' });
    if (p.business.businessAddress) doc.fontSize(9).font('Helvetica').fillColor('#555').text(p.business.businessAddress, { align: 'center' });
    doc.moveDown(0.6).fillColor('#000').fontSize(13).font('Helvetica-Bold').text(`Salary slip – ${label}`, { align: 'center' });
    doc.moveDown(1);

    const info: [string, string][] = [
      ['Employee', asStaffName(s)],
      ['Employee ID', `${p.business.name.slice(0, 3).toUpperCase()}${s.id}`],
      ['Department', s.department?.name ?? '-'],
      ['Designation', s.info?.designation ?? '-'],
      ['Date of joining', fmtDate(s.info?.dateOfJoining) ?? '-'],
      ['Bank account', s.bank?.accountNumber ? `${s.bank.bankName ?? ''} ${s.bank.accountNumber}` : '-'],
      ['Working days', String(p.workingDays)],
      ['Present days', String(p.presentDays)],
      ['Paid leave days', String(p.paidLeaveDays)],
      ['Worked time', secondsToHm(p.workedSeconds)],
    ];
    doc.fontSize(10).font('Helvetica');
    info.forEach(([k, v]) => {
      const y = doc.y;
      doc.fillColor('#666').text(k, 48, y, { width: 160 });
      doc.fillColor('#000').text(v, 210, y, { width: 330 });
    });

    doc.moveDown(1.2);
    const table = (title: string, lines: [string, number][], total: [string, number]) => {
      doc.font('Helvetica-Bold').fontSize(11).text(title);
      doc.moveTo(48, doc.y + 2).lineTo(547, doc.y + 2).strokeColor('#ccc').stroke();
      doc.moveDown(0.5).font('Helvetica').fontSize(10);
      lines.forEach(([k, v]) => {
        const y = doc.y;
        doc.text(k, 48, y, { width: 330 });
        doc.text(money(v), 380, y, { width: 167, align: 'right' });
      });
      const y = doc.y + 4;
      doc.font('Helvetica-Bold').text(total[0], 48, y, { width: 330 });
      doc.text(money(total[1]), 380, y, { width: 167, align: 'right' });
      doc.font('Helvetica').moveDown(1.2);
    };
    const earnings = n(p.baseSalary) + n(p.overtimeSalary);
    table('Earnings', [['Base salary (incl. paid leave)', n(p.baseSalary)], ['Overtime pay', n(p.overtimeSalary)]], ['Total earnings', earnings]);
    table(
      'Deductions',
      [['Break time deduction', n(p.breakDeduction)], ['Late entry deduction', n(p.lateDeduction)], ['Early exit deduction', n(p.earlyDeduction)], ['Provident fund (employee)', n(p.pfCut)]],
      ['Total deductions', n(p.breakDeduction) + n(p.lateDeduction) + n(p.earlyDeduction) + n(p.pfCut)],
    );
    doc.rect(48, doc.y, 499, 30).fill('#eef6ff');
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(12).text('Net salary', 58, doc.y - 22, { continued: false });
    doc.text(money(n(p.netSalary)), 380, doc.y - 15, { width: 157, align: 'right' });
    doc.font('Helvetica').fontSize(8).fillColor('#888').text(`Generated on ${DateTime.now().toFormat('dd LLL yyyy')} – this is a computer generated slip.`, 48, 780, { align: 'center', width: 499 });
    doc.fillColor('#000');
  });

  doc.end();
  return done;
}
