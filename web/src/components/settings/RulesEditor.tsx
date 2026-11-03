'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { toast } from '@/lib/toast';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { StaffPicker, type PickRow } from '@/components/widgets/StaffPicker';
import { PRIMARY_BTN } from '@/components/settings/SettingsCard';

export interface RuleKind {
  kind: 'overtime' | 'break' | 'late-entry' | 'early-exit';
  title: string;
  heading: string;
  /** css class prefix of the row blocks: container / item / wrapper */
  cls: { wrap: string; cont: string; item: string };
  perMinute: { check: string; thr: string; typeLabel: string; none: string };
  half: { check: string; thr: string; none: string };
  full: { check: string; thr: string; none: string };
  occurrences: boolean;
  checkLabelCls: string;
}

interface ApiRule { id: number; rule_type: number; threshold_minutes: number; multiples: number | null; fixed_amount: number | null; occurrences: number; enabled: boolean }
interface Row { thr: string; type: string; amount: string; multiple: string }
interface Section { on: boolean; rows: Row[]; occ: boolean; count: string }

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const mins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const blank = (): Row => ({ thr: '', type: '', amount: '', multiple: '' });
const fromApi = (r: ApiRule): Row => ({ thr: hhmm(r.threshold_minutes), type: r.fixed_amount != null ? 'fixed' : [1, 1.5, 2].includes(Number(r.multiples)) ? String(Number(r.multiples)) : 'custom', amount: r.fixed_amount != null ? String(r.fixed_amount) : '', multiple: r.multiples != null ? String(r.multiples) : '' });
const TYPES = [['', 'Select Overtime Type'], ['fixed', 'Fixed Amount'], ['1', '1x Salary (Per Minutes Salary)'], ['1.5', '1.5x Salary (Per Minutes Salary)'], ['2', '2x Salary (Per Minutes Salary)'], ['custom', 'Add Custom Salary Multiple']];

export function RulesEditor({ cfg }: { cfg: RuleKind }) {
  const q = useAdmin<{ rules: ApiRule[]; staff_count: number }>(`/admin/rules/${cfg.kind}`);
  const staffQ = useAdmin<{ id: number; name: string; phone_number: string | null; photo: string | null; department: string | null; assigned: boolean }[]>(`/admin/rules/${cfg.kind}/staff`);
  const [tab, setTab] = useState<'rules' | 'staff'>('rules');
  const [pm, setPm] = useState<Section>({ on: false, rows: [blank()], occ: false, count: '' });
  const [half, setHalf] = useState<Section>({ on: false, rows: [blank()], occ: false, count: '' });
  const [full, setFull] = useState<Section>({ on: false, rows: [blank()], occ: false, count: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});

  useEffect(() => {
    const rules = q.data?.data.rules;
    if (!rules) return;
    const sec = (t: number): Section => {
      const rs = rules.filter((r) => r.rule_type === t);
      return { on: rs.some((r) => r.enabled), rows: rs.length ? rs.map(fromApi) : [blank()], occ: !!rs[0]?.occurrences, count: rs[0]?.occurrences ? String(rs[0].occurrences) : '' };
    };
    setPm(sec(1));
    setHalf(sec(2));
    setFull(sec(3));
  }, [q.data]);

  const save = useAction(
    () => {
      const out: Record<string, unknown>[] = [];
      const occ = (s: Section) => (cfg.occurrences && s.occ ? Number(s.count) : 0);
      for (const [s, t] of [[pm, 1], [half, 2], [full, 3]] as [Section, number][]) {
        if (!s.on) continue;
        for (const r of t === 1 ? s.rows : s.rows.slice(0, 1)) {
          out.push({
            rule_type: t,
            threshold_minutes: mins(r.thr),
            ...(t === 1 ? (r.type === 'fixed' ? { fixed_amount: Number(r.amount) } : { multiples: Number(r.type === 'custom' ? r.multiple : r.type) }) : {}),
            occurrences: occ(s),
            enabled: true,
          });
        }
      }
      return adminApi.put(`/admin/rules/${cfg.kind}`, { rules: out });
    },
    { invalidate: [`/admin/rules/${cfg.kind}`], success: 'Rules saved successfully.' },
  );
  const apply = useAction((v: { selected: number[]; unselected: number[] }) => adminApi.post(`/admin/rules/${cfg.kind}/apply`, { selected_ids: v.selected, unselected_ids: v.unselected }), {
    invalidate: [`/admin/rules/${cfg.kind}`],
    success: 'Rule applied to staff',
  });

  const submit = () => {
    const e: Record<string, string> = {};
    const check = (key: string, s: Section, t: number) => {
      if (!s.on) return;
      (t === 1 ? s.rows : s.rows.slice(0, 1)).forEach((r, i) => {
        if (!r.thr || mins(r.thr) <= 0) e[`${key}thr${i}`] = 'Duration is required';
        if (t === 1) {
          if (!r.type) e[`${key}type${i}`] = 'Type field is required';
          if (r.type === 'fixed' && !(Number(r.amount) > 0)) e[`${key}amt${i}`] = 'Amount is required';
          if (r.type === 'custom' && !(Number(r.multiple) > 0)) e[`${key}mul${i}`] = 'Multiple is required';
        }
      });
      if (cfg.occurrences && s.occ && !(Number(s.count) > 0)) e[`${key}count`] = 'Count is required';
    };
    check('p', pm, 1);
    check('h', half, 2);
    check('f', full, 3);
    setErrs(e);
    if (Object.keys(e).length) return toast.error('Please correct the highlighted fields');
    save.mutate();
  };

  const Err = ({ k }: { k: string }) => (errs[k] ? <span className="error error_message proxima_nova_semibold">{errs[k]}</span> : null);
  const checkCls = 'form-check-label ' + cfg.checkLabelCls;
  const section = (key: string, s: Section, set: (s: Section) => void, t: 1 | 2 | 3, labels: { check: string; thr: string; none: string; typeLabel?: string }) => {
    const patch = (i: number, p: Partial<Row>) => set({ ...s, rows: s.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) });
    return (
      <div className="form-check" key={key}>
        <input className="form-check-input" type="checkbox" id={`${cfg.kind}_${key}`} checked={s.on} onChange={(e) => set({ ...s, on: e.target.checked })} />
        <label className={checkCls} htmlFor={`${cfg.kind}_${key}`}>{labels.check}</label>
        {s.on && (
          <div className="row">
            <div className="col-sm-12 mb-10">
              <div className="shift-setting-main account_setting_manage_business">
                <div className="hajri-salary-pays-main">
                  <div className="">
                    <div className={t === 1 ? cfg.cls.wrap : undefined}>
                      {(t === 1 ? s.rows : s.rows.slice(0, 1)).map((r, i) => (
                        <div className={cfg.cls.cont} key={i}>
                          <div className={cfg.cls.item}>
                            <label className="shift-type-label">{labels.thr}</label>
                            <input type="time" className="form-control shift-edit-input hours_time" value={r.thr} onChange={(e) => patch(i, { thr: e.target.value })} autoComplete="off" />
                            <span className="form-text">{labels.none}</span>
                            <Err k={`${key}thr${i}`} />
                          </div>
                          {t === 1 && (
                            <>
                              <div className={cfg.cls.item}>
                                <label className="shift-type-label">{labels.typeLabel} <span className="required">*</span></label>
                                <select className="form-select create-select section_sub_title account_setting_data" value={r.type} onChange={(e) => patch(i, { type: e.target.value })}>
                                  {TYPES.map(([v, l]) => <option key={v} value={v}>{v === '' ? `Select ${labels.typeLabel}` : l}</option>)}
                                </select>
                                {r.type === 'fixed' && <input type="number" className="form-control shift-edit-input mt-2" placeholder="Enter amount" value={r.amount} onChange={(e) => patch(i, { amount: e.target.value })} />}
                                {r.type === 'custom' && <input type="number" step="0.1" className="form-control shift-edit-input mt-2" placeholder="Enter multiple" value={r.multiple} onChange={(e) => patch(i, { multiple: e.target.value })} />}
                                <Err k={`${key}type${i}`} />
                                <Err k={`${key}amt${i}`} />
                                <Err k={`${key}mul${i}`} />
                              </div>
                              <div className={cfg.cls.item}>
                                {s.rows.length > 1 && (
                                  <div className="total-delete-icon" style={{ cursor: 'pointer' }} onClick={() => set({ ...s, rows: s.rows.filter((_, j) => j !== i) })}>
                                    <a href="#" className="text-danger" onClick={(e) => e.preventDefault()}><i className="fa-solid fa-trash"></i></a>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {t === 1 && (
                        <div className="mb-2">
                          <a href="#" className="overtime-a" id="add_time_range" onClick={(e) => { e.preventDefault(); set({ ...s, rows: [...s.rows, blank()] }); }}>Add Time Range</a>
                        </div>
                      )}
                    </div>
                    {cfg.occurrences && (
                      <div className="shift-inner-sub-label-edit">
                        <div className="set-occurrences">
                          <label className="checkbox-label">
                            <input type="checkbox" className="form-check-input checkbox-div" checked={s.occ} onChange={(e) => set({ ...s, occ: e.target.checked })} />
                            Set Occurrences
                          </label>
                        </div>
                        {s.occ && (
                          <div className="shift-inner-sub-label-edit">
                            <label className="shift-type-label">Count</label>
                            <input type="number" className="form-control shift-edit-input" placeholder="Enter number" value={s.count} onChange={(e) => set({ ...s, count: e.target.value })} />
                            <span className="form-text">Fine will be pardoned up to 3 minutes</span>
                            <Err k={`${key}count`} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const rows: PickRow[] = (staffQ.data?.data ?? []).map((r) => ({ id: r.id, name: r.name, phone_number: r.phone_number, photo: r.photo, sub: r.department, assigned: r.assigned }));
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title={cfg.title} crumbs={['Settings', 'Attendance Settings', 'Automation Rules', cfg.title]} />
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
            <h4 className="overtime-page-title proxima_nova_semibold">{cfg.heading}</h4>
            <ul className="nav nav-tabs" role="tablist">
              <li className="nav-item" role="presentation">
                <button className={`nav-link${tab === 'rules' ? ' active' : ''}`} type="button" onClick={() => setTab('rules')}>Rules</button>
              </li>
              <li className="nav-item" role="presentation">
                <button className={`nav-link${tab === 'staff' ? ' active' : ''}`} type="button" onClick={() => setTab('staff')}>Staff Selection</button>
              </li>
            </ul>
            <div className="tab-content">
              <div className={`tab-pane${tab === 'rules' ? ' active' : ''}`} style={{ display: tab === 'rules' ? 'block' : 'none' }}>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="row">
                    <div className="col-sm-7 automation-border">
                      <div className="main-content-inner">
                        {section('p', pm, setPm, 1, { ...cfg.perMinute })}
                        {section('h', half, setHalf, 2, cfg.half)}
                        {section('f', full, setFull, 3, cfg.full)}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button type="button" className={PRIMARY_BTN} disabled={save.isPending} onClick={submit}>Save</button>
                  </div>
                </form>
              </div>
              <div className="tab-pane" style={{ display: tab === 'staff' ? 'block' : 'none' }}>
                <div className="main-content-inner on-time-main main-atten">
                  <StaffPicker rows={rows} buttonLabel="Apply" busy={apply.isPending} onApply={(selected, unselected) => apply.mutate({ selected, unselected })} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
