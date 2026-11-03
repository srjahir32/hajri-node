'use client';

import { ReportTable, type ReportCfg } from '@/components/reports/ReportTable';
import { fmtHm } from '@/lib/format';

interface R { id: number; full_name: string; phone_number: string; department: { name: string } | null; photo: string | null; salary_amount: number | null }
const cfg: ReportCfg<R> = {
  title: 'User List export',
  heading: [],
  endpoint: '/admin/reports/staff',
  query: () => ({ status: 'active' }),
  month: false,
  toRows: (d) => d.map((r) => ({ id: r.id, name: r.full_name, department: r.department?.name ?? null, photo: r.photo, cells: ['Monthly', r.phone_number] })),
  columns: ['Salary Payment Type', 'Phone Number'],
  exportPath: '/admin/reports/staff/export',
  exportQuery: () => ({}),
  exportName: 'staff.xlsx',
  exportId: 'user_export',
  wrap: { top: 'report_atten_report', right: 'report-user-list-data', table: 'user_list_table', main: 'report_user_list_export' },
};

export default function Body() {
  return <ReportTable cfg={cfg} />;
}
