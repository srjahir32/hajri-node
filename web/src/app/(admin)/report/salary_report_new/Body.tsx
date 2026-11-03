'use client';

import { ReportTable, type ReportCfg } from '@/components/reports/ReportTable';
import { fmtHm } from '@/lib/format';

interface R { id: number; name: string; department: string | null; photo: string | null; salary_amount: number | null; preview: { working_days: number; present_days: number; half_days: number; net_salary: number }; net_salary: number }
const cfg: ReportCfg<R> = {
  title: 'Salary Report',
  heading: [],
  endpoint: '/admin/reports/salary',
  query: (ym) => ({ month: Number(ym.slice(5)), year: Number(ym.slice(0, 4)) }),
  month: true,
  toRows: (d) => d.map((r) => ({ id: r.id, name: r.name, department: r.department, photo: r.photo, cells: [r.preview.working_days, r.preview.present_days + r.preview.half_days * 0.5, Math.max(0, r.preview.working_days - r.preview.present_days - r.preview.half_days * 0.5), `₹${Math.round(r.net_salary || r.preview.net_salary).toLocaleString('en-IN')}`] })),
  columns: ['Total Working Days', 'Present Days', 'Absent Days', 'Salary'],
  exportPath: '/admin/reports/salary/export',
  exportQuery: (ym) => ({ month: Number(ym.slice(5)), year: Number(ym.slice(0, 4)) }),
  exportName: 'salary-report.xlsx',
  exportId: 'salary_export',
  wrap: { top: 'report_salary_report', right: 'report_atten_right_data', table: 'salary_report_table' },
};

export default function Body() {
  return <ReportTable cfg={cfg} />;
}
