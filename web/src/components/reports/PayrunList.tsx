'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdmin } from '@/lib/query';
import { monthStr } from '@/lib/format';
import { toast } from '@/lib/toast';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { DataTable } from '@/components/widgets/DataTable';
import { MonthPicker } from '@/components/widgets/MonthPicker';

interface Payrun { id: number; month: number; year: number; created_at: string }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOWNLOAD = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F8CFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
const when = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('en-GB', { month: 'long' })}, ${d.getFullYear()} | ${d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
};

/** "Report Cycle → generated payroll runs → download" table shared by Bulk Salary Slip and Staff Payroll Report. */
export function PayrunList({ title, kind }: { title: string; kind: 'slips' | 'payroll' }) {
  const [ym, setYm] = useState(monthStr());
  const month = Number(ym.slice(5));
  const year = Number(ym.slice(0, 4));
  const q = useAdmin<Payrun[]>('/admin/reports/payruns', { month, year }, { keepPrevious: true });
  const rows = q.data?.data ?? [];
  const download = async () => {
    try {
      if (kind === 'slips') await adminApi.download('/admin/reports/salary-slips', { month, year }, 'salary-slips.pdf');
      else await adminApi.download('/admin/payroll/export', { month, year }, 'payroll.xlsx');
      toast.success('Your file is being downloaded.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Somthing went wrong.');
    }
  };
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title={title} crumbs={['Reports', 'Payroll Reports', title]} />
          {kind === 'slips' ? (
            <div className="shift-main-inner-edit">
              <div className="shift-inner-sub-label-edit">
                <label className="shift-type-label">Report Cycle</label>
                <MonthPicker id="datepicker" className="datepicker_list form-control shift-edit-input attendance_status_month" value={ym} onChange={setYm} />
              </div>
            </div>
          ) : (
            <div className="dashboard_current_day_txt">
              <div className="row">
                <div className="col-12 text-end">
                  <MonthPicker id="datepicker" className="selected_date attendance_status_month proxima_nova_semibold" value={ym} onChange={setYm} />
                </div>
              </div>
            </div>
          )}
          <div className={kind === 'slips' ? 'payroll-approval-review payroll-report-review' : 'approve-payroll-data'}>
            <div className={kind === 'slips' ? 'approve-report-data approve-payroll-data' : undefined}>
              <DataTable
                id="staff_datas"
                className="display dataTable no-footer dtr-inline"
                deps={[rows]}
                head={<tr><th>{kind === 'slips' ? 'Staff Type' : 'Staff Payment Type'}</th><th>Report Cycle</th><th>Report Type</th><th>Generated On</th><th>Action</th></tr>}
                options={() => ({
                  data: rows,
                  searching: false,
                  lengthChange: false,
                  info: false,
                  responsive: true,
                  order: [],
                  columns: [
                    { data: null, render: () => 'Non Weekly Staff' },
                    { data: null, render: (_d: unknown, _t: string, r: Payrun) => `${MON[r.month - 1]}${kind === 'slips' ? '' : ','} ${r.year}` },
                    { data: null, render: () => 'Half Page' },
                    { data: 'created_at', render: (d: string) => when(d) },
                    { data: null, orderable: false, render: () => `<div data-dl style="cursor:pointer">${DOWNLOAD}</div>` },
                  ],
                })}
                onReady={(_api, box, $) => {
                  const h = () => void download();
                  $(box).on('click', '[data-dl]', h);
                  return () => $(box).off('click', '[data-dl]', h);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
