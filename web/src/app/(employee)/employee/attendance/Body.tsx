'use client';

import { useMemo, useState } from 'react';
import { useStaff } from '@/lib/query';
import { esc } from '@/lib/bs';
import { fmtHm, fmtTime12, monthStr } from '@/lib/format';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { CustomDropdown } from '@/components/widgets/CustomDropdown';
import { DataTable } from '@/components/widgets/DataTable';
import { MonthPicker } from '@/components/widgets/MonthPicker';

interface Punch { in_time: string | null; out_time: string | null }
interface Day { date: string; status: string; behavior: string | null; approval: number | null; break_seconds: number; total_seconds: number; overtime_seconds: number; punches: Punch[] }
const BADGE: Record<string, string> = { Present: 'bg-success', Absent: 'bg-danger', 'Half Day': 'bg-warning', Holiday: 'bg-info' };
const BEH: Record<string, string> = { Late: 'bg-red-500', Early: 'bg-orange-500', Regular: 'bg-green-500' };
const STATUS = [{ value: 'all', label: 'All' }, { value: 'Present', label: 'Present' }, { value: 'Absent', label: 'Absent' }, { value: 'Half Day', label: 'Half Day' }];
const PER_PAGE = [{ value: 'all', label: 'All' }, { value: '10perpage', label: '10 Per Page' }, { value: '50perpage', label: '50 Per Page' }, { value: '100perpage', label: '100 Per Page' }];
const style = 'color: #00365E; font-weight: 500; font-size: 14px;';
const lines = (xs: (string | null)[]) => (xs.length ? xs.map((t) => `<span style="${style}">${t ? fmtTime12(t) : '-'}</span>`).join('<br>') : '-');
const APPROVAL = ['Pending', 'Approved', 'Rejected'];

export default function Body() {
  const [ym, setYm] = useState(monthStr());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [perPage, setPerPage] = useState('10perpage');
  const q = useStaff<Day[]>('/employee/attendance', { month: Number(ym.slice(5)), year: Number(ym.slice(0, 4)) }, { keepPrevious: true });
  const rows = useMemo(() => (q.data?.data ?? []).filter((d) => (status === 'all' || d.status === status) && (!search.trim() || d.date.includes(search.trim()))).reverse(), [q.data, status, search]);
  const pageLen = perPage === 'all' ? -1 : parseInt(perPage);
  return (
    <main className="flex-1 p-md-5 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-8 max-w-[1600px] mx-auto">
          <BackCrumb title="Attendance management" crumbs={['Attendance management', 'Attendance']} />
          <div className="text-end mb-0">
            <div className="approve-right-data mb-0">
              <div className="input-group date">
                <MonthPicker id="calender_date" className="input-group-addon form-control proxima_nova_semibold calender-picker" value={ym} onChange={setYm} />
              </div>
            </div>
          </div>
          <div className="approve-datas atten-datas row mt-0">
            <div className="atten-data-search attendance-search assign-data-search col-md-6 col-sm-6">
              <input className="input-search-rounded search-input" type="text" id="staff_data_find" placeholder="YYYY-MM-DD" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="col-md-6 col-sm-6 staff-right-length">
              <div className="business_selct_box select_mate_option staff-option_select">
                <CustomDropdown options={STATUS} value={status} onChange={setStatus} prefix="Sort by " selectClassName="mySelect_sort status_filter" />
              </div>
              <CustomDropdown className="business_selct_box" options={PER_PAGE} value={perPage} onChange={setPerPage} selectClassName="mySelect_pagi number_page_sorting" />
            </div>
          </div>
          <div className="approve_staff_data">
            <DataTable
              id="staff_datas"
              deps={[rows, pageLen]}
              head={<tr><th>Date</th><th>In Time</th><th>Out Time</th><th>Break Time</th><th>Staff Time</th><th className="data_list_check">Status</th><th>Behavior</th><th>Overtime</th><th>Attendance Status</th></tr>}
              options={() => ({
                data: rows,
                searching: false,
                lengthChange: false,
                info: false,
                responsive: true,
                order: [],
                pageLength: pageLen,
                columns: [
                  { data: 'date' },
                  { data: null, render: (_d: unknown, _t: string, r: Day) => lines(r.punches.map((p) => p.in_time)) },
                  { data: null, render: (_d: unknown, _t: string, r: Day) => lines(r.punches.map((p) => p.out_time)) },
                  { data: 'break_seconds', render: (d: number) => (d ? fmtHm(d) : '00:00') },
                  { data: 'total_seconds', render: (d: number) => (d ? fmtHm(d) : '00:00') },
                  { data: 'status', render: (d: string) => `<span class="badge ${BADGE[d] ?? 'bg-label-primary'}">${esc(d)}</span>` },
                  { data: 'behavior', render: (d: string | null) => (d && BEH[d] ? `<span class="px-3 py-1 behavior rounded-full text-xs font-semibold ${BEH[d]} text-white shadow-sm ring-1 ring-white/20">${d}</span>` : '-') },
                  { data: 'overtime_seconds', render: (d: number) => (d ? fmtHm(d) : '-') },
                  { data: 'approval', render: (d: number | null) => (d == null ? '-' : APPROVAL[d] ?? '-') },
                ],
              })}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
