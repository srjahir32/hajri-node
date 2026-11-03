'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { labelToYm, ymToLabel } from '@/lib/format';
import { showOffcanvas } from '@/lib/bs';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { ConfirmOffcanvas } from '@/components/widgets/ConfirmOffcanvas';
import { MonthPicker } from '@/components/widgets/MonthPicker';
import { navigate } from '@/lib/navigate';

interface Policy { id: number; template_name: string; cycle: 'monthly' | 'yearly'; start_period: string | null; end_period: string | null; accrual_type: string; number_of_leaves: number; is_carry_forward: number }

export default function Body() {
  const id = Number(useSearchParams().get('id')) || null;
  const list = useAdmin<Policy[]>(id ? '/admin/leave-policies' : null);
  const policy = list.data?.data.find((p) => p.id === id);
  if (id && !list.data) return null;
  if (id && !policy) return <main className="flex-1 p-8"><p>Template not found.</p></main>;
  return <Editor id={id} policy={policy} />;
}

const thisYear = () => new Date().getFullYear();
const nextMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function Editor({ id, policy }: { id: number | null; policy?: Policy }) {
  const now = new Date();
  const [name, setName] = useState(policy?.template_name ?? '');
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>(policy?.cycle ?? 'monthly');
  const [start, setStart] = useState(labelToYm(policy?.start_period) || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [end, setEnd] = useState(labelToYm(policy?.end_period) || `${thisYear()}-12`);
  const [leaves, setLeaves] = useState(String(policy?.number_of_leaves ?? ''));
  const [carry, setCarry] = useState(!!policy?.is_carry_forward);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const back = () => (navigate('/setting/leave_policy_new'));
  const save = useAction(
    () => {
      const body = { template_name: name.trim(), cycle, start_period: ymToLabel(start), end_period: ymToLabel(cycle === 'monthly' ? `${start.slice(0, 4)}-12` : end), accrual_type: 'All at once', number_of_leaves: Number(leaves), is_carry_forward: cycle === 'monthly' && carry };
      return id ? adminApi.put(`/admin/leave-policies/${id}`, body) : adminApi.post('/admin/leave-policies', body);
    },
    { invalidate: ['/admin/leave-policies'], onSuccess: () => window.setTimeout(back, 800) },
  );
  const del = useAction(() => adminApi.del(`/admin/leave-policies/${id}`), { invalidate: ['/admin/leave-policies'], onSuccess: () => window.setTimeout(back, 800) });

  const submit = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Template name is required';
    if (!start) e.start = 'Leave period is required';
    if (cycle === 'yearly' && (!end || end < nextMonth(start))) e.end = 'End period must be after the start period';
    if (!(Number(leaves) >= 1)) e.leaves = 'Number of leaves is required';
    setErrs(e);
    if (!Object.keys(e).length) save.mutate();
  };
  const title = id ? 'Edit Template' : 'Create Template';
  const Err = ({ k }: { k: string }) => (errs[k] ? <span className="error error_message proxima_nova_semibold">{errs[k]}</span> : null);

  return (
    <>
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6 pb-20">
            <BackCrumb title={title} crumbs={['Settings', 'Holiday / Leave Settings', 'Leave Policy', title]} />
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="hajri-salary-pays-main">
                  <div className="horizontal-scroll-container">
                    <h2 className="proxima_nova_semibold leave-policy-title">Template Settings</h2>
                    <div className="shift-main-inner-edit">
                      <div className="shift-inner-sub-label-edit">
                        <label className="shift-type-label">Template Name</label>
                        <input type="text" className="form-control shift-edit-input" value={name} onChange={(e) => setName(e.target.value)} />
                        <Err k="name" />
                      </div>
                      <div className="shift-inner-sub-label-edit">
                        <div className="form-group">
                          <label className="form-label shift-type-label">Leave Policy Cycle</label>
                          <div className="year-month-radio">
                            <label className="policy-leave-label">
                              <input type="radio" name="leave_policy_cycle" value="monthly" checked={cycle === 'monthly'} onChange={() => setCycle('monthly')} />
                              <div className="front-end box"><span className="proxima_nova_semibold">Monthly</span></div>
                            </label>
                            <label className="policy-leave-label">
                              <input type="radio" name="leave_policy_cycle" value="yearly" checked={cycle === 'yearly'} onChange={() => setCycle('yearly')} />
                              <div className="back-end box"><span className="proxima_nova_semibold">Yearly</span></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="shift-main-inner-edit">
                      <div className="shift-inner-sub-label-edit">
                        <label className="shift-type-label">Leave Period</label>
                        <div className="leave-edit-inner">
                          <div className="shift-inner-time leave-policy-time date">
                            <MonthPicker id="leave_start_period" className="form-control leave-policy-edit-time input-group-addon" value={start} onChange={setStart} />
                          </div>
                          <div className="leave-inner-time-sec">
                            <p>To</p>
                            <div className="shift-inner-time leave-policy-to-time date">
                              {cycle === 'yearly' ? (
                                <MonthPicker key={start} id="leave_end_period" className="form-control leave-policy-edit-time input-group-addon" minMonth={nextMonth(start)} value={end} onChange={setEnd} />
                              ) : (
                                <input type="text" className="form-control leave-policy-edit-time input-group-addon" id="leave_end_period" disabled readOnly value={ymToLabel(`${start.slice(0, 4)}-12`)} />
                              )}
                            </div>
                          </div>
                        </div>
                        <Err k="start" />
                        <Err k="end" />
                      </div>
                      <div className="shift-inner-sub-label-edit">
                        <div className="shift-inner-sub-label-edit">
                          <label className="shift-type-label">Accrual Type</label>
                          <div className="filters staff_attendance" id="accrual_type_error">
                            <input type="text" className="form-control leave-policy-edit-time input-group-addon" readOnly value="All at once" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="shift-main-inner-edit">
                      <div className="shift-inner-sub-label-edit">
                        <label className="shift-type-label">Number Of Leaves</label>
                        <input type="number" className="form-control shift-edit-input" min="1" value={leaves} onChange={(e) => setLeaves(e.target.value)} />
                        <Err k="leaves" />
                      </div>
                      {cycle === 'monthly' && (
                        <div className="shift-inner-sub-label-edit">
                          <label className="shift-type-label"> </label>
                          <div className="flex items-center gap-2 mt-2">
                            <input className="form-check-input h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-0" type="checkbox" id="is_carry_forward" checked={carry} onChange={(e) => setCarry(e.target.checked)} />
                            <label className="shift-type-label mb-0 cursor-pointer" htmlFor="is_carry_forward">Carry Forward</label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  {id && (
                    <button type="button" className="reject-btn proxima_nova_semibold" onClick={() => void showOffcanvas('deleteModal')}>
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    id="save_leave_policy_btn"
                    onClick={submit}
                    disabled={save.isPending}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95"
                  >
                    {id ? 'Save Changes' : 'Create Template'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      <ConfirmOffcanvas id="deleteModal" className="holiday_offcanvas" title="Delete Leave Template" message="Are you sure to delete this leave template?" busy={del.isPending} onConfirm={() => del.mutate()} />
    </>
  );
}
