'use client';

import { useState } from 'react';
import * as I from '@/components/icons';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { hideOffcanvas } from '@/lib/bs';
import { MONTHS, monthStr } from '@/lib/format';
import { toast } from '@/lib/toast';
import { MonthPicker } from '@/components/widgets/MonthPicker';
import { navigate } from '@/lib/navigate';

interface PRow { id: number; processed: boolean }
type Choice = { approve: boolean; reject: boolean };
const KEY = 'payroll.month';

export default function Body() {
  const [ym, setYm] = useState(() => (typeof window !== 'undefined' ? window.sessionStorage.getItem(KEY) : null) ?? monthStr());
  const month = Number(ym.slice(5));
  const year = Number(ym.slice(0, 4));
  const pay = useAdmin<PRow[]>('/admin/payroll', { month, year });
  const rows = pay.data?.data ?? [];
  const processed_number = rows.filter((r) => r.processed).length;
  const pending_number = rows.length - processed_number;
  const [bulk, setBulk] = useState<Record<string, Choice>>({ punches: { approve: true, reject: false }, leave: { approve: true, reject: false }, attendance: { approve: true, reject: false }, total: { approve: true, reject: false } });
  const choose = (k: string, v: keyof Choice) => setBulk((b) => ({ ...b, [k]: { approve: v === 'approve' ? !b[k].approve : false, reject: v === 'reject' ? !b[k].reject : false } }));
  const pick = (m: string) => {
    setYm(m);
    window.sessionStorage.setItem(KEY, m);
  };
  const range = () => ({ from: `${ym}-01`, to: `${ym}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}` });

  const run = useAction(
    async () => {
      const ids = rows.filter((r) => !r.processed).map((r) => r.id);
      if (!ids.length) throw new Error('No pending payroll to process');
      const decide = async (src: string, path: string, key: string, field: 'status' | 'attendance_status') => {
        const c = bulk[key];
        if (!c.approve && !c.reject) return;
        const list = await adminApi.get<{ id: number; status?: number; attendance_status?: number }[]>(src, { ...range(), size: 200 });
        const pend = list.data.filter((x) => (x[field] ?? 0) === 0).map((x) => x.id);
        if (pend.length) await adminApi.post(path, { ids: pend, action: c.approve ? 'approve' : 'reject' });
      };
      await decide('/admin/attendance/punches', '/admin/attendance/requests/decide', 'punches', 'attendance_status');
      await decide('/admin/attendance/leaves', '/admin/attendance/leaves/decide', 'leave', 'status');
      if (bulk.attendance.approve) await adminApi.post('/admin/payroll/review', { month, year, kind: 'attendance', staff_ids: ids, reviewed: true });
      if (bulk.total.approve) await adminApi.post('/admin/payroll/review', { month, year, kind: 'total_pay', staff_ids: ids, reviewed: true });
      return adminApi.post('/admin/payroll/process', { month, year, staff_ids: ids });
    },
    { invalidate: ['/admin/payroll', '/admin/attendance'], success: 'Payroll processed successfully', onSuccess: () => { void hideOffcanvas('create-toggle-right'); window.setTimeout(() => (navigate(`/payroll/payroll-approvals-new?month=${ym}`)), 800); } },
  );

  return (
    <>

    <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
                <div className="flex flex-col gap-1">
                    <button onClick={() => history.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit group">
                        <I.I145b1c />
                        <span className="font-semibold text-lg">Payroll Summary</span>
                    </button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1">
                        <span>Payroll</span>
                        <I.I8b8a74 />
                        <span className="text-foreground font-medium">Payroll Summary</span>
                    </div>
                </div>
                <div className="dashboard_current_day_txt payroll-summary-date">
                    <div className="row">
                        <div className="col-6">
                            <h2 className="proxima_nova_semibold section_title selected_date">{MONTHS[month - 1]} {year}</h2>
                        </div>
                        <div className="col-6 text-end">
                            <MonthPicker id="datepicker" className="attendance_status_month proxima_nova_semibold" value={ym} onChange={pick} />
                        </div>
                    </div>
                    
                </div>
                <div className="row" style={{ gap: "20px" }}>
                    <div className="col-lg-4">
                        <div className="card">
                            <div className="row">
                                <div className="col-7">
                                    <p className="payroll-summary proxima_nova_semibold">Pending</p>
                                    <h2 className="proxima_nova_semibold pending_number">{pending_number}</h2>
                                </div>
                                <div className="col-5">
                                    <img src={("/assets/admin/images/payroll/pending.png") + " "} width="100%" />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-lg-4">
                        <div className="card">
                            <div className="row">
                                <div className="col-7">
                                    <p className="payroll-summary proxima_nova_semibold">Processed</p>
                                    <h2 className="proxima_nova_semibold processed_number">{processed_number}</h2>
                                </div>
                                <div className="col-5">
                                    <img src={("/assets/admin/images/payroll/processed.png") + " "} width="100%" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="row pt-4">
                    <div className="col-lg-6 mb-4">
                        <div className="third-section-box">
                            <div className="atten-status-boxs">
                                <h2 className="section_title proxima_nova_semibold" id="month_count">Manual Process Payroll</h2>
                                <p className="section_sub_title proxima_nova_semibold new-view-summary">Process all payroll manually</p>
                                <a href={`/payroll/payroll-approvals-new?month=${ym}`}>
                                    <p className="view-summary proxima_nova_semibold flex">View Now
                                        <img src={"/assets/admin/images/payroll/new-view.svg"} alt="" />
                                    </p>
                                </a>
                            </div>
                            <div>
                                <img src={"/assets/admin/images/payroll/manual-process-payroll.svg"} alt="" />
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="third-section-box">
                            <div className="atten-status-boxs">
                                <h2 className="section_title proxima_nova_semibold" id="month_count">Bulk in Process Payroll</h2>
                                <p className="section_sub_title proxima_nova_semibold new-view-summary">Process all payroll at once</p>
                                <a href="#" data-bs-toggle="offcanvas" data-bs-target="#create-toggle-right" aria-controls="create-toggle-right">
                                    <p className="view-summary proxima_nova_semibold flex">View Now
                                        <img src={"/assets/admin/images/payroll/new-view.svg"} alt="" />
                                    </p>
                                </a>
                            </div>
                            <div>
                                <img src={"/assets/admin/images/payroll/bulk-in-process-payroll.svg"} alt="" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="offcanvas offcanvas-end daily-work-data-download" tabIndex={-1} id="create-toggle-right" data-bs-scroll="true" aria-labelledby="offcanvasRightLabel" style={{ width: "361px" }}>
                    <div className="text-end">
                        <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close">
                            <I.I9dae93 />
                        </div>
                    </div>
                    <div className="offcanvas-body overflow-auto">
                        <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main">Bulk Approval</h5>
                        <hr />
                        <div className="">
                            <form id="processed_form" onSubmit={(e) => e.preventDefault()}>
                                
                                <div className="daily-work-select create_department_inner_form" style={{ minHeight: "calc(100vh - 315px)" }}>
                                    <div className="daily-work-select">
                                        <h5 className="filter-shiftcheck section_title proxima_nova_semibold" style={{ fontSize: "14px" }}>Bulk Approval</h5>
                                        <div className="row">
                                            <div className="col-5">
                                                <p className="proxima_nova_semibold payroll-bulk-approval">Punches</p>
                                            </div>
                                            <div className="col-7 flex">
                                                <div className="form-check form-check-inline">
                                                    <input className="form-check-input" type="checkbox" name="punches" id="punches1" checked={bulk.punches.approve} onChange={() => choose('punches', 'approve')} />
                                                    <label className="form-check-label payroll-bulk-approval-lable" htmlFor="punches1">Approve</label>
                                                </div>
                                                <div className="form-check form-check-inline">
                                                    <input className="form-check-input" type="checkbox" name="punches" id="punches2" checked={bulk.punches.reject} onChange={() => choose('punches', 'reject')} />
                                                    <label className="form-check-label payroll-bulk-approval-lable" htmlFor="punches2">Reject</label>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="row">
                                            <div className="col-5">
                                                <p className="proxima_nova_semibold payroll-bulk-approval">Leave application</p>
                                            </div>
                                            <div className="col-7 flex">
                                                <div className="form-check form-check-inline">
                                                    <input className="form-check-input" type="checkbox" name="leave" id="leave1" checked={bulk.leave.approve} onChange={() => choose('leave', 'approve')} />
                                                    <label className="form-check-label payroll-bulk-approval-lable" htmlFor="leave1">Approve</label>
                                                </div>
                                                <div className="form-check form-check-inline">
                                                    <input className="form-check-input" type="checkbox" name="leave" id="leave2" checked={bulk.leave.reject} onChange={() => choose('leave', 'reject')} />
                                                    <label className="form-check-label payroll-bulk-approval-lable" htmlFor="leave2">Reject</label>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="row">
                                            <div className="col-5">
                                                <p className="proxima_nova_semibold payroll-bulk-approval">Attendance Review</p>
                                            </div>
                                            <div className="col-7 flex">
                                                <div className="form-check form-check-inline">
                                                    <input className="form-check-input" type="checkbox" name="attendance" id="attendance1" checked={bulk.attendance.approve} onChange={() => choose('attendance', 'approve')} />
                                                    <label className="form-check-label payroll-bulk-approval-lable" htmlFor="attendance1">Approve</label>
                                                </div>
                                                <div className="form-check form-check-inline">
                                                    <input className="form-check-input" type="checkbox" name="attendance" id="attendance2" checked={bulk.attendance.reject} onChange={() => choose('attendance', 'reject')} />
                                                    <label className="form-check-label payroll-bulk-approval-lable" htmlFor="attendance2">Reject</label>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="row">
                                            <div className="col-5">
                                                <p className="proxima_nova_semibold payroll-bulk-approval">Total Pay Review</p>
                                            </div>
                                            <div className="col-7 flex">
                                                <div className="form-check form-check-inline">
                                                    <input className="form-check-input" type="checkbox" name="total" id="total1" checked={bulk.total.approve} onChange={() => choose('total', 'approve')} />
                                                    <label className="form-check-label payroll-bulk-approval-lable" htmlFor="total1">Approve</label>
                                                </div>
                                                <div className="form-check form-check-inline">
                                                    <input className="form-check-input" type="checkbox" name="total" id="total2" checked={bulk.total.reject} onChange={() => choose('total', 'reject')} />
                                                    <label className="form-check-label payroll-bulk-approval-lable" htmlFor="total2">Reject</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="download-cancel-btns-main">
                                    <div className="download-cancel-btn mb-0">
                                        <button type="button" id="processed_btn" onClick={() => run.mutate()} disabled={run.isPending} className="download-btn proxima_nova_semibold w-100">Processed
                                            <img className="loader" src={"/assets/admin/images/white_loader.gif"} alt="" />
                                        </button>
                                        <button type="button" name="" className="download-btn proxima_nova_semibold cancel-staff-btn clear_filter" data-bs-dismiss="offcanvas" aria-label="Close" style={{ width: "100%" }}>Cancel</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    </>
  );
}
