'use client';

import { useMemo, useRef, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { useAction, useAdmin } from '@/lib/query';
import { PUNCH_ICONS } from '@/lib/punchIcons';
import { esc } from '@/lib/bs';
import { fmtDate, monthStr } from '@/lib/format';
import { CustomDropdown } from '@/components/widgets/CustomDropdown';
import { DataTable } from '@/components/widgets/DataTable';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { PRIMARY_BTN } from '@/components/settings/SettingsCard';

interface Item {
  id: number; staff_id: number; status: number; attendance_status?: number;
  date?: string; in_time?: string | null; out_time?: string | null;
  leave_type?: string; start_date?: string; end_date?: string; requested_date?: string;
  staff: { full_name?: string; name?: string; photo: string | null; department?: { name: string } | string | null; department_id?: number | null };
}
const ym = () => (typeof window !== 'undefined' ? window.sessionStorage.getItem('payroll.month') : null) ?? monthStr();
const range = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return { from: `${m}-01`, to: `${m}-${String(new Date(y, mo, 0).getDate()).padStart(2, '0')}` };
};
const days = (a?: string, b?: string) => (a && b ? Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1 : 1);
const ICON_OK = PUNCH_ICONS[0];
const ICON_NO = PUNCH_ICONS[1];

/** "Approve punches" / "Approve leaves" step of the payroll flow: pending items of the payroll month. */
export function PayrollApproveTable({ kind }: { kind: 'punches' | 'leaves' }) {
  const leaves = kind === 'leaves';
  const { can } = useAdminSession();
  const month = ym();
  const [dept, setDept] = useState('');
  const [search, setSearch] = useState('');
  const depts = useAdmin<{ id: number; name: string }[]>('/admin/departments').data?.data ?? [];
  const q = useAdmin<Item[]>(leaves ? '/admin/attendance/leaves' : '/admin/attendance/punches', { ...range(month), size: 200 }, { keepPrevious: true });
  const deptName = depts.find((d) => String(d.id) === dept)?.name;
  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (q.data?.data ?? []).filter((r) => {
      const name = r.staff.full_name ?? r.staff.name ?? '';
      const dn = typeof r.staff.department === 'string' ? r.staff.department : r.staff.department?.name;
      return (!deptName || dn === deptName) && (!t || name.toLowerCase().includes(t));
    });
  }, [q.data, search, deptName]);
  const checked = useRef(new Set<number>());
  const [, force] = useState(0);
  const decide = useAction((v: { ids: number[]; action: 'approve' | 'reject' }) => adminApi.post(leaves ? '/admin/attendance/leaves/decide' : '/admin/attendance/requests/decide', v), { invalidate: ['/admin/attendance', '/admin/payroll'] });
  const state = (r: Item) => (leaves ? r.status : r.attendance_status ?? 0);
  const canOk = can(leaves ? 'approve_leave' : 'approve_punches');
  const canNo = can(leaves ? 'rejected_leave' : 'rejected_punches');
  const badge = (n: number) => (n === 1 ? '<span class="badge bg-success">Approved</span>' : n === 2 ? '<span class="badge bg-danger">Rejected</span>' : '<span class="badge bg-warning text-dark">Pending</span>');

  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title={leaves ? 'Approve leaves' : 'Approve Punches'} crumbs={['Payroll', 'Approve', leaves ? 'Approve Leaves' : 'Approve Punches']} />
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
                <div className={`approve_staff_data reports_attendance_table${leaves ? ' review-table' : ''}`}>
                  <DataTable
                    id="staff_datas"
                    className="display dataTable no-footer dtr-inline"
                    deps={[rows]}
                    head={
                      leaves
                        ? <tr><th className="data_list_check"><input type="checkbox" id="selectAllCheckbox" /></th><th>Staff Name</th><th>Applied Date</th><th>Leave Type</th><th>Start Date</th><th>End date</th><th>Duration</th><th>Status</th><th>Approve/Decline</th></tr>
                        : <tr><th className="data_list_check"><input type="checkbox" id="selectAllCheckbox" /></th><th>Staff Name</th><th>Date</th><th>In time</th><th>Out Time</th><th>Status</th><th>Approve/Decline</th><th>Staff Logs</th></tr>
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
                        { data: 'id', orderable: false, render: (_d: number, _t: string, r: Item) => `<input type="checkbox" class="selectCheckbox_model" value="${r.id}" ${checked.current.has(r.id) ? 'checked' : ''}>` },
                        { data: null, render: (_d: unknown, _t: string, r: Item) => { const dn = typeof r.staff.department === 'string' ? r.staff.department : r.staff.department?.name; return `<a href="/staff/staff-profile-new/${r.staff_id}" class="staff-edit"><div class="user-images"><div><img src="${esc(r.staff.photo ?? '/assets/admin/images/dummy/dummy-user.svg')}" class="approve-user-img" alt=""></div><div>${esc(r.staff.full_name ?? r.staff.name)}<p class="data-sub-field">${dn ? esc(dn) : "<span style='color: red!important;'>No Department Assigned</span>"}</p></div></div></a>`; } },
                        ...(leaves
                          ? [
                              { data: 'requested_date', render: (d: string) => fmtDate(d) },
                              { data: 'leave_type' },
                              { data: 'start_date' },
                              { data: 'end_date' },
                              { data: null, render: (_d: unknown, _t: string, r: Item) => `${days(r.start_date, r.end_date)} Day` },
                            ]
                          : [
                              { data: 'date', render: (d: string) => fmtDate(d) },
                              { data: 'in_time', render: (d: string | null) => (d ? d.slice(0, 5) : '-') },
                              { data: 'out_time', render: (d: string | null) => (d ? d.slice(0, 5) : '-') },
                            ]),
                        { data: null, render: (_d: unknown, _t: string, r: Item) => badge(state(r)) },
                        {
                          data: null,
                          orderable: false,
                          render: (_d: unknown, _t: string, r: Item) =>
                            `<div class="approve-main-sec">${canOk ? `<button class="atten-coming-btn approve_success ${state(r) === 1 ? 'approve_success_btn' : ''}" data-decide="approve" data-id="${r.id}">${ICON_OK}</button>` : ''}${canNo ? `<button class="atten-coming-btn reject_danger ${state(r) === 2 ? 'reject_danger_btn' : ''}" data-decide="reject" data-id="${r.id}">${ICON_NO}</button>` : ''}</div>`,
                        },
                        ...(leaves ? [] : [{ data: null, orderable: false, defaultContent: '' }]),
                      ],
                    })}
                    onReady={(_api, box, $) => {
                      const onRow = function (this: HTMLInputElement) {
                        if (this.checked) checked.current.add(Number(this.value));
                        else checked.current.delete(Number(this.value));
                        force((n) => n + 1);
                      };
                      const onAll = function (this: HTMLInputElement) {
                        $(box).find('.selectCheckbox_model').each((_i: number, el: HTMLInputElement) => {
                          el.checked = this.checked;
                          if (this.checked) checked.current.add(Number(el.value));
                          else checked.current.delete(Number(el.value));
                        });
                      };
                      const onDecide = function (this: HTMLElement) {
                        decide.mutate({ ids: [Number(this.dataset.id)], action: this.dataset.decide as 'approve' | 'reject' });
                      };
                      $(box).on('change', '.selectCheckbox_model', onRow).on('change', 'thead input', onAll).on('click', 'thead input', (e: Event) => e.stopPropagation()).on('click', '[data-decide]', onDecide);
                      return () => $(box).off('change', '.selectCheckbox_model', onRow).off('change', 'thead input', onAll).off('click', '[data-decide]', onDecide);
                    }}
                  />
                </div>
              </div>
              <div className="staff-profile-btn">
                <a href="/payroll/payroll-approvals-new">
                  <button type="button" id="approve_step2_btn" className={`create-staff-btn staff-next-btn proxima_nova_semibold ${PRIMARY_BTN}`}>Next</button>
                </a>
              </div>
          </div>
        </div>
      </div>
    </main>
  );
}
