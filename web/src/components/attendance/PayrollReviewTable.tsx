'use client';

import { useMemo, useRef, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { esc } from '@/lib/bs';
import { fmtHm, monthStr } from '@/lib/format';
import { toast } from '@/lib/toast';
import { CustomDropdown } from '@/components/widgets/CustomDropdown';
import { DataTable } from '@/components/widgets/DataTable';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { PRIMARY_BTN } from '@/components/settings/SettingsCard';
import { navigate } from '@/lib/navigate';

interface P { present_days: number; half_days: number; paid_leave_days: number; unpaid_leave_days: number; working_days: number; worked_seconds: number; overtime_seconds: number; salary_amount: number; base_salary: number; paid_leave_salary: number; overtime_salary: number; total_deduction: number; net_salary: number; payable_seconds_per_day: number }
interface Row { id: number; name: string; department: string | null; photo: string | null; department_id: number | null; attendance_reviewed: boolean; total_pay_reviewed: boolean; preview: P }
const ym = () => (typeof window !== 'undefined' ? window.sessionStorage.getItem('payroll.month') : null) ?? monthStr();
const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Attendance Review / Total Pay Review: one row per staff with the computed numbers; "Next" marks the ticked staff as reviewed. */
export function PayrollReviewTable({ kind }: { kind: 'attendance' | 'total_pay' }) {
  const att = kind === 'attendance';
  const month = Number(ym().slice(5));
  const year = Number(ym().slice(0, 4));
  const [dept, setDept] = useState('');
  const [search, setSearch] = useState('');
  const depts = useAdmin<{ id: number; name: string }[]>('/admin/departments').data?.data ?? [];
  const q = useAdmin<Row[]>('/admin/payroll', { month, year });
  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (q.data?.data ?? []).filter((r) => (!dept || String(r.department_id) === dept) && (!t || r.name.toLowerCase().includes(t)));
  }, [q.data, search, dept]);
  const checked = useRef(new Set<number>());
  const save = useAction(
    () => adminApi.post('/admin/payroll/review', { month, year, kind, staff_ids: [...checked.current].length ? [...checked.current] : rows.map((r) => r.id), reviewed: true }),
    { invalidate: ['/admin/payroll'], success: 'Review saved', onSuccess: () => window.setTimeout(() => (navigate('/payroll/payroll-approvals-new')), 600) },
  );
  const title = att ? 'Attendance Review' : 'Total Pay Review';
  const person = (r: Row) => `<a href="/staff/staff-profile-new/${r.id}" class="staff-edit"><div class="user-images"><div><img src="${esc(r.photo ?? '/assets/admin/images/dummy/dummy-user.svg')}" class="approve-user-img" alt=""></div><div>${esc(r.name)}<p class="data-sub-field">${r.department ? esc(r.department) : "<span style='color: red!important;'>No Department Assigned</span>"}</p></div></div></a>`;
  const hrs = (s: number) => fmtHm(s);

  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title={title} crumbs={['Payroll', att ? 'Reviews Details' : 'Review Details', title]} />
          <div>
            <div className="main-payroll-sec">
              <div className="shifts-data mb-2">
                <div className="filters sidebar-select approve-punch-data">
                  <CustomDropdown className="select-club-services" options={[{ value: '', label: 'All Department' }, ...depts.map((d) => ({ value: String(d.id), label: d.name }))]} value={dept} onChange={setDept} />
                </div>
              </div>
              <form onSubmit={(e) => e.preventDefault()}>
                <input className="input-search-rounded search-input" type="text" id="staff_data_find" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
              </form>
            </div>
              <div className="approve-main-content">
                <div className="approve_staff_data reports_attendance_table review-table">
                  <DataTable
                    id="staff_datas"
                    className="display dataTable no-footer dtr-inline"
                    deps={[rows]}
                    head={
                      att
                        ? <tr><th className="data_list_check"><input type="checkbox" id="selectAllCheckbox" /></th><th>Staff Name</th><th>Present</th><th>Absent</th><th>Half Day</th><th>Paid Leaves</th><th>Overtime</th></tr>
                        : <tr><th className="data_list_check"><input type="checkbox" id="selectAllCheckbox" /></th><th>Name</th><th>Total Hours</th><th>Worked Hours</th><th>Overtime</th><th>Salary</th><th>Base Income</th><th>Paid Leave Income</th><th>Overtime Income</th><th>Deduction</th><th>Net Payable Income</th></tr>
                    }
                    options={() => ({
                      data: rows,
                      searching: false,
                      lengthChange: false,
                      info: false,
                      responsive: true,
                      order: [],
                      columnDefs: [{ width: '10px', targets: 0, orderable: false }],
                      columns: [
                        { data: 'id', orderable: false, render: (_d: number, _t: string, r: Row) => `<input type="checkbox" class="selectCheckbox_model" value="${r.id}" ${checked.current.has(r.id) ? 'checked' : ''}>` },
                        { data: null, render: (_d: unknown, _t: string, r: Row) => person(r) },
                        ...(att
                          ? [
                              { data: null, render: (_d: unknown, _t: string, r: Row) => String(r.preview.present_days) },
                              { data: null, render: (_d: unknown, _t: string, r: Row) => String(Math.max(0, r.preview.working_days - r.preview.present_days - r.preview.half_days - r.preview.paid_leave_days)) },
                              { data: null, render: (_d: unknown, _t: string, r: Row) => String(r.preview.half_days) },
                              { data: null, render: (_d: unknown, _t: string, r: Row) => String(r.preview.paid_leave_days) },
                              { data: null, render: (_d: unknown, _t: string, r: Row) => hrs(r.preview.overtime_seconds) },
                            ]
                          : [
                              { data: null, render: (_d: unknown, _t: string, r: Row) => hrs(r.preview.working_days * r.preview.payable_seconds_per_day) },
                              { data: null, render: (_d: unknown, _t: string, r: Row) => hrs(r.preview.worked_seconds) },
                              { data: null, render: (_d: unknown, _t: string, r: Row) => hrs(r.preview.overtime_seconds) },
                              { data: null, render: (_d: unknown, _t: string, r: Row) => money(r.preview.salary_amount) },
                              { data: null, render: (_d: unknown, _t: string, r: Row) => money(r.preview.base_salary) },
                              { data: null, render: (_d: unknown, _t: string, r: Row) => money(r.preview.paid_leave_salary) },
                              { data: null, render: (_d: unknown, _t: string, r: Row) => money(r.preview.overtime_salary) },
                              { data: null, render: (_d: unknown, _t: string, r: Row) => money(r.preview.total_deduction) },
                              { data: null, render: (_d: unknown, _t: string, r: Row) => money(r.preview.net_salary) },
                            ]),
                      ],
                    })}
                    onReady={(_api, box, $) => {
                      const onRow = function (this: HTMLInputElement) {
                        if (this.checked) checked.current.add(Number(this.value));
                        else checked.current.delete(Number(this.value));
                      };
                      const onAll = function (this: HTMLInputElement) {
                        $(box).find('.selectCheckbox_model').each((_i: number, el: HTMLInputElement) => {
                          el.checked = this.checked;
                          if (this.checked) checked.current.add(Number(el.value));
                          else checked.current.delete(Number(el.value));
                        });
                      };
                      $(box).on('change', '.selectCheckbox_model', onRow).on('change', 'thead input', onAll).on('click', 'thead input', (e: Event) => e.stopPropagation());
                      return () => $(box).off('change', '.selectCheckbox_model', onRow).off('change', 'thead input', onAll);
                    }}
                  />
                </div>
              </div>
              <div className="staff-profile-btn  review-details-btn">
                <button type="button" id="approve_step2_btn" className={`create-staff-btn staff-next-btn proxima_nova_semibold ${PRIMARY_BTN}`} disabled={save.isPending} onClick={() => (rows.length ? save.mutate() : toast.error('No staff to review'))}>Next</button>
              </div>
          </div>
        </div>
      </div>
    </main>
  );
}
