'use client';

import { useMemo, useRef, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { useAction, useAdmin } from '@/lib/query';
import { LEAVE_ICONS } from '@/lib/leaveIcons';
import { esc } from '@/lib/bs';
import { monthStr } from '@/lib/format';
import { toast } from '@/lib/toast';
import { CustomDropdown } from '@/components/widgets/CustomDropdown';
import { DataTable } from '@/components/widgets/DataTable';
import { MonthPicker } from '@/components/widgets/MonthPicker';
import { BackCrumb } from '@/components/shell/BackCrumb';

interface Leave {
  id: number; staff_id: number; leave_type: string; is_unpaid: number; reason: string | null; start_date: string; end_date: string; status: number; requested_date: string;
  staff: { name: string; department: string | null; photo: string | null };
}
const STATUS = [{ value: 'all', label: 'All' }, { value: '0', label: 'Pending' }, { value: '1', label: 'Approved' }, { value: '2', label: 'Rejected' }];
const monthRange = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return { from: `${ym}-01`, to: `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}` };
};

export default function Body() {
  const { can } = useAdminSession();
  const [month, setMonth] = useState(monthStr());
  const [status, setStatus] = useState('all');
  const [dept, setDept] = useState('');
  const [search, setSearch] = useState('');
  const depts = useAdmin<{ id: number; name: string }[]>('/admin/departments').data?.data ?? [];
  const q = useAdmin<Leave[]>('/admin/attendance/leaves', { ...monthRange(month), status: status === 'all' ? undefined : Number(status), size: 200 }, { keepPrevious: true });
  const deptName = depts.find((d) => String(d.id) === dept)?.name;
  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (q.data?.data ?? []).filter((r) => (!deptName || r.staff.department === deptName) && (!t || r.staff.name.toLowerCase().includes(t)));
  }, [q.data, search, deptName]);
  const checked = useRef(new Set<number>());
  const [selected, setSelected] = useState(0);
  const sync = () => setSelected(checked.current.size);
  const canAct = can('approve_leave') || can('rejected_leave');

  const decide = useAction((v: { ids: number[]; action: 'approve' | 'reject' }) => adminApi.post('/admin/attendance/leaves/decide', v), {
    invalidate: ['/admin/attendance'],
    onSuccess: () => { checked.current.clear(); sync(); },
  });
  const decideSelected = (action: 'approve' | 'reject') => {
    const ids = [...checked.current];
    if (!ids.length) return toast.error('Select at least one leave');
    decide.mutate({ ids, action });
  };

  return (
    <>
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6">
            <BackCrumb title="Leave management" crumbs={['Attendance', 'Leave management']} />
            <div className="main-content-inner">
              <div className="approve-datas row">
                <div className="approve-data-search leave-filter-group col-md-8 col-sm-8">
                  <div className="shifts-data review-approve-time">
                    <div className="filters sidebar-select approve-punch-data">
                      <CustomDropdown className="select-club-services" options={[{ value: '', label: 'Select Department' }, ...depts.map((d) => ({ value: String(d.id), label: d.name }))]} value={dept} onChange={setDept} />
                    </div>
                  </div>
                  <form onSubmit={(e) => e.preventDefault()}>
                    <input className="input-search-rounded search-input" type="text" id="staff_data_find" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </form>
                </div>
                <div className="approve-right-data col-md-4 col-sm-4">
                  <div className="business_selct_box select_mate_option staff-option_select">
                    <CustomDropdown options={STATUS} value={status} onChange={setStatus} prefix="Sort by " selectClassName="mySelect_sort status_filter" />
                  </div>
                </div>
              </div>
              <div className="dashboard_current_day_txt">
                <div className="row">
                  <div className="col-12 text-end">
                    <MonthPicker id="datepicker" className="selected_date attendance_status_month proxima_nova_semibold" value={month} onChange={setMonth} />
                  </div>
                </div>
              </div>
              <div className="approve_staff_data">
                <DataTable
                  id="staff_datas"
                  deps={[rows]}
                  head={
                    <tr>
                      <th><input type="checkbox" id="selectAllCheckbox" /></th>
                      <th>Staff Name</th>
                      <th>Is Paid</th>
                      <th>Leave Type</th>
                      <th>Reason</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Requested Date</th>
                      {canAct && <th>Approve/Decline</th>}
                    </tr>
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
                      { data: 'id', orderable: false, render: (_d: number, _t: string, r: Leave) => `<input type="checkbox" class="selectCheckbox_model" value="${r.id}" ${checked.current.has(r.id) ? 'checked' : ''}>` },
                      { data: null, render: (_d: unknown, _t: string, r: Leave) => `<a href="/staff/staff-profile-new/${r.staff_id}" class="staff-edit"><div class="user-images"><div><img src="${esc(r.staff.photo ?? '/assets/admin/images/dummy/dummy-user.svg')}" class="approve-user-img" alt=""></div><div>${esc(r.staff.name)}<p class="data-sub-field">${r.staff.department ? esc(r.staff.department) : "<span style='color: red!important;'>No Department Assigned</span>"}</p></div></div></a>` },
                      { data: 'is_unpaid', render: (d: number) => (d ? 'No' : 'Yes') },
                      { data: 'leave_type', render: (d: string) => esc(d) },
                      { data: 'reason', render: (d: string | null) => esc(d ?? '') },
                      { data: 'start_date' },
                      { data: 'end_date' },
                      { data: 'requested_date', render: (d: string) => d.slice(0, 10) },
                      ...(canAct
                        ? [{
                            data: null,
                            orderable: false,
                            render: (_d: unknown, _t: string, r: Leave) =>
                              `<div class="approve-main-sec">${can('approve_leave') ? `<button class="atten-coming-btn approve_success atten-leave-btn ${r.status === 1 ? 'approve_success_btn' : ''}" data-decide="approve" data-id="${r.id}">${LEAVE_ICONS[3]}</button>` : ''}${can('rejected_leave') ? `<button class="atten-coming-btn reject_danger decline-leave-btn ${r.status === 2 ? 'reject_danger_btn' : ''}" data-decide="reject" data-id="${r.id}">${LEAVE_ICONS[4]}</button>` : ''}</div>`,
                          }]
                        : []),
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
                      decide.mutate({ ids: [Number(this.dataset.id)], action: this.dataset.decide as 'approve' | 'reject' });
                    };
                    $(box).on('change', '.selectCheckbox_model', onRow).on('change', 'thead input', onAll).on('click', 'thead input', (e: Event) => e.stopPropagation()).on('click', '[data-decide]', onDecide);
                    return () => $(box).off('change', '.selectCheckbox_model', onRow).off('change', 'thead input', onAll).off('click', '[data-decide]', onDecide);
                  }}
                />
              </div>
              {canAct && selected > 0 && (
                <div className="text-end">
                  <button className="reject-btn proxima_nova_semibold leave_reject_select me-3" onClick={() => decideSelected('reject')}>Reject Selected</button>
                  <button className="approve-btn-btn proxima_nova_semibold leave_approve_selected" onClick={() => decideSelected('approve')}>Approve Selected</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      {selected > 0 && (
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
