'use client';

import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import * as I from '@/components/icons';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { esc } from '@/lib/bs';
import { monthStr } from '@/lib/format';
import { toast } from '@/lib/toast';
import { DataTable } from '@/components/widgets/DataTable';

interface PRow { id: number; staff_code: string; name: string; phone_number: string; department: string | null; photo: string | null; attendance_reviewed: boolean; total_pay_reviewed: boolean; processed: boolean; net_salary: number }
interface Approvals { pending_punches: number; pending_leaves: number; overtime_days: number; can_process: boolean }
interface Payrun { id: number; month: number; year: number; created_at: string }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DL = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2F8CFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

export default function Body() {
  const ym = useSearchParams().get('month') ?? (typeof window !== 'undefined' ? window.sessionStorage.getItem('payroll.month') : null) ?? monthStr();
  const month = Number(ym.slice(5));
  const year = Number(ym.slice(0, 4));
  const [step, setStep] = useState(1);
  const ap = useAdmin<Approvals>('/admin/payroll/approvals', { month, year });
  const pay = useAdmin<PRow[]>('/admin/payroll', { month, year });
  const runs = useAdmin<Payrun[]>('/admin/reports/payruns', { month, year });
  const rows = useMemo(() => pay.data?.data ?? [], [pay.data]);
  const approve_punches_pending_count = ap.data?.data.pending_punches ?? 0;
  const approve_leave_pending_count = ap.data?.data.pending_leaves ?? 0;
  const attendance_review_count = rows.filter((r) => !r.attendance_reviewed).length;
  const total_pay_review_count = rows.filter((r) => !r.total_pay_reviewed).length;
  const staff_count = rows.length;
  const [search, setSearch] = useState('');
  const shown = useMemo(() => rows.filter((r) => !r.processed && (!search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase()))), [rows, search]);
  const checked = useRef(new Set<number>());
  const [picked, setPicked] = useState(0);
  const sync = () => setPicked(checked.current.size);

  const process = useAction((ids: number[]) => adminApi.post('/admin/payroll/process', { month, year, staff_ids: ids }), {
    invalidate: ['/admin/payroll', '/admin/reports/payruns'],
    onSuccess: () => { checked.current.clear(); sync(); setStep(4); },
  });
  const next = (from: number) => {
    if (from === 1 && (approve_punches_pending_count || approve_leave_pending_count)) return toast.error('Please approve or reject all pending punches and leaves first');
    if (from === 2 && (attendance_review_count || total_pay_review_count)) return toast.error('Please complete the attendance and total pay reviews first');
    setStep(from + 1);
  };
  const freeze = () => {
    const ids = [...checked.current];
    if (!ids.length) return toast.error('Select at least one staff member');
    process.mutate(ids);
  };
  const download = async () => {
    try {
      await adminApi.download('/admin/payroll/export', { month, year }, 'payroll.xlsx');
      toast.success('Your files is being downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Somthing went wrong.');
    }
  };
  const act = (n: number) => (step === n ? ' active' : '');

  return (
    <>

    <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">

                <div className={`flex flex-col gap-1 page-title-area payroll-approvals payroll-approval${step === 1 ? ' active' : ''}`}>
                    <button onClick={() => history.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit group">
                        <I.I145b1c />
                        <span className="font-semibold text-lg">Payroll Approvals List</span>
                    </button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1">
                        <span>Payroll</span>
                        <I.I8b8a74 />
                        <span>Approvals</span>
                        <I.I8b8a74 />
                        <span className="text-foreground font-medium">list</span>
                    </div>
                </div>

                <div className={`flex flex-col gap-1 page-title-area payroll-approvals approval-back${act(2)}`}>
                    <button onClick={() => setStep(1)} className="approval-back-btn flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit group">
                        <I.I145b1c />
                        <span className="font-semibold text-lg">Payroll Approvals List</span>
                    </button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1">
                        <span>Payroll</span>
                        <I.I8b8a74 />
                        <span>Approvals</span>
                        <I.I8b8a74 />
                        <span className="text-foreground font-medium">list</span>
                    </div>
                </div>

                <div className={`flex flex-col gap-1 page-title-area payroll-approvals reviews${act(3)}`}>
                    <button onClick={() => setStep(2)} className="review-back-btn flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit group">
                        <I.I145b1c />
                        <span className="font-semibold text-lg">Reviews</span>
                    </button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1">
                        <span>Payroll</span>
                        <I.I8b8a74 />
                        <span>Process Payroll</span>
                        <I.I8b8a74 />
                        <span className="text-foreground font-medium">Reviews</span>
                    </div>
                </div>

                <div className={`flex flex-col gap-1 page-title-area payroll-approvals download-reports${act(4)}`}>
                    <button onClick={() => setStep(3)} className="download-back-btn flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit group">
                        <I.I145b1c />
                        <span className="font-semibold text-lg">Download Reports</span>
                    </button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1">
                        <span>Payroll</span>
                        <I.I8b8a74 />
                        <span>Process Payroll</span>
                        <I.I8b8a74 />
                        <span className="text-foreground font-medium">Download Reports</span>
                    </div>
                </div>

                <div className="payroll-approval-main">
                    <div className="approval-form-muti-step">
                        <div className="staff-view-profile" style={{ cursor: "pointer" }} id="approval_info_form_data" onClick={() => setStep(1)}>
                            <p id="step1" className={`staff-personal-info${step >= 1 ? ' staff_info_active' : ''} proxima_nova_semibold staff-info-first`}>
                            <span className="info-step step1-number step-1 info_active">1</span>
                                <I.I36f121 />
                            Approval</p>
                        </div>
                        <div className="staff-view-profile" style={{ cursor: "pointer" }} id="review_details_form_data" onClick={() => setStep(2)}>
                            <p id="step2" className={`staff-personal-info${step >= 2 ? ' staff_info_active' : ''} proxima_nova_semibold review-details-form-data`}>
                            <span className={`info-step info-step1 step2-number step-2${step >= 2 ? ' info_active' : ''}`}>2</span>
                            <I.I0e365c />
                            Review Details</p>
                        </div>
                        <div className="staff-view-profile" style={{ cursor: "pointer" }} id="process_payroll_form_data" onClick={() => setStep(3)}>
                            <p id="step3" className={`staff-personal-info${step >= 3 ? ' staff_info_active' : ''} proxima_nova_semibold review-details-form-data`}>
                            <span className={`info-step info-step1 step3-number step-3${step >= 3 ? ' info_active' : ''}`}>3</span>
                            <I.Ib3a551 />
                            Process Payroll</p>
                        </div>
                        <div className="staff-view-profile" style={{ cursor: "pointer" }} id="download_reports_form_data" onClick={() => setStep(4)}>
                            <p id="step4" className={`staff-personal-info${step >= 4 ? ' staff_info_active' : ''} proxima_nova_semibold download-reports-form-data`}>
                            <span className={`info-step info-step1 step4-number step-4${step >= 4 ? ' info_active' : ''}`}>4</span>
                            <I.I77d6bf />
                            Download Reports</p>
                        </div>
                    </div>
                </div>
                <div className={`profile-step step1${act(1)}`} id="profile-step">
                    <div className="inner-payroll-details" id="inner-payroll-details">
                        <div className="payroll-approval-details">
                            <div className="payroll-inner">
                                <div>
                                    <I.If664a3 />
                                </div>
                                <div>
                                    <p>Please ensure all lens devices are synced and have an active internet connection.</p>
                                </div>
                            </div>
                            <div className="payroll-inner">
                                <div>
                                    <I.If664a3 />
                                </div>
                                <div>
                                    <p>To Prevent loss of punch-in\out records and ensure accurate payroll, we recommend a one-day buffer at the end of each cycle in case of shifts span over two calendar dates. <a href="#" className="learn-more-btn">Learn More</a></p>
                                </div>
                            </div>
                            <div className="payroll-inner">
                                <div>
                                    <I.If664a3 />
                                </div>
                                <div>
                                    <p>If any attendance is not marked, it will be considered absent even when the “ Mark Attendance on Old Days” setting is enabled.</p>
                                </div>
                            </div>
                        </div>
                        <div className="approve-payroll-data">
                            <table id="approve_datas" width="100%">
                                <thead>
                                    <tr>
                                        <th style={{ width: "10px" }}></th>
                                        <th>Title</th>
                                        <th>Info</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="payroll-datas">
                                        <td>
                                            <I.I5c16db />
                                        </td>
                                        <td>
                                            Approve Punches
                                        </td>
                                        <td>
                                            {(approve_punches_pending_count == 0) ? (<>
                                                No Pending Approval
                                            </>) : (<>
                                                {(approve_punches_pending_count)} Pending Approval
                                            </>)}
                                        </td>
                                        <td>
                                            {(approve_punches_pending_count == 0) ? (<>
                                                Approved
                                            </>) : (<>
                                                Pending
                                            </>)}
                                        </td>
                                        <td>
                                            <a href={"/payroll/payroll-approval-punches"}>
            
                                                <button type="button" style={{ border: "none", background: "none", padding: "0", margin: "0" }}>
                                                    <I.Ib11906 />
                                                </button>
                                            </a>
                                        </td>
                                    </tr>
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
                                    <tr className="payroll-datas">
                                        <td>
                                            <I.I44aabb />
                                        </td>
                                        <td>
                                            Approve Leaves
                                        </td>
                                        <td>
                                            {(approve_leave_pending_count == 0) ? (<>
                                                No Pending Approval
                                            </>) : (<>
                                                {(approve_leave_pending_count)} Pending Approval
                                            </>)}
                                        </td>
                                        <td>
                                            {(approve_leave_pending_count == 0) ? (<>
                                                Approved
                                            </>) : (<>
                                                Pending
                                            </>)}
                                        </td>
                                        <td>
                                            <a href={"/payroll/payroll-approve-leaves-new"}>
            
                                                <I.Ib11906 />
                                            </a>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>





                    <div className="flex justify-end">
                        <button type="button" id="approve_btn" onClick={() => next(1)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95">
                            Review Attendance
                            <img className="loader" src={"/assets/admin/images/white_loader.gif"} alt="" />
                        </button>
                    </div>
                </div>

                <div className={`profile-step step2${act(2)}`} id="profile-step">
                    <div className="inner-payroll-details" id="inner-payroll-details">
                        <div className="payroll-approval-details">
                            <div className="payroll-inner">
                                <div>
                                    <I.If664a3 />
                                </div>
                                <div>
                                    <p>Please ensure all lens devices are synced and have an active internet connection.</p>
                                </div>
                            </div>
                            <div className="payroll-inner">
                                <div>
                                    <I.If664a3 />
                                </div>
                                <div>
                                    <p>To Prevent loss of punch-in\out records and ensure accurate payroll, we recommend a one-day buffer at the end of each cycle in case of shifts span over two calendar dates. <a href="#" className="learn-more-btn">Learn More</a></p>
                                </div>
                            </div>
                            <div className="payroll-inner">
                                <div>
                                    <I.If664a3 />
                                </div>
                                <div>
                                <p>If any attendance is not marked, it will be considered absent even when the “ Mark Attendance on Old Days” setting is enabled.</p>
                                </div>
                            </div>
                        </div>
                        <div className="approve-payroll-data">
                            <table id="approve_datas" width="100%">
                                <thead>
                                    <tr>
                                        <th style={{ width: "10px" }}></th>
                                        <th>Title</th>
                                        <th>Info</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="payroll-datas">
                                        <td>
                                            <I.Id71f74 />
                                        </td>
                                        <td>
                                        Attendance Review
                                        </td>
                                        <td>
                                            {(attendance_review_count == 0) ? (<>
                                                No Pending Approval
                                            </>) : (<>
                                                {(attendance_review_count)} Pending To Review
                                            </>)}
                                        </td>
                                        <td>
                                            {(attendance_review_count == 0) ? (<>
                                                Approved
                                            </>) : (<>
                                                In Progress
                                            </>)}
                                        </td>
                                        <td>
                                            <a href={"/payroll/payroll-review-details"}>
                                                <button type="button" style={{ border: "none", background: "none", padding: "0", margin: "0" }}>
                                                    <I.I4187d3 />
                                                </button>
                                            </a>
                                        </td>
                                    </tr>
                                    <tr className="payroll-datas">
                                        <td>
                                            <I.I7b3307 />
                                        </td>
                                        <td>
                                            Total Pay Review
                                        </td>
                                        <td>
                                            {(total_pay_review_count == 0) ? (<>
                                                No Pending Approval
                                            </>) : (<>
                                                {(total_pay_review_count)} Pending To Review
                                            </>)}
                                        </td>
                                        <td>
                                            {(total_pay_review_count == 0) ? (<>
                                                Approved
                                            </>) : (<>
                                                In Progress
                                            </>)}
                                        </td>
                                        <td>
                                            <a href={"/payroll/payroll-total-pay"}>
                                                <I.I4187d3 />
                                            </a>
                                        </td>
                                    </tr>

                                </tbody>
                            </table>
                        </div>
                    </div>





                    <div className="flex justify-end">
                        <button type="button" id="review_btn" onClick={() => next(2)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95">
                            Process Payroll
                            <img className="loader" src={"/assets/admin/images/white_loader.gif"} alt="" />
                        </button>
                    </div>
                </div>

                <div className={`profile-step step3${act(3)}`} id="profile-step">
                    <div className="payroll-approval-review">
                        <p className="proxima_nova_semibold holiday-staff-list-day mb-2">Payroll Review
                            <span className="holiday-policy-count proxima_nova_bold">({(staff_count)} Employees)</span>
                        </p>
                        <div>
                            <div className="row">
                                <div className="col-6 ">
                                    <div className="main-payroll-sec">
                                       
                                        <form action="" method="">
                                            <input className="input-search-rounded" type="text" id="staff_data_find" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                                        </form>
                                    </div>
                                </div>
                                <div className="col-6 relative">
                                    <div className="text-end icon-with-svg" style={{ right: "10px", position: "absolute" }}>
                                        <I.I28c900 />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="approve-main-content">
                            <div className="approve-payroll-data" style={{ marginTop: "0px" }}>
                                <DataTable
                                    id="staff_datas"
                                    className="process-payroll-datas display dataTable no-footer dtr-inline"
                                    deps={[shown]}
                                    head={<tr><th className="data_list_check"><input type="checkbox" id="selectAllCheckboxProcess" /></th><th>Name</th><th>Staff Id</th><th>Mobile Number</th><th>Net Pay</th></tr>}
                                    options={() => ({
                                        data: shown,
                                        searching: false,
                                        lengthChange: false,
                                        info: false,
                                        responsive: true,
                                        order: [],
                                        columnDefs: [{ width: '10px', targets: 0, orderable: false }],
                                        columns: [
                                            { data: 'id', orderable: false, render: (_d: number, _t: string, r: PRow) => `<input type="checkbox" class="selectCheckbox_process_model" value="${r.id}" ${checked.current.has(r.id) ? 'checked' : ''}>` },
                                            { data: 'name', render: (d: string, _t: string, r: PRow) => `<a href="/staff/staff-profile-new/${r.id}" class="staff-edit"><div class="user-images"><div><img src="${esc(r.photo ?? '/assets/admin/images/dummy/dummy-user.svg')}" class="approve-user-img" alt=""></div><div>${esc(d)}<p class="data-sub-field">${r.department ? esc(r.department) : "<span style='color: red!important;'>No Department Assigned</span>"}</p></div></div></a>` },
                                            { data: 'staff_code' },
                                            { data: 'phone_number' },
                                            { data: 'net_salary', render: (d: number) => String(d) },
                                        ],
                                    })}
                                    onReady={(_api, box, $) => {
                                        const onRow = function (this: HTMLInputElement) {
                                            if (this.checked) checked.current.add(Number(this.value));
                                            else checked.current.delete(Number(this.value));
                                            sync();
                                        };
                                        const onAll = function (this: HTMLInputElement) {
                                            $(box).find('.selectCheckbox_process_model').each((_i: number, el: HTMLInputElement) => {
                                                el.checked = this.checked;
                                                if (this.checked) checked.current.add(Number(el.value));
                                                else checked.current.delete(Number(el.value));
                                            });
                                            sync();
                                        };
                                        $(box).on('change', '.selectCheckbox_process_model', onRow).on('change', '#selectAllCheckboxProcess', onAll).on('click', '#selectAllCheckboxProcess', (e: Event) => e.stopPropagation());
                                        return () => $(box).off('change', '.selectCheckbox_process_model', onRow).off('change', '#selectAllCheckboxProcess', onAll);
                                    }}
                                />
                            </div>
                        </div>
                    </div>





                    <div className="flex justify-end payroll-process-btn">
                        <button type="button" id="process_btn" onClick={freeze} disabled={process.isPending} className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95">
                            Freeze Payroll
                            <img className="loader" src={"/assets/admin/images/white_loader.gif"} alt="" />
                        </button>
                    </div>
                </div>

                <div className={`profile-step step4${act(4)}`} id="profile-step">
                    <div className="payroll-approval-review">
                        <p className="proxima_nova_semibold holiday-staff-list-day">Payroll Reports
                            <span className="holiday-policy-count proxima_nova_bold">(<span className="holiday-policy-count proxima_nova_bold" id="staff_count">{runs.data?.data.length ?? 0}</span> Staff)</span>
                        </p>
                        <div className="approve-payroll-data">
                            <DataTable
                                id="staff_datas"
                                className="download-payroll-datas display dataTable no-footer dtr-inline"
                                deps={[runs.data]}
                                head={<tr><th>Staff Payment Type</th><th>Report Cycle</th><th>Report Type</th><th>Generated On</th><th>Action</th></tr>}
                                options={() => ({
                                    data: runs.data?.data ?? [],
                                    searching: false,
                                    lengthChange: false,
                                    info: false,
                                    responsive: true,
                                    order: [],
                                    columns: [
                                        { data: null, render: () => 'Non Weekly Staff' },
                                        { data: null, render: (_d: unknown, _t: string, r: Payrun) => `${MON[r.month - 1]}, ${r.year}` },
                                        { data: null, render: () => 'Half Page' },
                                        { data: 'created_at', render: (d: string) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(' at', ' |') },
                                        { data: null, orderable: false, render: () => `<div data-dl style="cursor:pointer">${DL}</div>` },
                                    ],
                                })}
                                onReady={(_api, box, $) => {
                                    const h = () => void download();
                                    $(box).on('click', '[data-dl]', h);
                                    return () => $(box).off('click', '[data-dl]', h);
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="offcanvas offcanvas-end daily-work-data-download" tabIndex={-1} id="payroll-toggle-model" data-bs-scroll="true" aria-labelledby="offcanvasRightLabel">
                    <div className="offcanvas-header">
                        <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close"><I.Idf05ba />
                        </div>
                    </div>
                    <div className="offcanvas-body overflow-auto">
                        <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main">Add Or Remove
                            Columns
                        </h5>
                        <p>
                            <I.I314404 />
                        </p>
                        <hr />
                        <div className="add-remove-colum">
                            <div className="inner-div">
                                <input type="checkbox" id="serial_no" name="serial_no" defaultValue="serial_no" />
                                <label className="checkbox-label" htmlFor="serial_no">Serial No</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="staff_name" name="staff_name" defaultValue="staff_name" />
                                <label className="checkbox-label" htmlFor="staff_name">Staff Name</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="staff_phone" name="staff_phone" defaultValue="staff_phone" />
                                <label className="checkbox-label" htmlFor="staff_phone">Staff Phone</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="date_of_joining" name="date_of_joining" defaultValue="date_of_joining" />
                                <label className="checkbox-label" htmlFor="date_of_joining">Date Of Joining</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="gender" name="gender" defaultValue="gender" />
                                <label className="checkbox-label" htmlFor="gender">Gender</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="staff_id" name="staff_id" defaultValue="staff_id" />
                                <label className="checkbox-label" htmlFor="staff_id">Staff Id</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="date_of_birth" name="date_of_birth" defaultValue="date_of_birth" />
                                <label className="checkbox-label" htmlFor="date_of_birth">Date Of Birth</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="designation" name="designation" defaultValue="designation" />
                                <label className="checkbox-label" htmlFor="designation">Designation</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="department" name="department" defaultValue="department" />
                                <label className="checkbox-label" htmlFor="department">Department</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="uan_Number" name="uan_Number" defaultValue="uan_Number" />
                                <label className="checkbox-label" htmlFor="uan_Number">Uan Number</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="esi_number" name="esi_number" defaultValue="esi_number" />
                                <label className="checkbox-label" htmlFor="esi_number">Esi Number</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="address_line_1" name="address_line_1" defaultValue="address_line_1" />
                                <label className="checkbox-label" htmlFor="address_line_1">Address Line 1</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="address_line_2" name="address_line_2" defaultValue="address_line_2" />
                                <label className="checkbox-label" htmlFor="address_line_2">Address Line 2</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="address_city" name="address_city" defaultValue="address_city" />
                                <label className="checkbox-label" htmlFor="address_city">Address City</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="address_state" name="address_state" defaultValue="address_state" />
                                <label className="checkbox-label" htmlFor="address_state">Address State</label>
                            </div>
                            <div className="inner-div">
                                <input type="checkbox" id="address_Pincode" name="address_Pincode" defaultValue="address_Pincode" />
                                <label className="checkbox-label" htmlFor="address_Pincode">Address Pincode</label>
                            </div>
                        </div>
                        <button type="submit" name="" id="add_apply_btn" className="download-btn apply-details-list w-100">Apply
                            <img className="loader" src={"/assets/admin/images/white_loader.gif"} alt="" />
                        </button>
                    
                    </div>
                </div>

                <div id="myModal" className="modal check-model check-modal-attendance-view">
                    <div className="model-section">
                        <div className="model_left_side">
                            <div className="selected_check_member proxima_nova_semibold">
                                1
                            </div>
                        </div>
                        <div className="model_right_side">
                            <div className="member_div proxima_nova_semibold">Members Selected</div>
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
                            <div className="cancel_div cancel_process_selected_id" id="closeModal">
                                <I.Iac7dd2 />
                                <p>Cancel</p>
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
