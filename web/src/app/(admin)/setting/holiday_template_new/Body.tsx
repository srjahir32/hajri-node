'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import * as I from '@/components/icons';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { showOffcanvas } from '@/lib/bs';
import { toast } from '@/lib/toast';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { ConfirmOffcanvas } from '@/components/widgets/ConfirmOffcanvas';
import { DatePicker } from '@/components/widgets/DatePicker';
import { MonthPicker } from '@/components/widgets/MonthPicker';
import { navigate } from '@/lib/navigate';

interface Holiday { id?: number; name: string; date: string }
interface Policy { id: number; name: string; start_month: string | null; end_month: string | null; holidays: Holiday[] }

const lastDay = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};
const nextMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function Body() {
  const id = Number(useSearchParams().get('id')) || null;
  const list = useAdmin<Policy[]>(id ? '/admin/holidays/policies' : null);
  const policy = list.data?.data.find((p) => p.id === id);
  if (id && !list.data) return null;
  if (id && !policy) return <main className="flex-1 p-8"><p>Template not found.</p></main>;
  return <Editor id={id} policy={policy} />;
}

function Editor({ id, policy }: { id: number | null; policy?: Policy }) {
  const [name, setName] = useState(policy?.name ?? '');
  const [start, setStart] = useState(policy?.start_month ?? '');
  const [end, setEnd] = useState(policy?.end_month ?? '');
  const [holidays, setHolidays] = useState<Holiday[]>(policy?.holidays.length ? policy.holidays : [{ name: '', date: '' }]);
  const [errs, setErrs] = useState<{ name?: string; time?: string }>({});
  const [removeIdx, setRemoveIdx] = useState<number | null>(null);

  const back = () => (navigate('/setting/holiday_policy_new'));
  const save = useAction(
    () => {
      const body = { name: name.trim(), start_month: start, end_month: end, holidays: holidays.filter((h) => h.name.trim() && h.date).map((h) => ({ id: h.id, name: h.name.trim(), date: h.date })) };
      return id ? adminApi.put(`/admin/holidays/policies/${id}`, body) : adminApi.post('/admin/holidays/policies', body);
    },
    { invalidate: ['/admin/holidays'], onSuccess: () => window.setTimeout(back, 800) },
  );
  const del = useAction(() => adminApi.del(`/admin/holidays/policies/${id}`), { invalidate: ['/admin/holidays'], onSuccess: () => window.setTimeout(back, 800) });

  const submit = () => {
    const e: typeof errs = {};
    if (!name.trim()) e.name = 'Template name is required.';
    if (!start || !end) e.time = 'Shift Time is required.';
    else if (end < nextMonth(start)) e.time = 'Shift end time must be a future month/year after shift start time.';
    setErrs(e);
    if (Object.keys(e).length) return;
    save.mutate();
  };
  const patch = (i: number, p: Partial<Holiday>) => setHolidays((h) => h.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const removeHoliday = async (i: number) => {
    const h = holidays[i];
    if (h.id) {
      try {
        await adminApi.del(`/admin/holidays/holidays/${h.id}`);
        toast.success('Holiday deleted');
      } catch (e) {
        return toast.error(e instanceof Error ? e.message : 'Something went wrong');
      }
    }
    setHolidays((all) => (all.length > 1 ? all.filter((_, j) => j !== i) : [{ name: '', date: '' }]));
  };

  const title = id ? 'Edit Holiday Calendar Template' : 'Create Holiday Calendar Template';
  return (
    <>
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6 pb-20">
            <BackCrumb title={title} crumbs={['Settings', 'Holiday / Leave Settings', 'Holiday Policy', title]} />
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
              <form onSubmit={(e) => e.preventDefault()}>
                <div>
                  <div className="holiday-policy-edit">
                    <div className="holiday-sub-policy">
                      <div>
                        <label className="shift-type-label">Template Name</label>
                      </div>
                      <div>
                        <input type="text" className="form-control shift-edit-input" placeholder="Enter Template Name" value={name} onChange={(e) => setName(e.target.value)} />
                        {errs.name && <span className="error error_message proxima_nova_semibold">{errs.name}</span>}
                      </div>
                    </div>
                    <div id="shift_time">
                      <div>
                        <label className="shift-type-label">Shift Time</label>
                      </div>
                      <div className="policy-weekly-shifttime">
                        <div className="policy-inner-time">
                          <div className="policy-start-time">
                            <MonthPicker id="shift_start_time" className="input-group-addon staff-salary form-control shift-edit-input weekly-policy-level" placeholder="Enter Start Time" value={start} onChange={setStart} />
                          </div>
                          <p>To</p>
                          <div className="policy-start-to-time">
                            <MonthPicker key={start} id="shift_end_time" className="input-group-addon staff-salary form-control shift-edit-input weekly-policy-level" placeholder="Enter End Time" minMonth={start ? nextMonth(start) : undefined} value={end} onChange={setEnd} />
                          </div>
                        </div>
                        {errs.time && <span className="error error_message proxima_nova_semibold">{errs.time}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="holiday-policy-edit-sec">
                  <h2 className="section_title proxima_nova_semibold">Holiday&apos;s</h2>
                  <div id="add_holiday" onClick={() => setHolidays((h) => [...h, { name: '', date: '' }])}>+ Add Holiday</div>
                </div>
                <div className="holiday-policy-edit-third">
                  <div className="holiday-date-sub">
                    {holidays.map((h, i) => (
                      <div className="policy-weekly-holiday" key={h.id ?? `n${i}`}>
                        <div className="policy-holiday-inner">
                          <div className="policy-holiday">
                            <label className="shift-type-label">Holiday Name</label>
                          </div>
                          <div className="main-holiday-input">
                            <input type="text" className="holiday_name form-control shift-edit-input holiday-input" placeholder="Enter Holiday Name" value={h.name} onChange={(e) => patch(i, { name: e.target.value })} />
                          </div>
                        </div>
                        <div className="policy-date-inner">
                          <div className="holiday_policy_date">
                            <div className="policy-holiday">
                              <label className="shift-type-label">Holiday Date</label>
                            </div>
                            <DatePicker
                              className="holiday_date form-control shift-edit-input holiday-input"
                              format="dd M yyyy | D"
                              value={h.date}
                              min={start ? `${start}-01` : undefined}
                              max={end ? lastDay(end) : undefined}
                              onChange={(d) => patch(i, { date: d })}
                            />
                          </div>
                          <div
                            className="total-delete-icon first-icon-delete"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              if (h.id) {
                                setRemoveIdx(i);
                                void showOffcanvas('deleteholidayModal');
                              } else void removeHoliday(i);
                            }}
                          >
                            <I.Ie80bb6 />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
              <div className="flex justify-end gap-2 pt-4">
                {id && (
                  <button className="reject-btn proxima_nova_semibold" onClick={() => void showOffcanvas('deleteModal')}>
                    Delete
                  </button>
                )}
                <button
                  id="save_template"
                  onClick={submit}
                  disabled={save.isPending}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95"
                >
                  {id ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <ConfirmOffcanvas id="deleteholidayModal" className="holiday_offcanvas" title="Delete Holiday" message="Are you sure to delete this holiday?" onConfirm={() => removeIdx !== null && void removeHoliday(removeIdx)} />
      <ConfirmOffcanvas id="deleteModal" className="holiday_offcanvas" title="Delete Holiday Template" message="Are you sure to delete this holiday template?" busy={del.isPending} onConfirm={() => del.mutate()} />
    </>
  );
}
