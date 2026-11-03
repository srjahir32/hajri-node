'use client';

import { useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import * as I from '@/components/icons';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { useAction, useAdmin } from '@/lib/query';
import { esc, hideOffcanvas, showOffcanvas } from '@/lib/bs';
import { fmtTime12 } from '@/lib/format';
import { toast } from '@/lib/toast';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { DataTable } from '@/components/widgets/DataTable';
import { navigate } from '@/lib/navigate';

interface Shift { id: number; name: string; shift_type_id: number; details: { name: string | null; start_time: string; end_time: string }[] }
interface Row { id: number; name: string; phone_number: string | null; photo: string | null; department: string | null; assigned: boolean; start_index: number | null; working_type: number | null }
const SAVE = 'save-staff-btn proxima_nova_semibold';

export default function Body() {
  const id = Number(useParams<{ id: string }>().id);
  const { business } = useAdminSession();
  const prefix = (business?.name ?? '').slice(0, 3);
  const shift = useAdmin<Shift>(`/admin/shifts/${id}`).data?.data;
  const staffQ = useAdmin<Row[]>(`/admin/shifts/${id}/staff`);
  const staff = useMemo(() => staffQ.data?.data ?? [], [staffQ.data]);
  const rotational = shift?.shift_type_id === 2;
  const [search, setSearch] = useState('');
  const checked = useRef(new Set<number>());
  const rotation = useRef<Record<number, { start_index: number; type: number }>>({});
  const last = useRef<number | null>(null);
  const [selected, setSelected] = useState(0);
  const [startIdx, setStartIdx] = useState('0');
  const [type, setType] = useState('0');
  const seeded = useRef<Row[] | null>(null);
  if (seeded.current !== staff && staff.length) {
    seeded.current = staff;
    checked.current = new Set(staff.filter((s) => s.assigned).map((s) => s.id));
    staff.filter((s) => s.assigned).forEach((s) => (rotation.current[s.id] = { start_index: s.start_index ?? 0, type: s.working_type ?? 0 }));
  }
  const assignedCount = staff.filter((s) => s.assigned).length;
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? staff.filter((s) => `${s.name} ${s.phone_number ?? ''}`.toLowerCase().includes(q)) : staff;
  }, [staff, search]);

  const save = useAction(
    async () => {
      const ids = [...checked.current];
      const groups = new Map<string, number[]>();
      for (const sid of ids) {
        const r = rotation.current[sid] ?? { start_index: 0, type: 0 };
        const key = rotational ? `${r.start_index}:${r.type}` : 'x';
        groups.set(key, [...(groups.get(key) ?? []), sid]);
      }
      const removed = staff.filter((s) => s.assigned && !checked.current.has(s.id)).map((s) => s.id);
      let res = await adminApi.get('/admin/shifts');
      if (removed.length) res = await adminApi.post(`/admin/shifts/${id}/unassign`, { staff_ids: removed });
      for (const [key, sids] of groups) {
        const [si, ty] = key.split(':').map(Number);
        res = await adminApi.post(`/admin/shifts/${id}/assign`, rotational ? { staff_ids: sids, start_index: si, working_type: ty } : { staff_ids: sids });
      }
      return res;
    },
    { invalidate: ['/admin/shifts'], success: 'Shift assigned successfully', onSuccess: () => window.setTimeout(() => (navigate('/setting/shift_setting_new')), 900) },
  );

  const onToggle = (sid: number, on: boolean) => {
    if (on) {
      checked.current.add(sid);
      rotation.current[sid] = { start_index: Number(startIdx), type: Number(type) };
      last.current = sid;
      if (rotational) void showOffcanvas('shift-select');
    } else {
      checked.current.delete(sid);
      delete rotation.current[sid];
      if (rotational && checked.current.size === 0) void hideOffcanvas('shift-select');
    }
    setSelected(checked.current.size);
  };
  const setRot = (patch: Partial<{ start_index: number; type: number }>) => {
    if (last.current != null && checked.current.has(last.current)) rotation.current[last.current] = { ...(rotation.current[last.current] ?? { start_index: 0, type: 0 }), ...patch };
  };

  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <BackCrumb title={`Assigned Staff (${assignedCount})`} crumbs={['Settings', 'Attendance Settings', 'Shift Settings', 'Edit Shift', 'Assigned Staff']} />
            <a href={`/setting/assign-user-new/${id}`} className="text-sm ml-1">View assigned staff</a>
          </div>
          <div>
            <div className="approve-datas">
              <div className="approve-data-search assign-data-search col-md-6 col-sm-6">
                <form onSubmit={(e) => e.preventDefault()}>
                  <input className="input-search-rounded" type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                </form>
              </div>
            </div>
            <div className="approve_staff_data">
              <DataTable
                id="staff_datas"
                deps={[rows]}
                head={<tr><th><input type="checkbox" id="selectAllCheckbox" /></th><th>Staff Name</th><th>Staff ID</th><th>Phone Number</th></tr>}
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
                    { data: 'name', render: (d: string, _t: string, r: Row) => `<a href="/staff/staff-profile-new/${r.id}" class="staff-edit"><div class="user-images"><div><img src="${esc(r.photo ?? '/assets/admin/images/dummy/dummy-user.svg')}" class="approve-user-img" alt=""></div><div>${esc(d)}<p class="data-sub-field">${esc(r.department ?? '')}</p></div></div></a>` },
                    { data: 'id', render: (d: number) => `${esc(prefix)}${d}` },
                    { data: 'phone_number', render: (d: string | null) => esc(d ?? '') },
                  ],
                })}
                onReady={(_api, box, $) => {
                  const onRow = function (this: HTMLInputElement) {
                    onToggle(Number(this.value), this.checked);
                  };
                  const onAll = function (this: HTMLInputElement) {
                    $(box).find('.selectCheckbox_model').each((_i: number, el: HTMLInputElement) => {
                      el.checked = this.checked;
                      if (this.checked) checked.current.add(Number(el.value));
                      else checked.current.delete(Number(el.value));
                    });
                    setSelected(checked.current.size);
                  };
                  $(box).on('change', '.selectCheckbox_model', onRow).on('change', 'thead input', onAll).on('click', 'thead input', (e: Event) => e.stopPropagation());
                  return () => $(box).off('change', '.selectCheckbox_model', onRow).off('change', 'thead input', onAll);
                }}
              />
              <div className="review-details-btn text-end">
                <button id="assign-shift-btn" className={SAVE} disabled={save.isPending} onClick={() => (selected || assignedCount ? save.mutate() : toast.error('Select at least one staff member'))}>Save</button>
              </div>
            </div>
          </div>

          <div className="offcanvas offcanvas-end daily-work-data-download" tabIndex={-1} id="shift-select" data-bs-scroll="true">
            <div className="offcanvas-header">
              <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close"><I.I9dae93 /></div>
            </div>
            <div className="offcanvas-body overflow-auto">
              <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main">Shift timings</h5>
              <hr />
              <div className="filter-sub-sec">
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="daily-work-select">
                    <h2 className="filter-shiftcheck section_title proxima_nova_semibold">Select first shift to start with</h2>
                    {shift?.details.map((d, i) => (
                      <div className="form-check filter-shift-main" style={{ alignItems: 'start' }} key={i}>
                        <input className="form-check-input" type="radio" value={i} name="working_shift_id" id={`flexCheckChecked_${i}`} checked={startIdx === String(i)} onChange={() => { setStartIdx(String(i)); setRot({ start_index: i }); }} />
                        <label className="form-check-label proxima_nova_regular" htmlFor={`flexCheckChecked_${i}`}>
                          {d.name} <br />({fmtTime12(d.start_time)} - {fmtTime12(d.end_time)})
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="daily-work-select working_type">
                    <h2 className="filter-shiftcheck section_title proxima_nova_semibold">Select Type</h2>
                    {['Daily', 'Weekly', 'Monthy'].map((label, i) => (
                      <div className="form-check filter-shift-main" key={label}>
                        <input className="form-check-input" type="radio" value={i} name="type" id={`flexCheckChecked_${label.toLowerCase()}`} checked={type === String(i)} onChange={() => { setType(String(i)); setRot({ type: i }); }} />
                        <label className="form-check-label proxima_nova_regular" htmlFor={`flexCheckChecked_${label.toLowerCase()}`}>{label}</label>
                      </div>
                    ))}
                  </div>
                </form>
              </div>
            </div>
          </div>
          {selected > 0 && (
            <div id="myModal" className="modal check-model check-modal-attendance-view" style={{ display: 'block' }}>
              <div className="model-section">
                <div className="model_left_side">
                  <div className="selected_check_member proxima_nova_semibold">{selected}</div>
                  <div className="model_right_side"><div className="member_div proxima_nova_semibold">Members Selected</div></div>
                </div>
                <div className="cancel_div cancel_selected_id" id="closeModal" onClick={() => { checked.current.clear(); setSelected(0); staffQ.refetch(); }}>
                  <I.I968f12 />
                  <p>Cancel</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
