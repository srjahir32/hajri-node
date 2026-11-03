'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { SelectClub } from '@/components/ui/SelectClub';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { navigate } from '@/lib/navigate';

export interface ShiftDetail { id?: number; name: string; start_time: string; end_time: string; break_minutes: number }
export interface ShiftData { id: number; name: string; shift_type_id: number; details: { id: number; name: string | null; start_time: string; end_time: string; break_minutes: number; total_payable_seconds: number }[] }

const HOURS = Array.from({ length: 13 }, (_, i) => String(i).padStart(2, '0'));
const MINS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '');
const secs = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 3600 + m * 60;
};
/** "08:15 Hrs" — end earlier than start means the shift crosses midnight */
export function payable(start: string, end: string, breakMin: number) {
  if (!start || !end) return '00:00 Hrs';
  let d = secs(end) - secs(start);
  if (d <= 0) d += 86400;
  d -= breakMin * 60;
  if (d <= 0) return '00:00 Hrs';
  return `${String(Math.floor(d / 3600)).padStart(2, '0')}:${String(Math.floor((d % 3600) / 60)).padStart(2, '0')} Hrs`;
}
const blank = (): ShiftDetail => ({ name: '', start_time: '', end_time: '', break_minutes: 0 });

function BreakSelect({ minutes, onChange, hourClass, minClass }: { minutes: number; onChange: (m: number) => void; hourClass: string; minClass: string }) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return (
    <>
      <select className={hourClass} value={String(h).padStart(2, '0')} onChange={(e) => onChange(Number(e.target.value) * 60 + m)}>
        {HOURS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span>:</span>
      <select className={minClass} value={String(m).padStart(2, '0')} onChange={(e) => onChange(h * 60 + Number(e.target.value))}>
        {MINS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </>
  );
}

const Star = () => <i className="fa-solid fa-star-of-life text-danger fa-2xs"></i>;
const SAVE_CLS = 'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95';

/** Create / edit shift (fixed, rotational, open), shared by add_shift_new and edit_shift_new/[id]. */
export function ShiftForm({ shift }: { shift?: ShiftData }) {
  const edit = !!shift;
  const types = useAdmin<{ id: number; name: string }[]>('/auth/reference/shift-types').data?.data ?? [];
  const first = shift?.details[0];
  const [type, setType] = useState(shift ? String(shift.shift_type_id) : '');
  const [name, setName] = useState(shift?.name ?? '');
  const [fixed, setFixed] = useState<ShiftDetail>(shift?.shift_type_id === 1 && first ? { id: first.id, name: first.name ?? '', start_time: hhmm(first.start_time), end_time: hhmm(first.end_time), break_minutes: first.break_minutes } : blank());
  const [rot, setRot] = useState<ShiftDetail[]>(shift?.shift_type_id === 2 ? shift.details.map((d) => ({ id: d.id, name: d.name ?? '', start_time: hhmm(d.start_time), end_time: hhmm(d.end_time), break_minutes: d.break_minutes })) : [blank()]);
  const [hours, setHours] = useState(shift?.shift_type_id === 3 && first ? `${String(Math.floor(first.total_payable_seconds / 3600)).padStart(2, '0')}:${String(Math.floor((first.total_payable_seconds % 3600) / 60)).padStart(2, '0')}` : '');
  const [errs, setErrs] = useState<Record<string, string>>({});

  const save = useAction(
    () => {
      const t = Number(type);
      const det = (d: ShiftDetail) => ({ id: d.id, name: d.name.trim(), start_time: `${d.start_time}:00`, end_time: `${d.end_time}:00`, break_minutes: d.break_minutes });
      const body = t === 1 ? { shift_type_id: 1, name: name.trim(), details: [det(fixed)] } : t === 2 ? { shift_type_id: 2, name: name.trim(), details: rot.map(det) } : { shift_type_id: 3, name: name.trim(), working_hours: hours };
      return edit ? adminApi.put(`/admin/shifts/${shift!.id}`, body) : adminApi.post('/admin/shifts', body);
    },
    { invalidate: ['/admin/shifts'], onSuccess: () => window.setTimeout(() => (navigate('/setting/shift_setting_new')), 800) },
  );

  const submit = () => {
    const e: Record<string, string> = {};
    if (!type) e.type = 'Shift type field is required';
    if (!name.trim()) e.name = 'Shift name field is required';
    if (type === '1') {
      if (!fixed.name.trim()) e.fname = 'Fixed shift name field is required';
      if (!fixed.start_time) e.fstart = 'Start time field is required';
      if (!fixed.end_time) e.fend = 'End time field is required';
    }
    if (type === '2') rot.forEach((d, i) => {
      if (!d.name.trim()) e[`n${i}`] = 'Shift name field is required';
      if (!d.start_time) e[`s${i}`] = 'Start time field is required';
      if (!d.end_time) e[`e${i}`] = 'End time field is required';
    });
    if (type === '2' && rot.length < 2) e.rot = 'A rotational shift needs at least two shifts';
    if (type === '3' && !hours) e.hours = 'Working hours field is required';
    setErrs(e);
    if (!Object.keys(e).length) save.mutate();
  };
  const Err = ({ k }: { k: string }) => (errs[k] ? <span className="error error_message proxima_nova_semibold">{errs[k]}</span> : null);
  const patchRot = (i: number, p: Partial<ShiftDetail>) => setRot((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const removeRot = async (i: number) => {
    setRot((r) => r.filter((_, j) => j !== i));
  };
  const title = edit ? 'Edit Shift' : 'Create Shift';

  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title={title} crumbs={['Settings', 'Attendance Settings', 'Shift Settings', title]} />
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="col-sm-12 shift-setting-main">
                <div className="hajri-salary-pays-main">
                  <div className="account-setting shift-main-sub-edit">
                    <div className="shift-main-inner-edit">
                      <div className="shift-inner-sub-label-edit">
                        <label className="shift-type-label">Shift Type {!edit && <Star />}</label>
                        <div className="filters staff_attendance" id="shift_error">
                          {edit ? (
                            <select className="form-select shift-edit-select" disabled value={type} onChange={() => {}}>
                              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          ) : (
                            <SelectClub className="form-select create-select section_sub_title select-club-services" id="shift_type_id" name="shift_type_id" value={type} onChange={(_e, v) => setType(v)}>
                              <option value="">Select Shift Type</option>
                              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </SelectClub>
                          )}
                          <Err k="type" />
                        </div>
                      </div>
                      <div className="shift-inner-sub-label-edit">
                        <label className="shift-type-label">Shift Name {!edit && <Star />}</label>
                        <input type="text" className="form-control shift-edit-input" placeholder="Enter Name" value={name} onChange={(e) => setName(e.target.value)} />
                        <Err k="name" />
                      </div>
                    </div>

                    {type === '1' && (
                      <div className="fixed-type">
                        <h2 className="proxima_nova_semibold staff-pay-title">{edit ? 'Shift Details' : 'Add Shift Details'}</h2>
                        <div className="shift-main-inner-edit shift-main-inner steff-paymeny-detail">
                          <div className="shift-inner-sub-label-edit">
                            <label className="shift-type-label">Fixed Shift Name <Star /></label>
                            <input type="text" className="form-control shift-edit-input" placeholder="Enter name" value={fixed.name} onChange={(e) => setFixed({ ...fixed, name: e.target.value })} />
                            <Err k="fname" />
                          </div>
                          <div className="shift-inner-sub-label-edit">
                            <label className="shift-type-label">Start Time</label>
                            <input type="time" className="form-control shift-edit-input" value={fixed.start_time} onChange={(e) => setFixed({ ...fixed, start_time: e.target.value })} />
                            <Err k="fstart" />
                          </div>
                          <div className="shift-inner-sub-label-edit">
                            <label className="shift-type-label">End Time</label>
                            <input type="time" className="form-control shift-edit-input" value={fixed.end_time} onChange={(e) => setFixed({ ...fixed, end_time: e.target.value })} />
                            <Err k="fend" />
                          </div>
                          <div className="shift-inner-sub-label-edit">
                            <label className="shift-type-label">Unpaid Break</label>
                            <div>
                              <BreakSelect minutes={fixed.break_minutes} onChange={(m) => setFixed({ ...fixed, break_minutes: m })} hourClass="form-control shift-fixed-dropdown shift-dropdown" minClass="form-control shift-fixed-dropdown shift-dropdown" />
                            </div>
                          </div>
                          <div className="shift-inner-sub-label-edit">
                            <label className="shift-type-label">Total Payable Hours</label>
                            <span className="total-payable" id="total_fixed_payable">{payable(fixed.start_time, fixed.end_time, fixed.break_minutes)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {type === '2' && (
                      <div className="rotational-type">
                        <h2 className="proxima_nova_semibold staff-pay-title">{edit ? 'Shift Details' : 'Add Shift Details'}</h2>
                        <div className="append-box">
                          {rot.map((d, i) => (
                            <div className="rotational-main mb-3" key={d.id ?? `n${i}`}>
                              <div className="table-container">
                                <div className="table-item">
                                  <label className="shift-type-label">Shift Name <Star /></label>
                                  <input type="text" className="form-control shift-edit-input" placeholder="Enter name" value={d.name} onChange={(e) => patchRot(i, { name: e.target.value })} />
                                  <Err k={`n${i}`} />
                                </div>
                                <div className="table-item">
                                  <label className="shift-type-label">Start Time <Star /></label>
                                  <input type="time" className="form-control shift-input shift-edit-input" value={d.start_time} onChange={(e) => patchRot(i, { start_time: e.target.value })} />
                                  <Err k={`s${i}`} />
                                </div>
                                <div className="table-item">
                                  <label className="shift-type-label">End Time <Star /></label>
                                  <input type="time" className="form-control shift-end-time shift-input shift-edit-input" value={d.end_time} onChange={(e) => patchRot(i, { end_time: e.target.value })} />
                                  <Err k={`e${i}`} />
                                </div>
                                <div className="table-item">
                                  <label className="shift-type-label">Unpaid Break</label>
                                  <div className="break-container">
                                    <BreakSelect minutes={d.break_minutes} onChange={(m) => patchRot(i, { break_minutes: m })} hourClass="form-control shift-dropdown" minClass="form-control shift-dropdown" />
                                  </div>
                                </div>
                                <div className="table-item">
                                  <label className="shift-type-label">Total Payable Hours</label>
                                  <span className="total-payable">{payable(d.start_time, d.end_time, d.break_minutes)}</span>
                                </div>
                                {rot.length > 1 && (
                                  <div className="table-item">
                                    <a href="#" className="text-danger shift-single-remove" onClick={(e) => { e.preventDefault(); void removeRot(i); }}>
                                      <i className="fa-solid fa-trash"></i>
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Err k="rot" />
                        <div className="mt-3 mb-3">
                          <a href="#" id="add_shift" onClick={(e) => { e.preventDefault(); setRot((r) => [...r, blank()]); }}>+ Add Shift</a>
                        </div>
                      </div>
                    )}

                    {type === '3' && (
                      <div className="flexible-type">
                        <div className="shift-main-inner-edit steff-paymeny-detail">
                          <div className="hift-inner-sub-label-edit">
                            <label className="shift-type-label">Working Hours</label>
                            <input type="time" className="form-control shift-input shift-edit-input" value={hours} onChange={(e) => setHours(e.target.value)} />
                            <Err k="hours" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button type="button" id="create-shift-btn" className={SAVE_CLS} disabled={save.isPending} onClick={submit}>
                  {edit ? 'Save Changes' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
