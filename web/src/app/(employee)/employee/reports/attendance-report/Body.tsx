'use client';

import { useMemo, useState } from 'react';
import { staffApi } from '@/lib/api';
import { useStaff } from '@/lib/query';
import { esc } from '@/lib/bs';
import { fmtDate, fmtHm, fmtTime12, monthStr } from '@/lib/format';
import { toast } from '@/lib/toast';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { CustomDropdown } from '@/components/widgets/CustomDropdown';
import { DataTable } from '@/components/widgets/DataTable';
import { MonthPicker } from '@/components/widgets/MonthPicker';

interface Day { date: string; status: string; break_seconds: number; total_seconds: number; overtime_seconds: number; punches: { in_time: string | null; out_time: string | null }[] }
const BADGE: Record<string, string> = { Present: 'bg-success', Absent: 'bg-danger', 'Half Day': 'bg-warning', Holiday: 'bg-info' };
const PER_PAGE = [{ value: 'all', label: 'All' }, { value: '10perpage', label: '10 Per Page' }, { value: '50perpage', label: '50 Per Page' }, { value: '100perpage', label: '100 Per Page' }];
const lines = (xs: (string | null)[]) => (xs.length ? xs.map((t) => (t ? fmtTime12(t) : '-')).join('<br>') : '-');

export default function Body() {
  const [ym, setYm] = useState(monthStr());
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState('10perpage');
  const month = Number(ym.slice(5));
  const year = Number(ym.slice(0, 4));
  const q = useStaff<Day[]>('/employee/attendance', { month, year }, { keepPrevious: true });
  const rows = useMemo(() => (q.data?.data ?? []).filter((d) => !search.trim() || d.date.includes(search.trim())), [q.data, search]);
  const pageLen = perPage === 'all' ? -1 : parseInt(perPage);
  const exportIt = async () => {
    try {
      await staffApi.download('/employee/attendance/export', { month, year }, 'attendance.xlsx');
      toast.success('Your files is being downloaded');
    } catch {
      toast.error('Somthing went wrong.');
    }
  };
  return (
    <main className="flex-1 p-md-5 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title="Attendance Reports" crumbs={['Reports', 'Attendance Reports']} />
          <div className="main-content-inner on-time-main main-atten">
            <div className="approve-datas atten-datas report-main-list attendance_reports_table_top report_atten_report ">
              <div className="atten-data-search assign-data-search report_data col-6">
                <form onSubmit={(e) => e.preventDefault()}>
                  <input className="input-search-rounded" type="text" id="staff_data_find" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                </form>
              </div>
              <div className="approve-right-data report_atten_right_data col-6">
                <div className="approve-data-download dropdown-toggle proxima_nova_bold report_data_download">
                  <a id="export_excel" onClick={() => void exportIt()} style={{ cursor: 'pointer' }}>
                    <div className="export_report_data">
                      <p className="export_data_report section_sub_title">Export</p>
                      <div className="report_down_img">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/admin/images/approve_punches/download-report.svg" alt="" /></div>
                    </div>
                  </a>
                </div>
                <CustomDropdown className="business_selct_box" options={PER_PAGE} value={perPage} onChange={setPerPage} selectClassName="mySelect_pagi number_page_sorting" />
                <div className="input-group date">
                  <MonthPicker id="calender_date" className="form-control input-group-addon proxima_nova_semibold calender-picker" value={ym} onChange={setYm} />
                </div>
              </div>
            </div>
            <div className="approve_staff_data reports_attendance_table">
              <DataTable
                id="staff_datas"
                deps={[rows, pageLen]}
                head={<tr><th>Date</th><th>In Time</th><th>Out Time</th><th>Break Time</th><th>Staff Time</th><th className="data_list_check">Status</th><th>Overtime</th></tr>}
                options={() => ({
                  data: [...rows].reverse(),
                  searching: false,
                  lengthChange: false,
                  info: false,
                  responsive: true,
                  order: [],
                  pageLength: pageLen,
                  columns: [
                    { data: 'date', render: (d: string) => fmtDate(d) },
                    { data: null, render: (_d: unknown, _t: string, r: Day) => lines(r.punches.map((p) => p.in_time)) },
                    { data: null, render: (_d: unknown, _t: string, r: Day) => lines(r.punches.map((p) => p.out_time)) },
                    { data: 'break_seconds', render: (d: number) => (d ? fmtHm(d) : '00:00') },
                    { data: 'total_seconds', render: (d: number) => (d ? fmtHm(d) : '00:00') },
                    { data: 'status', render: (d: string) => `<span class="badge ${BADGE[d] ?? 'bg-secondary'}">${esc(d)}</span>` },
                    { data: 'overtime_seconds', render: (d: number) => (d ? fmtHm(d) : '-') },
                  ],
                })}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
