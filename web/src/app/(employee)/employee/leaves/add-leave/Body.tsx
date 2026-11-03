'use client';

import { Fragment, useState } from 'react';
import { staffApi } from '@/lib/api';
import { useAction, useStaff } from '@/lib/query';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { PRIMARY_BTN } from '@/components/settings/SettingsCard';
import { F_INPUT, F_LABEL, F_SELECT, F_TEXTAREA } from '@/components/settings/formClasses';
import { DatePicker } from '@/components/widgets/DatePicker';
import { todayStr } from '@/lib/format';
import { navigate } from '@/lib/navigate';

interface Card { policy_id: number; template_name: string; leave_policy_cycle: string; period_text: string; is_carry_forward: number; monthly_rate: number; total_period_balance: number; accrued_to_date: number; total_used: number; remaining_balance: number; progress_percent: number }

export default function Body() {
  const cards = useStaff<Card[]>('/employee/leaves/balance').data?.data ?? [];
  const [f, setF] = useState({ start: '', end: '', paid: '', duration: '', half: '', reason: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = (k: string) => (e: { target: { value: string } }) => setF((c) => ({ ...c, [k]: e.target.value }));
  const policy = cards[0]?.policy_id;
  const apply = useAction(
    () => staffApi.post('/employee/leaves', { start_date: f.start, end_date: f.duration === 'Half Day' ? f.start : f.end, leave_type: f.duration, shift_type: f.duration === 'Half Day' ? f.half : undefined, is_unpaid: f.paid === '1', leave_policy_id: f.paid === '1' ? undefined : policy, reason: f.reason.trim() }),
    { invalidate: ['/employee/leaves'], onSuccess: () => window.setTimeout(() => (navigate('/employee/leaves')), 900) },
  );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.start) er.start = 'Start date is required';
    if (f.duration !== 'Half Day' && !f.end) er.end = 'End date is required';
    if (f.end && f.start && f.end < f.start) er.end = 'End date must be on or after the start date';
    if (!f.paid) er.paid = 'Leave type is required';
    if (!f.duration) er.duration = 'Leave duration is required';
    if (f.duration === 'Half Day' && !f.half) er.half = 'Select first or last half';
    if (!f.reason.trim()) er.reason = 'Reason is required';
    setErrs(er);
    if (!Object.keys(er).length) apply.mutate();
  };
  const Err = ({ k }: { k: string }) => (errs[k] ? <span className="error error_message proxima_nova_semibold">{errs[k]}</span> : null);
  const req = <span className="text-destructive">*</span>;
  return (
    <main className="flex-1 p-md-5 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title="Back" crumbs={['Leave', 'Add Leave']} />
{cards.length > 0 && (<>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px", marginBottom: "20px" }}>
                        {cards.map((template, _i1) => (<Fragment key={_i1}>
                            
                            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)", overflow: "hidden" }}>
                                
                                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", background: (template.leave_policy_cycle === 'monthly' ? 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)' : 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)'), display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                                            {(template.leave_policy_cycle === 'monthly') ? (<>
                                                <span style={{ background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe", fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                                    📅 Monthly Policy
                                                </span>
                                            </>) : (<>
                                                <span style={{ background: "#f3e8ff", color: "#6b21a8", border: "1px solid #e9d5ff", fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                                    📅 Yearly Policy
                                                </span>
                                            </>)}
                                            <span style={{ background: "#ffffff", color: "#64748b", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px" }}>
                                                ⏱️ {(template.period_text)}
                                            </span>
                                        </div>
                                        <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a", margin: "0", lineHeight: "1.3" }}>{(template.template_name)}</h3>
                                    </div>

                                    
                                    <div>
                                        {(!!template.is_carry_forward) ? (<>
                                            <span style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", fontSize: "12px", fontWeight: "700", padding: "5px 12px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "6px", boxShadow: "0 1px 3px rgba(16, 185, 129, 0.1)" }}>
                                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                                                Carry Forward: ON
                                            </span>
                                        </>) : (<>
                                            <span style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #cbd5e1", fontSize: "12px", fontWeight: "700", padding: "5px 12px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#94a3b8", display: "inline-block" }}></span>
                                                Carry Forward: OFF
                                            </span>
                                        </>)}
                                    </div>
                                </div>

                                
                                <div style={{ padding: "18px 20px" }}>
                                    
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
                                        
                                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 8px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>Total Period</span>
                                            <div style={{ marginTop: "6px" }}>
                                                <span style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a", lineHeight: "1" }}>{(template.total_period_balance)}</span>
                                                <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Days</span>
                                            </div>
                                            {(template.leave_policy_cycle === 'monthly') ? (<>
                                                <span style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", marginTop: "4px", display: "block" }}>({(template.monthly_rate)} Days/mo)</span>
                                            </>) : (<>
                                                <span style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", marginTop: "4px", display: "block" }}>Full Year</span>
                                            </>)}
                                        </div>

                                        
                                        <div style={{ background: "#eef2ff", border: "1px solid #e0e7ff", borderRadius: "12px", padding: "12px 8px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#4338ca", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>Accrued To Date</span>
                                            <div style={{ marginTop: "6px" }}>
                                                <span style={{ fontSize: "20px", fontWeight: "900", color: "#1e1b4b", lineHeight: "1" }}>{(template.accrued_to_date)}</span>
                                                <span style={{ fontSize: "11px", fontWeight: "700", color: "#4338ca" }}>Days</span>
                                            </div>
                                            <span style={{ fontSize: "10px", fontWeight: "600", color: "#4f46e5", marginTop: "4px", display: "block" }}>(Up to {(new Date().toLocaleString('en-GB', { month: 'short', year: 'numeric' }))})</span>
                                        </div>

                                        
                                        <div style={{ background: "#fff7ed", border: "1px solid #ffedd5", borderRadius: "12px", padding: "12px 8px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>Total Used</span>
                                            <div style={{ marginTop: "6px" }}>
                                                <span style={{ fontSize: "20px", fontWeight: "900", color: "#7c2d12", lineHeight: "1" }}>{(template.total_used)}</span>
                                                <span style={{ fontSize: "11px", fontWeight: "700", color: "#c2410c" }}>Days</span>
                                            </div>
                                            <span style={{ fontSize: "10px", fontWeight: "600", color: "#ea580c", marginTop: "4px", display: "block" }}>{(template.leave_policy_cycle === 'monthly' ? 'This Period' : 'This Year')}</span>
                                        </div>

                                        
                                        <div style={{ background: "#ecfdf5", border: "1px solid #d1fae5", borderRadius: "12px", padding: "12px 8px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#047857", textTransform: "uppercase", letterSpacing: "0.5px", display: "block" }}>Remaining</span>
                                            <div style={{ marginTop: "6px" }}>
                                                <span style={{ fontSize: "20px", fontWeight: "900", color: "#064e3b", lineHeight: "1" }}>{(template.remaining_balance)}</span>
                                                <span style={{ fontSize: "11px", fontWeight: "700", color: "#047857" }}>Days</span>
                                            </div>
                                            <span style={{ fontSize: "10px", fontWeight: "600", color: "#059669", marginTop: "4px", display: "block" }}>{((template.leave_policy_cycle === 'monthly' && !!!template.is_carry_forward) ? 'Available This Month' : 'Available Now')}</span>
                                        </div>
                                    </div>

                                    
                                    <div style={{ marginTop: "14px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px", fontSize: "11px", fontWeight: "700", color: "#64748b" }}>
                                            <span>Leave Consumption</span>
                                            <span>{(Math.round(template.progress_percent))}% Used</span>
                                        </div>
                                        <div style={{ width: "100%", height: "7px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: ((template.progress_percent)) + "%", background: "linear-gradient(90deg, #10b981 0%, #f59e0b 70%, #ef4444 100%)", borderRadius: "10px", transition: "width 0.5s ease" }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Fragment>))}
                    </div>
                </>)}
                
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
            <form id="add_leave_form" className="space-y-8" onSubmit={submit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className={F_LABEL} htmlFor="start_date">Start Date {req}</label>
                  <DatePicker id="start_date" className={F_INPUT} placeholder="Select start date" format="dd M yyyy" min={todayStr()} value={f.start} onChange={(d) => setF((c) => ({ ...c, start: d }))} />
                  <Err k="start" />
                </div>
                {f.duration !== 'Half Day' && (
                  <div className="space-y-2">
                    <label className={F_LABEL} htmlFor="end_date">End Date {req}</label>
                    <DatePicker id="end_date" className={F_INPUT} placeholder="Select end date" format="dd M yyyy" min={f.start || todayStr()} value={f.end} onChange={(d) => setF((c) => ({ ...c, end: d }))} />
                    <Err k="end" />
                  </div>
                )}
                <div className="space-y-2 relative mb-0">
                  <label className={F_LABEL} htmlFor="leave_type">Leave Type {req}</label>
                  <select className={F_SELECT} id="leave_type" value={f.paid} onChange={set('paid')}>
                    <option value="" disabled>Select Leave Type</option>
                    <option value="0">Paid</option>
                    <option value="1">Unpaid</option>
                  </select>
                  <Err k="paid" />
                </div>
                <div className="space-y-2 relative mb-0">
                  <label className={F_LABEL} htmlFor="leave_duration">Choose Leave {req}</label>
                  <select className={F_SELECT} id="leave_duration" value={f.duration} onChange={set('duration')}>
                    <option value="" disabled>Select Duration</option>
                    <option value="Full Day">Full Day</option>
                    <option value="Half Day">Half Day</option>
                  </select>
                  <Err k="duration" />
                </div>
                {f.duration === 'Half Day' && (
                  <div className="space-y-2 relative mb-0">
                    <label className={F_LABEL} htmlFor="shift_type">Half {req}</label>
                    <select className={F_SELECT} id="shift_type" value={f.half} onChange={set('half')}>
                      <option value="">Select Half</option>
                      <option value="First Half">First Half</option>
                      <option value="Last Half">Last Half</option>
                    </select>
                    <Err k="half" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className={F_LABEL} htmlFor="reason">Reason {req}</label>
                <textarea className={F_TEXTAREA} id="reason" placeholder="Enter reason" value={f.reason} onChange={set('reason')} />
                <Err k="reason" />
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" id="submit_leave" className={PRIMARY_BTN} disabled={apply.isPending}>Submit</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
