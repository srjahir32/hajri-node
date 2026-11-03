'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { toast } from '@/lib/toast';
import * as I from '@/components/icons';

interface Pf { is_enabled: boolean; employee_percentage: number; employer_eps_percentage: number; employer_epf_percentage: number; capped_amount: number | null }
const blank = { is_enabled: false, employee_percentage: '', employer_eps_percentage: '', employer_epf_percentage: '', capped_amount: '' };

export default function Body() {
  const q = useAdmin<Pf>('/admin/pf');
  const [f, setF] = useState<Record<string, string | boolean>>(blank);
  const [errs, setErrs] = useState<Record<string, string>>({});
  useEffect(() => {
    const d = q.data?.data;
    if (d) setF({ is_enabled: d.is_enabled, employee_percentage: String(d.employee_percentage), employer_eps_percentage: String(d.employer_eps_percentage), employer_epf_percentage: String(d.employer_epf_percentage), capped_amount: d.capped_amount == null ? '' : String(d.capped_amount) });
  }, [q.data]);
  const set = (k: string) => (e: { target: { value: string } }) => setF((c) => ({ ...c, [k]: e.target.value }));
  const save = useAction(
    () => adminApi.put('/admin/pf', { is_enabled: f.is_enabled, employee_percentage: Number(f.employee_percentage), employer_eps_percentage: Number(f.employer_eps_percentage), employer_epf_percentage: Number(f.employer_epf_percentage), capped_amount: f.capped_amount === '' ? null : Number(f.capped_amount) }),
    { invalidate: ['/admin/pf', '/admin/settings'], success: 'PF settings saved successfully' },
  );
  const submit = () => {
    const e: Record<string, string> = {};
    if (f.is_enabled) {
      for (const k of ['employee_percentage', 'employer_eps_percentage', 'employer_epf_percentage']) if (f[k] === '' || Number(f[k]) < 0 || Number(f[k]) > 100) e[k] = 'Enter a value between 0 and 100';
      if (f.capped_amount === '') e.capped_amount = 'Salary cap amount is required';
    }
    setErrs(e);
    if (Object.keys(e).length) return toast.error('Please correct the highlighted fields');
    save.mutate();
  };
  const Err = ({ k }: { k: string }) => (errs[k] ? <span className="error error_message proxima_nova_semibold">{errs[k]}</span> : null);
  return (
    <>

    <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
                <div className="flex flex-col gap-1">
                    <button onClick={() => history.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit group">
                        <I.I145b1c />
                        <span className="font-semibold text-lg">Pf Calculations</span>
                    </button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1"><span>Settings</span>
                        <I.I8b8a74 />
                        <span>Business info</span>
                        <I.I8b8a74 />
                        <span className="text-foreground font-medium">Pf Calculations</span></div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        <div className="lg:col-span-1 space-y-4">
                            

                            <div className="rounded-xl p-6 text-white shadow-lg relative" style={{ background: "#2F8CFF" }}>
                                <div className="absolute top-6 right-4 p-12 opacity-10 pointer-events-none">
                                    <I.I36fc55 />
                                </div>
                                <div className="d-flex gap-2 mb-3 align-items-center">
                                    <I.Ie0df81 />
                                    <h3 className="text-xl font-bold mb-0">About PF</h3>
                                </div>
                                <p className="text-sm text-white/90 leading-relaxed mb-6">
                                    Configure Provident Fund (PF) settings for your organization. Calculated based on employee salary or the capped amount.
                                </p>
                                
                                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                                    <p className="text-xs  text-white/80 uppercase tracking-wide mb-3">Standard Configuration (India)</p>
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-white/90">Employee Share</span>
                                            <span className="text-sm font-bold">12%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-white/90">Employer EPF</span>
                                            <span className="text-sm font-bold">3.67%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-white/90">Employer EPS</span>
                                            <span className="text-sm font-bold">8.33%</span>
                                        </div>
                                        <div className="h-px bg-white/20 my-2"></div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-white/90">Capped Limit</span>
                                            <span className="text-sm font-bold">₹15,000</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                <div className="flex items-start gap-2">
                                    <I.I6fe2e1 />
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-1">Compliance Note</h4>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            Ensure these values align with the latest EPFO guidelines. Changes here will affect payroll calculations from the next cycle.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <div className="flex items-center justify-between mb-1">
                                    <h2 className="text-lg font-bold text-gray-900">Configuration Parameters</h2>
                                </div>
                                <p className="text-sm text-gray-500 mb-6">Define the percentage split and salary caps.</p>
                                <form id="business_pf" method="post" className="space-y-6">
                                    
                                    
                                    <div className="border-t"></div>
                                    <div className="bg-gray-50 rounded-xl border border-blue-100 bg-blue-50/30 p-4 mb-6 transition-all hover:bg-blue-50/50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-900 mb-1">Enable PF Calculations</h3>
                                                <p className="text-xs text-gray-500 mb-0">Master switch to activate PF deductions for all eligible employees.</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span id="pf_status_label" className="text-sm font-medium text-gray-500">{(f.is_enabled ? 'Enabled' : 'Disabled')}</span>
                                                <label className="switch">
                                                    
                                                    <input type="checkbox" id="is_enable" checked={!!f.is_enabled} onChange={(e) => setF((c) => ({ ...c, is_enabled: e.target.checked }))} />
                                                    <span className="slider round"></span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t"></div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 font-medium" htmlFor="employee_percentage">Employee Contribution (%) <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <input type="number" className="flex w-full rounded-md border px-3 py-1 text-base shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-11 bg-gray-50/50 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" id="employee_percentage" placeholder="Enter value" value={f.employee_percentage as string} onChange={set('employee_percentage')} />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-0">Deducted from employee salary (Default: 12%)</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 font-medium" htmlFor="capped_amount">Salary Cap Amount <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" style={{ paddingLeft: "7px" }}>₹</span>
                                                <input type="number" className="flex w-full rounded-md border px-3 py-1 text-base shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-11 bg-gray-50/50 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" id="capped_amount" placeholder="Enter value" value={f.capped_amount as string} onChange={set('capped_amount')} style={{ paddingLeft: "20px" }} />
                                            </div>
                                            <p className="text-xs text-gray-500 mb-0">Deducted from employee salary (Default: 12%)</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 font-medium" htmlFor="employer_epf_percentage">Employer EPF (%) <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <input type="number" className="flex w-full rounded-md border px-3 py-1 text-base shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-11 bg-gray-50/50 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" id="employer_epf_percentage" placeholder="Enter value" value={f.employer_epf_percentage as string} onChange={set('employer_epf_percentage')} />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-0">Contribution to EPF account (Default: 3.67%)</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 font-medium" htmlFor="employer_eps_percentage">Employer EPS (%) <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <input type="number" className="flex w-full rounded-md border px-3 py-1 text-base shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-11 bg-gray-50/50 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" id="employer_eps_percentage" placeholder="Enter value" value={f.employer_eps_percentage as string} onChange={set('employer_eps_percentage')} />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-0">Contribution to Pension Scheme (Default: 8.33%)</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200"></div>
                                </form>
                                
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                    <button id="business_pf_btn" onClick={submit} disabled={save.isPending} className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95">
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    </main>

    </>
  );
}
