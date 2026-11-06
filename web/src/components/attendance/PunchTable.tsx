'use client';

import { useMemo, useRef, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { useAction, useAdmin } from '@/lib/query';
import { PUNCH_ICONS } from '@/lib/punchIcons';
import { esc } from '@/lib/bs';
import { fmtHm, todayStr } from '@/lib/format';
import { toast } from '@/lib/toast';
import { CustomDropdown } from '@/components/widgets/CustomDropdown';
import { DataTable } from '@/components/widgets/DataTable';
import { DatePicker } from '@/components/widgets/DatePicker';
import { BackCrumb } from '@/components/shell/BackCrumb';

interface Punch {
  id: number; staff_id: number; date: string; in_time: string | null; out_time: string | null; break_seconds: number; total_seconds: number; attendance_status: number;
  staff: { full_name: string; photo: string | null; department: { name: string } | null; department_id: number | null };
}
const hm12 = (t: string | null) => (t ? t.slice(0, 5) : '-');

/** `showLoading`: while the first request is pending (or after it failed) show that in the table instead of the empty-table text. */
export function PunchTable({ mode, showLoading = false }: { mode: 'punches' | 'requests'; showLoading?: boolean }) {
  const requests = mode === 'requests';
  const { can } = useAdminSession();
  const [date, setDate] = useState(todayStr());
  const [dept, setDept] = useState('');
  const [search, setSearch] = useState('');
  const depts = useAdmin<{ id: number; name: string }[]>('/admin/departments').data?.data ?? [];
  const q = useAdmin<Punch[]>(requests ? '/admin/attendance/requests' : '/admin/attendance/punches', requests ? { size: 200 } : { from: date, to: date, department_id: dept || undefined, size: 200 }, { keepPrevious: true });
  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (q.data?.data ?? []).filter((r) => (!requests || r.date === date) && (!requests || !dept || String(r.staff.department_id) === dept) && (!t || r.staff.full_name.toLowerCase().includes(t)));
  }, [q.data, search, date, dept, requests]);
  const tableStatus = !showLoading ? null : q.isPending ? 'Loading...' : q.isError && !q.data ? esc(q.error.message) : null;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const checked = useRef(new Set<number>());
  const [selected, setSelected] = useState(0);
  const sync = () => setSelected(checked.current.size);
  const approvePerm = requests ? 'approve_attendance_request' : 'approve_punches';
  const rejectPerm = requests ? 'rejected_attendance_request' : 'rejected_punches';
  const canAct = can(approvePerm) || can(rejectPerm);

  const decide = useAction((v: { ids: number[]; action: 'approve' | 'reject' }) => adminApi.post('/admin/attendance/requests/decide', v), {
    invalidate: ['/admin/attendance'],
    onSuccess: () => {
      checked.current.clear();
      sync();
    },
  });
  const decideStaff = (staffId: number, action: 'approve' | 'reject') => {
    const ids = rowsRef.current.filter((r) => r.staff_id === staffId).map((r) => r.id);
    if (ids.length) decide.mutate({ ids, action });
  };
  const decideSelected = (action: 'approve' | 'reject') => {
    const ids = [...checked.current];
    if (!ids.length) return toast.error('Select at least one punch');
    decide.mutate({ ids, action });
  };

  return (
    <>
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6">
            <BackCrumb title={requests ? 'Attendance Requests' : 'Punches'} crumbs={requests ? ['Attendance', 'Attendance Requests'] : ['Attendance', 'Punches']} />
            <div className="main-content-inner">
              <div className="shifts-data review-approve-time">
                <div className="filters sidebar-select approve-punch-data">
                  <CustomDropdown className="select-club-services" options={[{ value: '', label: 'All Department' }, ...depts.map((d) => ({ value: String(d.id), label: d.name }))]} value={dept} onChange={setDept} closeOnEscape={!requests} />
                </div>
              </div>
              <div className="approve-datas row">
                <div className="approve-data-search col-md-6 col-sm-6">
                  <form onSubmit={(e) => e.preventDefault()}>
                    <input className="input-search-rounded search-input" type="text" id="staff_data_find" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </form>
                </div>
                <div className="approve-right-data col-md-6 col-sm-6">
                  <div className="input-group date">
                    <DatePicker id="calender_date" className="input-group-addon form-control proxima_nova_semibold calender-picker" format="dd, M yyyy" value={date} onChange={(d) => d && setDate(d)} />
                  </div>
                </div>
              </div>
              <div className="approve_staff_data">
                <DataTable
                  id="staff_datas"
                  className="display attendance_view_punch"
                  deps={[rows, tableStatus]}
                  head={
                    <tr>
                      {!requests && <th><input type="checkbox" id="selectAllCheckbox" /></th>}
                      <th>Staff Name</th>
                      <th>Break</th>
                      <th>In Time</th>
                      <th>Out Time</th>
                      <th>Total Time</th>
                      {canAct && <th>Approve/Decline</th>}
                      {!requests && <th>Staff Logs</th>}
                    </tr>
                  }
                  options={() => ({
                    data: rows,
                    searching: false,
                    lengthChange: false,
                    info: false,
                    responsive: true,
                    order: [],
                    ...(tableStatus ? { language: { emptyTable: tableStatus } } : {}),
                    columnDefs: requests ? [] : [{ width: '10px', targets: 0, orderable: false }],
                    columns: [
                      ...(requests ? [] : [{ data: 'id', orderable: false, render: (_d: number, _t: string, r: Punch) => `<input type="checkbox" class="selectCheckbox_model" value="${r.id}" ${checked.current.has(r.id) ? 'checked' : ''}>` }]),
                      { data: null, render: (_d: unknown, _t: string, r: Punch) => `<a href="/staff/staff-profile-new/${r.staff_id}" class="staff-edit"><div class="user-images"><div><img src="${esc(r.staff.photo ?? '/assets/admin/images/dummy/dummy-user.svg')}" class="approve-user-img" alt=""></div><div>${esc(r.staff.full_name)}<p class="data-sub-field">${r.staff.department ? esc(r.staff.department.name) : "<span style='color: red!important;'>No Department Assigned</span>"}</p></div></div></a>` },
                      { data: 'break_seconds', render: (d: number) => (d ? fmtHm(d) : '00:00') },
                      { data: 'in_time', render: (d: string | null) => hm12(d) },
                      { data: 'out_time', render: (d: string | null) => hm12(d) },
                      { data: 'total_seconds', render: (d: number) => (d ? fmtHm(d) : '-') },
                      ...(canAct
                        ? [{
                            data: null,
                            orderable: false,
                            render: (_d: unknown, _t: string, r: Punch) => {
                              const mine = rowsRef.current.filter((x) => x.staff_id === r.staff_id);
                              const allOk = mine.every((x) => x.attendance_status === 1);
                              const allNo = mine.every((x) => x.attendance_status === 2);
                              return `<div class="approve-main-sec">${can(approvePerm) ? `<button class="atten-coming-btn approve_success ${allOk ? 'approve_success_btn' : ''}" data-decide="approve" data-staff="${r.staff_id}">${PUNCH_ICONS[0]}</button>` : ''}${can(rejectPerm) ? `<button class="atten-coming-btn reject_danger ${allNo ? 'reject_danger_btn' : ''}" data-decide="reject" data-staff="${r.staff_id}">${PUNCH_ICONS[1]}</button>` : ''}</div>`;
                            },
                          }]
                        : []),
                      ...(requests ? [] : [{ data: null, orderable: false, defaultContent: '' }]),
                    ],
                  })}
                  onReady={(_api, box, $) => {
                    const onRow = function (this: HTMLInputElement) {
                      if (this.checked) checked.current.add(Number(this.value));
                      else checked.current.delete(Number(this.value));
                      sync();
                    };
                    const onAll = function (this: HTMLInputElement) {
                      $(box).find('.selectCheckbox_model').each((_i: number, el: HTMLInputElement) => {
                        el.checked = this.checked;
                        if (this.checked) checked.current.add(Number(el.value));
                        else checked.current.delete(Number(el.value));
                      });
                      sync();
                    };
                    const onDecide = function (this: HTMLElement) {
                      decideStaff(Number(this.dataset.staff), this.dataset.decide as 'approve' | 'reject');
                    };
                    $(box).on('change', '.selectCheckbox_model', onRow).on('change', 'thead input', onAll).on('click', 'thead input', (e: Event) => e.stopPropagation()).on('click', '[data-decide]', onDecide);
                    return () => $(box).off('change', '.selectCheckbox_model', onRow).off('change', 'thead input', onAll).off('click', '[data-decide]', onDecide);
                  }}
                />
              </div>
              {!requests && canAct && selected > 0 && (
                <div className="text-end">
                  <button className="reject-btn proxima_nova_semibold attend_reject_select me-3" onClick={() => decideSelected('reject')}>Reject Selected</button>
                  <button className="approve-btn-btn proxima_nova_semibold attend_approve_selected" onClick={() => decideSelected('approve')}>Approve Selected</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      {!requests && selected > 0 && (
        <div id="myModal" className="modal check-model check-modal-attendance-view" style={{ display: 'block' }}>
          <div className="model-section">
            <div className="model_left_side">
              <div className="selected_check_member proxima_nova_semibold">{selected}</div>
              <div className="model_right_side"><div className="member_div proxima_nova_semibold">Members Selected</div></div>
            </div>
            <div className="cancel_div" id="closeModal" onClick={() => { checked.current.clear(); sync(); q.refetch(); }}>
              <p>Cancel</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
