'use client';

import { useStaff } from '@/lib/query';
import { fmtDate } from '@/lib/format';
import { StaffListTable, STATUS_BADGE } from '@/components/attendance/StaffListTable';

interface Leave { id: number; leave_type: string; shift_type: string | null; start_date: string; end_date: string; requested_date: string; status: number }
const duration = (a: string, b: string) => {
  const n = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1;
  return `${n} Day${n > 1 ? 's' : ''}`;
};

export default function Body() {
  const q = useStaff<Leave[]>('/employee/leaves', { size: 100 });
  return (
    <StaffListTable
      title="Leaves"
      crumbs={['Leaves', 'Leave']}
      addLabel="Apply Leave"
      addHref="/employee/leaves/add-leave"
      rows={q.data?.data ?? []}
      searchText={(r) => `${r.leave_type} ${r.start_date} ${r.end_date}`}
      head={<tr><th>Leave duration</th><th>Shift Type</th><th>Leave Type</th><th>Start Date</th><th>End Date</th><th>Requested Date</th><th className="data_list_check">Status</th></tr>}
      columns={[
        { data: null, render: (_d: unknown, _t: string, r: Leave) => duration(r.start_date, r.end_date) },
        { data: 'shift_type', render: (d: string | null) => d ?? '-' },
        { data: 'leave_type' },
        { data: 'start_date', render: (d: string) => fmtDate(d) },
        { data: 'end_date', render: (d: string) => fmtDate(d) },
        { data: 'requested_date', render: (d: string) => fmtDate(d) },
        { data: 'status', render: (d: number) => STATUS_BADGE(d) },
      ]}
    />
  );
}
