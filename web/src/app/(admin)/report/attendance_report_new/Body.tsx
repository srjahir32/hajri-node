'use client';

import { ReportTable, type ReportCfg } from '@/components/reports/ReportTable';
import { fmtHm } from '@/lib/format';

interface R { staff_id: number; name: string; department: string | null; present: number; absent: number; half_day: number; worked_seconds: number }
const range = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return { from: `${ym}-01`, to: `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}` };
};
const cfg: ReportCfg<R> = {
  title: 'Attendance Reports',
  heading: [],
  endpoint: '/admin/reports/attendance',
  query: range,
  month: true,
  toRows: (d) => d.map((r) => ({ id: r.staff_id, name: r.name, department: r.department, cells: [r.present + r.half_day * 0.5, r.absent, fmtHm(r.worked_seconds)] })),
  columns: ['Present Days', 'Absent Days', 'Total Work Hours'],
  exportPath: '/admin/reports/attendance/export',
  exportQuery: (ym, ids) => ({ ...range(ym), ...(ids.length === 1 ? { staff_id: ids[0] } : {}) }),
  exportName: 'attendance-report.xlsx',
  exportId: 'export_excel',
  wrap: { top: 'report_atten_report', right: 'report_atten_right_data', table: 'reports_attendance_table' },
};

export default function Body() {
  return <ReportTable cfg={cfg} />;
}
