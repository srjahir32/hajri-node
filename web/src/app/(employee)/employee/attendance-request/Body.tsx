'use client';

import { useStaff } from '@/lib/query';
import { fmtDate, fmtHm, fmtTime12 } from '@/lib/format';
import { StaffListTable, STATUS_BADGE } from '@/components/attendance/StaffListTable';

interface Req { request_id: number; date: string; in_time: string | null; out_time: string | null; total_seconds: number; approval: number; status?: number }

export default function Body() {
  const q = useStaff<Req[]>('/employee/attendance-requests', { size: 100 });
  const rows = (q.data?.data ?? []).map((r) => ({ ...r, status: r.approval }));
  return (
    <StaffListTable
      title="Attendance management"
      crumbs={['Attendance management', 'Attendance Request']}
      addLabel="Add Attendance Request"
      addHref="/employee/attendance-request/add-attendance-request"
      rows={rows}
      searchText={(r) => `${r.date} ${r.in_time ?? ''}`}
      head={<tr><th>Date</th><th>In Time</th><th>Out Time</th><th>Staff Time</th><th>Created By</th><th className="data_list_check">Status</th></tr>}
      columns={[
        { data: 'date', render: (d: string) => fmtDate(d) },
        { data: 'in_time', render: (d: string | null) => (d ? fmtTime12(d) : '-') },
        { data: 'out_time', render: (d: string | null) => (d ? fmtTime12(d) : '-') },
        { data: 'total_seconds', render: (d: number) => (d ? fmtHm(d) : '-') },
        { data: null, render: () => 'Self' },
        { data: 'approval', render: (d: number) => STATUS_BADGE(d) },
      ]}
    />
  );
}
