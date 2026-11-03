'use client';

import { Fragment, useMemo, useState } from 'react';
import * as I from '@/components/icons';
import { empty, number_format, ucfirst, strtoupper, strtolower, in_array } from '@/lib/blade';
import { adminApi } from '@/lib/api';
import { useAdmin } from '@/lib/query';
import { fmtDate } from '@/lib/format';
import { showModal } from '@/lib/bs';
import { invoiceHtml, matchesStatus, type Trx } from '@/lib/invoice';
import { toast } from '@/lib/toast';

interface Sub { plan: string; billing_cycle: string; seats: number; expires_at: string | null; total_amount: number; price_per_seat: number; payment_method: string }
interface Overview {
  user: { phone_number: string | null; country_code: string | null; email: string | null };
  business: { name: string | null; business_address: string | null; shift_hour: number | null; bank_account: string | null; salary_duration: string | null; category: string | null };
  businesses: number; departments: number; pf_enabled: boolean; holiday_policies: number; weekly_holidays: number; leave_policies: number; shifts: number;
  punch_in_time_tolerance: number | null; staff_allowed_radius: number | null; timezone: string | null;
  subscription: { subscription: Sub | null; active_staff_count: number; transactions: Trx[] };
}

export default function Body() {
  const q = useAdmin<Overview>('/admin/settings/overview');
  const ov = q.data?.data;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [invoice, setInvoice] = useState<Trx | null>(null);

  const login_user = ov?.user ?? { phone_number: null, country_code: null, email: null };
  const business_data = [ov?.business ?? { name: null, business_address: null, shift_hour: null, bank_account: null, salary_duration: null }];
  const business_category = ov?.business.category ?? null;
  const business_pf = { is_enable: ov?.pf_enabled ? 1 : 0 };
  const businesses = ov?.businesses ?? 0;
  const holiday_template_count = ov?.holiday_policies ?? 0;
  const weekly_holiday_count = ov?.weekly_holidays ?? 0;
  const leave_template_count = ov?.leave_policies ?? 0;
  const department = ov?.departments ?? 0;
  const shift_count = ov?.shifts ?? 0;
  const attendanceSetting = ov?.punch_in_time_tolerance == null ? [] : [{ punch_in_time_tolerance: ov.punch_in_time_tolerance }];
  const system_settings = (ov ? { staff_allowed_radius: ov.staff_allowed_radius, timezone: ov.timezone } : null) as { staff_allowed_radius: number | null; timezone: string | null }; // guarded by empty() in the markup
  const activeSubscription = (ov?.subscription.subscription ?? null) as Sub; // guarded by empty() in the markup
  const active_users_count = ov?.subscription.active_staff_count ?? 0;
  const seatsLimit = activeSubscription ? activeSubscription.seats : 15;
  const usagePercentage = Math.min(100, Math.round((active_users_count / Math.max(1, seatsLimit)) * 100));
  const activeCurrencySymbol = activeSubscription?.payment_method?.toLowerCase().includes('kelviq') ? '$' : '₹';
  const daysLeft = activeSubscription?.expires_at ? (new Date(activeSubscription.expires_at).getTime() - Date.now()) / 86400000 : 0;
  const transactions = ov?.subscription.transactions ?? [];
  const visibleTrx = useMemo(() => {
    const term = search.toLowerCase().trim();
    return transactions.filter((t) => matchesStatus(t.status, statusFilter) && (!term || `${t.order_id} ${t.payment_id} ${t.plan_name} ${t.status}`.toLowerCase().includes(term)));
  }, [transactions, search, statusFilter]);
  const dMY = (d: string) => fmtDate(d, { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ (\d{4})$/, ', $1');
  const openInvoice = (t: Trx) => {
    setInvoice(t);
    void showModal('taxInvoiceModal');
  };
  const downloadInvoice = async () => {
    if (!invoice) return;
    try {
      await adminApi.download('/admin/subscriptions/invoice', { id: invoice.id, is_log: invoice.is_log ? 1 : 0 }, 'invoice.pdf');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed');
    }
  };

  return (
    <>

    <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-10">
                <div className="d-flex align-items-start gap-3">
                    <div className="card m-0 p-0">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center p-3 gap-2">Settings</h2>
                        <div className="nav flex-column nav-pills pb-2" id="v-pills-tab" role="tablist" aria-orientation="vertical">
                            <button className="nav-link active" id="v-pills-home-tab" data-bs-toggle="pill" data-bs-target="#account-setting" type="button" role="tab" aria-controls="v-pills-home" aria-selected="true">
                                <div className="flex items-center gap-2.5 first:mt-0">
                                    <I.I7251a4 />
                                    <h2 className="text-sm flex items-center mb-0 gap-2">Account Settings</h2>
                                </div>
                            </button>
                            <button className="nav-link" id="v-pills-profile-tab" data-bs-toggle="pill" data-bs-target="#business-setting" type="button" role="tab" aria-controls="v-pills-profile" aria-selected="false">
                                <div className="flex items-center gap-2.5 first:mt-0">
                                    <I.I543b56 />
                                    <h2 className="text-sm flex items-center mb-0">Business Settings</h2>
                                </div>
                            </button>
                            <button className="nav-link" id="v-pills-messages-tab" data-bs-toggle="pill" data-bs-target="#holiday-leave-setting" type="button" role="tab" aria-controls="v-pills-messages" aria-selected="false">
                                <div className="flex items-center gap-2.5 first:mt-0">
                                    <I.Idcb05e />
                                    <h2 className="text-sm flex items-center mb-0">Holiday / Leave Settings</h2>
                                </div>
                            </button>
                            <button className="nav-link" id="v-pills-settings-tab" data-bs-toggle="pill" data-bs-target="#attendance-setting" type="button" role="tab" aria-controls="v-pills-settings" aria-selected="false">
                                <div className="flex items-center gap-2.5 first:mt-0">
                                    <I.I6b276a />
                                    <h2 className="text-sm flex items-center mb-0">Attendance Settings</h2>
                                </div>
                            </button>
                            <button className="nav-link" id="v-pills-subscription-tab" data-bs-toggle="pill" data-bs-target="#subscription-setting" type="button" role="tab" aria-controls="subscription-setting" aria-selected="false">
                                <div className="flex items-center gap-2.5 first:mt-0">
                                    <I.I26e1f3 />
                                    <h2 className="text-sm flex items-center mb-0">Subscription & History</h2>
                                </div>
                            </button>
                            <button className="nav-link" id="v-pills-settings-tab" data-bs-toggle="pill" data-bs-target="#system-setting" type="button" role="tab" aria-controls="v-pills-settings" aria-selected="false">
                                <div className="flex items-center gap-2.5 first:mt-0">
                                    <I.I6b276a />
                                    <h2 className="text-sm flex items-center mb-0">System Settings</h2>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div className="card m-0 p-0 w-75">
                        <div className="tab-content" id="v-pills-tabContent">
                            <div className="tab-pane fade show active" id="account-setting" role="tabpanel" aria-labelledby="account-setting-tab">
                                <section className="p-3">
                                    <div className="flex items-center gap-2.5 mb-4 mt-8 first:mt-0">
                                        <I.I85c5f6 />
                                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">Account
                                            Settings
                                            <I.I376df5 />
                                        </h2>
                                    </div>
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                                        <a href={"/setting/account_setting_new"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Phone
                                                    Number</span>
                                                <div className="flex items-center gap-3">
                                                    {(login_user['phone_number']) ? (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">+{(login_user.country_code)}{(login_user['phone_number'])}</span>
                                                    </>) : (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-400 italic">Not
                                                            Added</span>
                                                    </>)}
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>
                                        <a href={"/setting/account_setting_new"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Email
                                                    ID</span>
                                                <div className="flex items-center gap-3">
                                                    {(login_user['email']) ? (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">{(login_user['email'])}</span>
                                                    </>) : (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-400 italic">Not
                                                            Added</span>
                                                    </>)}
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>
                                        
                                            
                                                
                                                
                                                    
                                                    
                                                        
                                                        
                                                    
                                                
                                            
                                    </div>
                                </section>
                            </div>
                            <div className="tab-pane fade" id="business-setting" role="tabpanel" aria-labelledby="business-setting-tab">
                                <section className="p-3">
                                    <div className="flex items-center gap-2.5 mb-4 mt-8 first:mt-0">
                                        <I.I33fd9c />
                                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">Business
                                            Settings
                                            <I.I376df5 />
                                        </h2>
                                    </div>
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                                        <a href={"/setting/manage_business_new"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100 cursor-pointer">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">ManageBusiness</span>
                                                <div className="flex items-center gap-3">
                                                    {(businesses == 0) ? (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-400 italic">No
                                                            Business Added</span>
                                                    </>) : (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">{(businesses)}{" "}Business Added</span>
                                                    </>)}
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>
                                        <a href={"/setting/manage_business_new"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100 cursor-pointer">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">BusinessName</span>
                                                <div className="flex items-center gap-3">
                                                    {(business_data[0]['name']) ? (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">{(business_data[0]['name'])}</span>
                                                    </>) : (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-400 italic">NotAdded</span>
                                                    </>)}
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>
                                        <a href={"/setting/manage_business_new"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100 cursor-pointer">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Business
                                                    Category</span>
                                                <div className="flex items-center gap-3">
                                                    {(business_category) ? (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">{(business_category)}</span>
                                                    </>) : (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-400 italic">Not
                                                            Added</span>
                                                    </>)}
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>
                                        <a href={"/setting/manage_business_new"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100 cursor-pointer">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Business
                                                    Address</span>
                                                <div className="flex items-center gap-3">
                                                    {(business_data[0]['business_address']) ? (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">
                                                            <span className="max-w-md truncate block" title={(business_data[0]['business_address'])}>{(business_data[0]['business_address'])}</span>
                                                        </span>
                                                    </>) : (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-400 italic">Not
                                                            Added</span>
                                                    </>)}
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>
                                        <a href={"/setting/manage_business_new"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100 cursor-pointer">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Working
                                                    Hours</span>
                                                <div className="flex items-center gap-3">
                                                    {(business_data[0]['shift_hour']) ? (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">{(business_data[0]['shift_hour'])}{" "}hours</span>
                                                    </>) : (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-400 italic">Not
                                                            Added</span>
                                                    </>)}
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>
                                        <a href={"/setting/manage_business_new"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100 cursor-pointer">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Bank
                                                    Details</span>
                                                <div className="flex items-center gap-3">
                                                    {(business_data[0]['bank_account']) ? (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">{(business_data[0]['bank_account'])}</span>
                                                    </>) : (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-400 italic">Not
                                                            Added</span>
                                                    </>)}
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>
                                        <a href={"/setting/manage_business_new"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100 cursor-pointer">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Salary
                                                    Duration</span>
                                                <div className="flex items-center gap-3">
                                                    {(business_data[0]['salary_duration']) ? (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">
                                                            <span className="capitalize bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">{(business_data[0]['salary_duration'])}</span>
                                                        </span>
                                                    </>) : (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-400 italic">Not
                                                            Added</span>
                                                    </>)}
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>
                                        <a href={"/setting/pf_calculation_new"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100 cursor-pointer">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">PF
                                                    calculation</span>
                                                <div className="flex items-center gap-3">
                                                    {(!empty(business_pf) && (business_pf['is_enable'] == 1)) ? (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">
                                                            <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded text-xs">ON</span>
                                                        </span>
                                                    </>) : (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">
                                                            <span className="text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded text-xs">OFF</span>
                                                        </span>
                                                    </>)}
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>
                                    </div>
                                </section>
                            </div>
                            <div className="tab-pane fade" id="holiday-leave-setting" role="tabpanel" aria-labelledby="holiday-leave-setting-tab">
                                <section className="p-3">
                                    <div className="flex items-center gap-2.5 mb-4 mt-8 first:mt-0">
                                        <I.I82ac2b />
                                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">Holiday /
                                            Leave Settings
                                            <I.I376df5 />
                                        </h2>
                                    </div>
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                                        
                                            <a href={"/setting/holiday_policy_new"}>
                                                <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Holiday
                                                        Policy</span>
                                                    <div className="flex items-center gap-3">
                                                        {(holiday_template_count == 0) ? (<>
                                                            <span className="text-sm font-medium transition-colors text-gray-400 italic">Not
                                                                Added</span>
                                                        </>) : (<>
                                                            <span className="text-sm font-medium transition-colors text-gray-900">{(holiday_template_count)}{" "}Added</span>
                                                        </>)}
                                                        <I.I3ba3af />
                                                    </div>
                                                </div>
                                            </a>
                                            <a href={"/setting/weekly_holiday_policy_business_level_new"}>
                                                <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Weekly
                                                        holiday policy</span>
                                                    <div className="flex items-center gap-3">
                                                        {(weekly_holiday_count == 0) ? (<>
                                                            <span className="text-sm font-medium transition-colors text-gray-400 italic">Not
                                                                Assigned</span>
                                                        </>) : (<>
                                                            <span className="text-sm font-medium transition-colors text-gray-900">{(weekly_holiday_count)}{" "}Assigned</span>
                                                        </>)}
                                                        <I.I3ba3af />
                                                    </div>
                                                </div>
                                            </a>
                                            <a href={"/setting/leave_policy_new"}>
                                                <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Leave
                                                        Policy</span>
                                                    <div className="flex items-center gap-3">
                                                        {(leave_template_count == 0) ? (<>
                                                            <span className="text-sm font-medium transition-colors text-gray-400 italic">Not
                                                                Added</span>
                                                        </>) : (<>
                                                            <span className="text-sm font-medium transition-colors text-gray-900">{(leave_template_count)}{" "}Policy Added</span>
                                                        </>)}
                                                        <I.I3ba3af />
                                                    </div>
                                                </div>
                                            </a>
                                            <a href={"/setting/departments_new"}>
                                                <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Departments</span>
                                                    <div className="flex items-center gap-3">
                                                        {(department == 0) ? (<>
                                                            <span className="text-sm font-medium transition-colors text-gray-400 italic">Manage
                                                                your Department</span>
                                                        </>) : (<>
                                                            <span className="text-sm font-medium transition-colors text-gray-900">{(department)}{" "}Department</span>
                                                        </>)}
                                                        <I.I3ba3af />
                                                    </div>
                                                </div>
                                            </a>
                                    </div>
                                </section>
                            </div>
                            <div className="tab-pane fade" id="attendance-setting" role="tabpanel" aria-labelledby="attendance-setting-tab">
                                <section className="p-3">
                                    <div className="flex items-center gap-2.5 mb-4 mt-8 first:mt-0">
                                        <I.Ia8776f />
                                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">Attendance
                                            Settings
                                            <I.I376df5 />
                                        </h2>
                                    </div>
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                                        <a href={"/setting/shift_setting_new"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Shift
                                                    Settings</span>
                                                <div className="flex items-center gap-3">
                                                    {(shift_count == 0) ? (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-400 italic">No
                                                            Shift Added</span>
                                                    </>) : (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">{(shift_count)}{" "}Shift Added</span>
                                                    </>)}
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>
                                        <a href={"/setting/attendance_setting"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Attendance
                                                    Settings</span>
                                                <div className="flex items-center gap-3">
                                                    {(attendanceSetting.length === 0) ? (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-400 italic">Added</span>
                                                    </>) : (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">{(attendanceSetting[0].punch_in_time_tolerance)}{" "}Min</span>
                                                    </>)}
                                                    
                                                    
                                                    
                                                    
                                                    
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>
                                        <a href={"/setting/automation_rules_new"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Automation
                                                    Rules</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium transition-colors text-gray-900">Late
                                                        Entry rules</span>
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>
                                    </div>
                                </section>
                            </div>
                            <div className="tab-pane fade" id="system-setting" role="tabpanel" aria-labelledby="system-setting-tab">
                                <section className="p-3">
                                    <div className="flex items-center gap-2.5 mb-4 mt-8 first:mt-0">
                                        <I.Ia8776f />
                                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">System
                                            Settings
                                            <I.I376df5 />
                                        </h2>
                                    </div>
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                                        <a href={"/setting/live_location_setting"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Live Location Settings</span>
                                                <div className="flex items-center gap-3">
                                                    
                                                    <span className="text-sm font-medium transition-colors text-gray-400 italic">Added</span>
                                                    
                                                    
                                                    
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>
                                        <a href={"/setting/staff_allowed_radius"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Geo
                                                    Fencing (Radius in meters)</span>
                                                <div className="flex items-center gap-3">
                                                    {(empty(system_settings) || system_settings.staff_allowed_radius == null) ? (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-400 italic">Added</span>
                                                    </>) : (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">{(system_settings.staff_allowed_radius)}</span>
                                                    </>)}
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>

                                        <a href={"/setting/time-zone"}>
                                            <div className="group flex items-center justify-between py-4 px-4 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">TimeZone</span>
                                                <div className="flex items-center gap-3">
                                                     {(empty(system_settings) || system_settings.timezone == null) ? (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-400 italic">Added</span>
                                                     </>) : (<>
                                                        <span className="text-sm font-medium transition-colors text-gray-900">{(system_settings.timezone)}</span>
                                                     </>)}
                                                    <I.I3ba3af />
                                                </div>
                                            </div>
                                        </a>


                                    </div>
                                </section>
                            </div>
                            <div className="tab-pane fade" id="subscription-setting" role="tabpanel" aria-labelledby="v-pills-subscription-tab">
                                <section className="p-3">
                                    <div className="flex items-center justify-between mb-4 mt-8 first:mt-0">
                                        <div className="flex items-center gap-2.5">
                                            <I.I379a02 />
                                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                Subscription & Payment History
                                                <I.I7a71f8 />
                                            </h2>
                                        </div>
                                        
                                    </div>

                                    
                                    <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px", marginBottom: "20px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
                                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", paddingBottom: "16px", borderBottom: "1px solid #f1f5f9" }}>
                                            <div>
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "600", color: "#2F8CFF" }}>CURRENT
                                                        ACTIVE PLAN</span>
                                                    {(!empty(activeSubscription) && activeSubscription.expires_at && new Date(activeSubscription.expires_at) > new Date()) ? (<>
                                                        <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", backgroundColor: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }}>Active</span>
                                                    </>) : (<>
                                                        <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", backgroundColor: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" }}>Free
                                                            / Trial</span>
                                                    </>)}
                                                </div>
                                                <h3 style={{ fontSize: "22px", fontWeight: "700", marginTop: "6px", marginBottom: "0", color: "#0f172a" }}>
                                                    {(!empty(activeSubscription) ? ucfirst(activeSubscription.plan) + ' Plan' : 'Free Basic Plan')}
                                                </h3>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <div style={{ fontSize: "12px", color: "#64748b" }}>Billing Cycle</div>
                                                <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>
                                                    {(!empty(activeSubscription) ? ucfirst(activeSubscription.billing_cycle) : 'Monthly')}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "20px" }}>
                                            
                                            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                                                    <span>Active Users / Seats</span>
                                                                                                        <span style={{ fontWeight: "700", color: "#2F8CFF" }}>{(usagePercentage)}%</span>
                                                </div>
                                                <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
                                                    {(active_users_count)} <span style={{ fontSize: "12px", fontWeight: "400", color: "#64748b" }}>/{" "}{(seatsLimit)} Seats Used</span>
                                                </div>
                                                <div style={{ width: "100%", backgroundColor: "#e2e8f0", borderRadius: "10px", height: "8px", overflow: "hidden" }}>
                                                    <div style={{ backgroundColor: "#2F8CFF", height: "8px", borderRadius: "10px", width: ((usagePercentage)) + "%", transition: "width 0.4s ease" }}>
                                                    </div>
                                                </div>
                                            </div>

                                            
                                                                                        <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
                                                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Total
                                                    Amount</div>
                                                <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                                                    {(activeCurrencySymbol)}{(!empty(activeSubscription) ? number_format(activeSubscription.total_amount, 2) : '0.00')}
                                                </div>
                                                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
                                                    {(activeCurrencySymbol)}{(!empty(activeSubscription) ? number_format(activeSubscription.price_per_seat, 2) : '0')}{" "}/ seat
                                                </div>
                                            </div>

                                            
                                            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
                                                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Plan
                                                    Expiry Date</div>
                                                <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                                                    {(!empty(activeSubscription) && activeSubscription.expires_at ? dMY(activeSubscription.expires_at!) : 'N/A')}
                                                </div>
                                                <div style={{ fontSize: "12px", marginTop: "6px" }}>
                                                    {(!empty(activeSubscription) && activeSubscription.expires_at) ? (<>
                                                                                                                {(daysLeft > 0) ? (<>
                                                            <span style={{ color: "#16a34a", fontWeight: "600" }}>{Math.trunc(daysLeft)}{" "}days remaining</span>
                                                        </>) : (<>
                                                            <span style={{ color: "#dc2626", fontWeight: "600" }}>Expired</span>
                                                        </>)}
                                                    </>) : (<>
                                                        <span style={{ color: "#64748b" }}>Lifetime / Renewal required</span>
                                                    </>)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                        <div className="items-stretch sm:items-center justify-between gap-3 mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                    Payment History & Previous Transactions</h3>
                                                <p className="text-xs text-gray-500">View payment logs, filter by status, and
                                                    download tax invoices.</p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                
                                                <div className="approve-data-search relative flex-1 sm:w-64">
                                                    <input type="text" id="transactionSearchInput" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Order ID, Plan..." className="input-search-rounded search-input w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                                     
                                                         
                                                        
                                                </div>
                                                
                                                <div className="business_selct_box select_mate_option staff-option_select">
                                                    <div className="custom-dropdown transaction-filter-dropdown">
                                                        <div className="dropdown-trigger">
                                                            
                                                            <span className="selected-value">All Statuses</span>
                                                        </div>
                                                        <ul className="dropdown-options">
                                                            <li data-value="ALL" className="selected">All Statuses</li>
                                                            <li data-value="SUCCESS">Success / Active</li>
                                                            <li data-value="PENDING">Pending</li>
                                                            <li data-value="FAILED">Failed / Cancelled</li>
                                                        </ul>
                                                        
                                                        <select id="transactionStatusFilter" className="mySelect_sort status_filter" style={{ display: "none" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                                            <option value="ALL" /* selected */>All Statuses</option>
                                                            <option value="SUCCESS">Success / Active</option>
                                                            <option value="PENDING">Pending</option>
                                                            <option value="FAILED">Failed / Cancelled</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {(!empty(transactions)) ? (<>
                                        <div id="trxTableWrapper" className="overflow-x-auto">
                                            <table className="w-full text-left text-xs text-gray-600" id="transactionsTable" style={{ borderCollapse: "collapse", tableLayout: "fixed", minWidth: "680px" }}>
                                                <colgroup>
                                                    <col style={{ width: "18%" }} />
                                                    <col style={{ width: "18%" }} />
                                                    <col style={{ width: "10%" }} />
                                                    <col style={{ width: "12%" }} />
                                                    <col style={{ width: "14%" }} />
                                                    <col style={{ width: "14%" }} />
                                                </colgroup>
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                            <th className="py-3 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-left whitespace-nowrap">
                                                                Date & Time</th>
                                                            <th className="py-3 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-left whitespace-nowrap">
                                                                Plan & Cycle</th>
                                                            <th className="py-3 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                                                                Seats</th>
                                                            <th className="py-3 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">
                                                                Amount</th>
                                                            <th className="py-3 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                                                                Status</th>
                                                            <th className="py-3 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center whitespace-nowrap">
                                                                Invoice</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 font-medium">
                                                    {visibleTrx.map((trx, _i1) => (<Fragment key={_i1}>
                                                                                                                <tr className="hover:bg-blue-50/30 transition-colors transaction-row" data-status={(strtoupper(trx['status']))} data-search={(strtolower(trx['order_id'] + ' ' + trx['payment_id'] + ' ' + trx['plan_name'] + ' ' + trx['status']))}>
                                                            <td className="py-3.5 px-4" data-label="Date & Time">
                                                                <div className="text-[12px] font-medium text-gray-700 whitespace-nowrap">
                                                                    {(fmtDate(trx['date_raw']))}
                                                                </div>
                                                                <div className="text-[11px] text-gray-400 whitespace-nowrap">
                                                                    {(trx['created_at'].split(', ')[1] ?? trx['created_at'])}
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4" data-label="Plan & Cycle">
                                                                <div className="font-semibold text-gray-800 text-[12px]">
                                                                    {(trx['plan_name'])}
                                                                </div>
                                                                <div className="text-[11px] text-gray-400">
                                                                    {(trx['billing_cycle'])}
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-center" data-label="Seats">
                                                                <span className="inline-flex items-center justify-center w-8 h-6 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600">
                                                                    {(trx['seats'])}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-right font-bold text-gray-900 whitespace-nowrap" data-label="Amount">
                                                                <span className="text-[13px]">{(trx['currency_symbol'])}{(number_format(trx['amount'], 2))}</span>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-center whitespace-nowrap" data-label="Status">
                                                                {(in_array(strtoupper(trx['status']), ['SUCCESS', 'ACTIVE', 'PAID', 'SUCCESSFUL'])) ? (<>
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                        Success
                                                                    </span>
                                                                </>) : (in_array(strtoupper(trx['status']), ['PENDING', 'PROCESSING'])) ? (<>
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                                        Pending
                                                                    </span>
                                                                </>) : (<>
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                                        {(ucfirst(strtolower(trx['status'])))}
                                                                    </span>
                                                                </>)}
                                                            </td>
                                                            <td className="py-3 px-4 text-center whitespace-nowrap" data-label="Invoice">
                                                                <button type="button" /* onclick=showInvoiceModal(E134) */ className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors">
                                                                    <I.Ia26621 />
                                                                    Invoice
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    </Fragment>))}
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        <div id="trxEmptyState" className="hidden py-8 text-center text-gray-500">
                                            <I.I76bf8a />
                                            <p className="font-medium text-sm text-gray-600">No transactions match your search
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">Try a different keyword or reset the
                                                filter.</p>
                                        </div>
                                        </>) : (<>
                                        <div id="trxNoDataState" className="py-12 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl bg-gray-50 pt-2">
                                            <I.I6fd1c0 />
                                            <p className="font-medium text-sm text-gray-600">No payment transactions found</p>
                                            <p className="text-xs text-gray-400 mt-1">Your payment logs and invoices will appear here after subscribing.</p>
                                        </div>
                                        </>)}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    
    <div className="modal fade" id="taxInvoiceModal" tabIndex={-1} aria-labelledby="taxInvoiceModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-2xl border-0 shadow-2xl overflow-hidden">
                <div className="modal-header text-white border-0 px-6 py-4 flex items-center justify-between" style={{ backgroundColor: "#2F8CFF" }}>
                    <h5 className="modal-title font-bold text-base flex items-center gap-2" id="taxInvoiceModalLabel">
                        <I.I463faa />
                        Tax Invoice
                    </h5>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => void downloadInvoice()} className="px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors flex items-center gap-1">
                            <I.I338c5d />
                            Download PDF
                        </button>
                        <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                </div>
                <div className="modal-body p-6 bg-slate-50" id="invoiceModalContent" style={{ border: "1px solid #dee2e6", borderRadius: "0px 0px 10px 10px" }}><div dangerouslySetInnerHTML={{ __html: invoice ? invoiceHtml(invoice) : "" }} /></div>
            </div>
        </div>
    </div>

    

    
    

    </>
  );
}
