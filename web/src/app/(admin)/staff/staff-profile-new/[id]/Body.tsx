'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import * as I from '@/components/icons';
import { adminApi } from '@/lib/api';
import { toggleOnReclick } from '@/lib/datepickerToggle';
import { useAdminSession } from '@/lib/auth';
import { useAdmin } from '@/lib/query';
import { toast } from '@/lib/toast';
import { alertSwal } from '@/lib/swal';
import { fmtDuration, fmtHm } from '@/lib/format';
import { clearErrors } from '@/lib/formkit';
import svgStrings from '@/lib/svgStrings.json';
import { DataTable } from '@/components/widgets/DataTable';
import { navigate } from '@/lib/navigate';

interface StaffDetail {
  id: number;
  name: string;
  last_name: string | null;
  phone_number: string;
  salary_amount: number | null;
  is_deactivate: number;
  photo: string | null;
  department: { name: string } | null;
  shift: { name: string } | null;
}
interface Day {
  date: string;
  status: string;
  note: string | null;
  total_seconds: number;
  overtime_seconds: number;
  shortfall_seconds: number;
  punches: unknown[];
}
interface Range {
  count: { present_count: number; absent_count: number; halfday_count: number; leave: number };
  days: Day[];
}
interface DayInfo {
  staff: { id: number; name: string };
  summary: { note: string | null };
  logs: { id: number; detail: string; by: string | null; created_at: string }[];
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const label = (d: Date) => `${pad(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()}`;
const fromLabel = (s: string) => {
  const [dd, mm, yy] = s.split(' ');
  return new Date(Number(yy), MON.indexOf(mm), Number(dd));
};
/** weekdays between two dates, like Carbon::diffInDaysFiltered(isWeekday) used by Laravel */
const weekdays = (a: Date, b: Date) => {
  let n = 0;
  for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) if (d.getDay() % 6 !== 0) n++;
  return n;
};
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const ucwords = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// the controller's inline SVGs: grey "add note", blue "note added" and the info "log" icon
const NOTE_BLUE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M12.7093 8.33625C13.1573 7.88825 13.884 7.88758 14.332 8.33625V8.33625C14.78 8.78425 14.78 9.51092 14.3313 9.95892L10.482 13.8049C10.3573 13.9296 10.188 13.9996 10.0113 13.9996H8.66797V12.6563C8.66797 12.4796 8.73797 12.3103 8.8633 12.1849L12.7093 8.33625V8.33625Z" stroke="#2F8CFF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"></path><path fillRule="evenodd" clipRule="evenodd" d="M4.01953 5.99961C4.01953 5.64062 4.31055 5.34961 4.66953 5.34961H10.0029C10.3618 5.34961 10.6529 5.64062 10.6529 5.99961C10.6529 6.35859 10.3618 6.64961 10.0029 6.64961H4.66953C4.31055 6.64961 4.01953 6.35859 4.01953 5.99961Z" fill="#2F8CFF"></path><path fillRule="evenodd" clipRule="evenodd" d="M4.01953 8.66562C4.01953 8.30664 4.31055 8.01562 4.66953 8.01562H8.00286C8.36185 8.01562 8.65286 8.30664 8.65286 8.66562C8.65286 9.02461 8.36185 9.31562 8.00286 9.31562H4.66953C4.31055 9.31562 4.01953 9.02461 4.01953 8.66562Z" fill="#2F8CFF"></path><path fillRule="evenodd" clipRule="evenodd" d="M4.01953 11.3336C4.01953 10.9746 4.31055 10.6836 4.66953 10.6836H6.66953C7.02852 10.6836 7.31953 10.9746 7.31953 11.3336C7.31953 11.6926 7.02852 11.9836 6.66953 11.9836H4.66953C4.31055 11.9836 4.01953 11.6926 4.01953 11.3336Z" fill="#2F8CFF"></path><path fillRule="evenodd" clipRule="evenodd" d="M11.3935 8.72651C11.6473 8.47267 12.0589 8.47267 12.3127 8.72651L13.9394 10.3532C14.1933 10.607 14.1933 11.0186 13.9394 11.2724C13.6856 11.5263 13.274 11.5263 13.0202 11.2724L11.3935 9.64575C11.1397 9.39191 11.1397 8.98035 11.3935 8.72651Z" fill="#2F8CFF"></path><path fillRule="evenodd" clipRule="evenodd" d="M1.35156 3.99896C1.35156 2.90331 2.23924 2.01562 3.3349 2.01562H11.3349C12.4305 2.01562 13.3182 2.90331 13.3182 3.99896V5.99896C13.3182 6.35794 13.0272 6.64896 12.6682 6.64896C12.3092 6.64896 12.0182 6.35794 12.0182 5.99896V3.99896C12.0182 3.62128 11.7126 3.31562 11.3349 3.31562H3.3349C2.95721 3.31562 2.65156 3.62128 2.65156 3.99896V12.6656C2.65156 13.0433 2.95721 13.349 3.3349 13.349H6.00156C6.36055 13.349 6.65156 13.64 6.65156 13.999C6.65156 14.3579 6.36055 14.649 6.00156 14.649H3.3349C2.23924 14.649 1.35156 13.7613 1.35156 12.6656V3.99896Z" fill="#2F8CFF"></path><path fillRule="evenodd" clipRule="evenodd" d="M10.0016 1.34961C10.3605 1.34961 10.6516 1.64062 10.6516 1.99961V3.33294C10.6516 3.69193 10.3605 3.98294 10.0016 3.98294C9.64258 3.98294 9.35156 3.69193 9.35156 3.33294V1.99961C9.35156 1.64062 9.64258 1.34961 10.0016 1.34961Z" fill="#2F8CFF"></path><path fillRule="evenodd" clipRule="evenodd" d="M7.33359 1.34961C7.69258 1.34961 7.98359 1.64062 7.98359 1.99961V3.33294C7.98359 3.69193 7.69258 3.98294 7.33359 3.98294C6.97461 3.98294 6.68359 3.69193 6.68359 3.33294V1.99961C6.68359 1.64062 6.97461 1.34961 7.33359 1.34961Z" fill="#2F8CFF"></path><path fillRule="evenodd" clipRule="evenodd" d="M4.66953 1.34961C5.02852 1.34961 5.31953 1.64062 5.31953 1.99961V3.33294C5.31953 3.69193 5.02852 3.98294 4.66953 3.98294C4.31055 3.98294 4.01953 3.69193 4.01953 3.33294V1.99961C4.01953 1.64062 4.31055 1.34961 4.66953 1.34961Z" fill="#2F8CFF"></path></svg>`;
const NOTE_GREY = (svgStrings as Record<string, string>).eeccb7;
const LOG_ICON = (svgStrings as Record<string, string>)['54b2ed'];

const BADGE: Record<string, string> = {
  Present: '<span class="badge bg-success">Present</span>',
  Absent: '<span class="badge bg-danger">Absent</span>',
  'Half Day': '<span class="badge bg-warning text-dark">Half Day</span>',
  'Paid Leave': '<span class="badge bg-info text-white">Paid Leave</span>',
  Holiday: '<span class="badge bg-primary">Holiday</span>',
  'Not Marked': '<span class="badge bg-secondary">Not Marked</span>',
};
const badge = (s: string) => BADGE[s] ?? `<span class="badge bg-secondary">${esc(s)}</span>`;

const hideOffcanvas = (id: string) => {
  const el = document.getElementById(id);
  const bs = (window as any).bootstrap;
  if (el && bs) bs.Offcanvas.getOrCreateInstance(el).hide();
};

/** Two linked bootstrap-datepicker inputs (`.start_date` / `.end_date`), as in the Laravel script. */
function useRangePicker(start: string, end: string, onChange: (s: string, e: string) => void) {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    let dispose = () => {};
    (async () => {
      const $: any = (await import('jquery')).default;
      (window as any).jQuery = $;
      await import('bootstrap-datepicker');
      const s = $('.start_date');
      const e = $('.end_date');
      const today = new Date();
      const opts = { format: 'dd M yyyy', autoclose: true, todayHighlight: false, endDate: today };
      s.datepicker(opts);
      e.datepicker(opts);
      toggleOnReclick(s);
      toggleOnReclick(e);
      const is = s.datepicker('getDate');
      const ie = e.datepicker('getDate');
      if (is) e.datepicker('setStartDate', is);
      if (ie) s.datepicker('setEndDate', ie);
      const fire = () => cb.current(String(s.val()), String(e.val()));
      s.on('changeDate', (ev: any) => {
        if (ev.date) {
          e.datepicker('setStartDate', ev.date);
          if (e.datepicker('getDate') < ev.date) e.datepicker('setDate', ev.date);
        }
        fire();
      });
      e.on('changeDate', (ev: any) => {
        if (ev.date) {
          s.datepicker('setEndDate', ev.date);
          if (s.datepicker('getDate') > ev.date) s.datepicker('setDate', ev.date);
        }
        fire();
      });
      dispose = () => {
        s.off('changeDate').off('.reclick').datepicker('destroy');
        e.off('changeDate').off('.reclick').datepicker('destroy');
      };
    })();
    return () => dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { start, end };
}

export default function Body() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);
  const { business } = useAdminSession();
  const staffQ = useAdmin<StaffDetail>(`/admin/staff/${id}`);
  const staff = staffQ.data?.data;

  const [range, setRange] = useState(() => {
    const now = new Date();
    return { start: label(new Date(now.getFullYear(), now.getMonth(), 1)), end: label(now) };
  });
  useRangePicker(range.start, range.end, (start, end) => setRange({ start, end }));
  const startD = fromLabel(range.start);
  const endD = fromLabel(range.end);
  const rangeQ = useAdmin<Range>(`/admin/staff/${id}/attendance-range`, { start: iso(startD), end: iso(endD) }, { keepPrevious: true });
  const cal = rangeQ.data?.data;
  const rows = useMemo(() => (cal?.days ?? []).filter((d) => d.punches.length > 0), [cal]);

  // note offcanvas
  const [noteDate, setNoteDate] = useState('');
  const [noteName, setNoteName] = useState('');
  const [noteText, setNoteText] = useState('');
  // log offcanvas
  const [logName, setLogName] = useState('');
  const [logDate, setLogDate] = useState('');
  const [logs, setLogs] = useState<{ id: number; detail: string; by: string | null; created_at: string }[]>([]);
  const [busy, setBusy] = useState<'' | 'deactivate' | 'delete'>('');

  const openNote = async (date: string) => {
    setNoteDate(date);
    setNoteText('');
    try {
      const res = await adminApi.get<DayInfo>(`/admin/staff/${id}/day`, { date });
      setNoteName(res.data.staff.name);
      setNoteText(res.data.summary.note ?? '');
    } catch {
      /* the offcanvas is already open; leave it empty */
    }
  };
  const openLog = async (date: string) => {
    setLogs([]);
    const d = new Date(`${date}T00:00:00`);
    setLogDate(`${pad(d.getDate())} ${MON[d.getMonth()]} | ${DAY[d.getDay()]}`);
    try {
      const res = await adminApi.get<DayInfo>(`/admin/staff/${id}/day`, { date });
      setLogName(res.data.staff.name);
      setLogs(res.data.logs.filter((l) => l.detail !== 'Select'));
    } catch {
      /* ignore */
    }
  };
  const logTime = (isoStr: string) => {
    const d = new Date(isoStr);
    const h = d.getHours() % 12 || 12;
    return `${pad(d.getDate())} ${FULL_MON[d.getMonth()]}, ${pad(h)}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
  };

  const saveNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearErrors(e.currentTarget);
    const ta = e.currentTarget.querySelector('#note_area') as HTMLTextAreaElement;
    if (!ta.value.trim()) {
      ta.insertAdjacentHTML('afterend', '<span class="error error_message proxima_nova_semibold">Please add note.</span>');
      return;
    }
    try {
      const res = await adminApi.post('/admin/attendance/note', { staff_id: id, date: noteDate, note: ta.value.trim() });
      toast.success(String(res.message || 'Add note successfully'));
      hideOffcanvas('create-toggle-right');
      rangeQ.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something is wrong.');
    }
  };

  const deactivate = async () => {
    setBusy('deactivate');
    try {
      const res = await adminApi.post(`/admin/staff/${id}/deactivate`);
      toast.success(String(res.message));
      setTimeout(() => (navigate('/staff-new')), 2000);
    } catch (err) {
      setBusy('');
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };
  const remove = async () => {
    setBusy('delete');
    try {
      const res = await adminApi.del(`/admin/staff/${id}`);
      toast.success(String(res.message));
      setTimeout(() => (navigate('/staff-new')), 2000);
    } catch (err) {
      setBusy('');
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };
  const activate = async () => {
    try {
      const res = await adminApi.post(`/admin/staff/${id}/activate`);
      toast.success(String(res.message));
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      await alertSwal('Seat Limit Reached', err instanceof Error ? err.message : 'Something went wrong', 'warning');
      navigate('/subscriptions');
    }
  };
  const exportExcel = async () => {
    try {
      await adminApi.download(`/admin/staff/${id}/attendance-export`, { start: iso(startD), end: iso(endD) }, 'attendance.xlsx');
      toast.success('Your file is being downloaded.');
    } catch {
      toast.error('Somthing went wrong.');
    }
  };

  const prefix = (business?.name ?? '').slice(0, 3).toUpperCase();
  const hasPhoto = !!staff?.photo;
  const deactivated = staff?.is_deactivate === 1;

  return (
    <>

    <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
                <div className="flex flex-col gap-1">
                    <button onClick={() => history.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit group">
                        <I.I145b1c />
                        <span className="font-semibold text-lg">View Profile</span>
                    </button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1">
                        <span>Staff management</span>
                        <I.I8b8a74 />
                        <span>Staff profile</span>
                        <I.I8b8a74 />
                        <span className="text-foreground font-medium">Attendance</span>
                    </div>
                </div>
                <div className="staff-profile-main">
                    <div className="staff-profile">
                        <div className="staff-left-header profile-staff-content">
                            <div className="staff-avatar-upload">
                                {hasPhoto ? (
                                    <div className="staff-avatar-preview">
                                        <div className="half-image">
                                            <img id="staff-imagePreview" src={staff!.photo!} alt="Image Preview 1" data-bs-toggle="modal" data-bs-target="#profile-img-model" style={{ cursor: 'pointer' }} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="staff-avatar-preview">
                                        <div className="half-image">
                                            <I.I810b38 />
                                        </div>
                                    </div>
                                )}
                                <div data-bs-toggle="modal" data-bs-target="#profile-img-model" style={{ cursor: 'pointer' }}>
                                </div>
                            </div>
                            <div className="staff-main-header">
                                <div className="staff-profile-names">
                                    <h2 className="staff-name proxima_nova_semibold">{ucwords(staff?.name ?? '')}{' '}{staff?.last_name}
                                    </h2>
                                    <p className="staff-user-skill section_sub_title">
                                        {staff?.department?.name}
                                    </p>
                                    <span className="staff-number section_sub_title">{prefix}{staff?.id}</span>
                                </div>
                                <div className="staff-action-btns">
                                    <div className="staff_edit_profile theme_btn_hover_color">
                                        <a href={`/staff/view_profile_new/${id}`} className="staff-edit-btn section_sub_title">Edit Profile</a>
                                    </div>
                                    {!deactivated ? (<>
                                        <button name="" className="reject-btn staff-profile-deactivate-btn proxima_nova_semibold" data-bs-toggle="offcanvas" data-bs-target="#deactivateModal" aria-controls="deactivateModal">Deactivate Staff</button>
                                    </>) : (<>
                                        <button type="button" className="staff-profile-activate-btn proxima_nova_semibold activate_staff_action_btn" data-staff-id={id} onClick={activate}>Activate Staff
                                        </button>
                                        <button name="" className="reject-btn staff-profile-delete-btn proxima_nova_semibold" data-bs-toggle="offcanvas" data-bs-target="#deleteModal" aria-controls="deleteModal">Delete Staff</button>
                                    </>)}
                                </div>
                            </div>
                        </div>
                        <div className="staff-right-header">
                            <div className="staff-profile-details">
                                <div className="staff-profile-num">
                                    <h2 className="section_sub_title"> Mobile Number</h2>
                                    <p className="staff-phone-number">{staff?.phone_number}</p>
                                </div>
                                <div className="staff-profile-num staff-profile-sec">
                                    <h2 className="section_sub_title">Staff Type</h2>
                                    <p>Monthly Regular</p>
                                </div>
                            </div>
                            <div className="staff-profile-details-sec">
                                <div className="staff-profile-num ">
                                    <h2 className="section_sub_title">Salary</h2>
                                    <div className="salary-main-salary">
                                        <p>{new Intl.NumberFormat('en-US').format(Math.round(staff?.salary_amount ?? 0))}/</p><span className="month_salary">Month</span>
                                    </div>
                                </div>
                                <div className="staff-profile-num staff-profile-sec">
                                    <h2 className="section_sub_title">Shift Type</h2>
                                    <div className="salary-main-salary">
                                        <p className="staff-phone-number">{staff?.shift?.name ?? '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="staff-atten-profile-main">
                    <div className="">
                        <ul className="nav nav-tabs" id="myTabs">
                            <li className="nav-item" role="presentation">
                                <a className="nav-link active proxima_nova_semibold" id="attendance-tab" data-bs-toggle="tab" href="#attendance" role="tab" aria-controls="attendance" aria-selected="true">
                                    <I.I4bf645 />Attendance</a>
                            </li>
                        </ul>
                    </div>

                    <div className="tab-content" id="myTabContent">
                        <div className="tab-pane fade show active" id="attendance" role="tabpanel" aria-labelledby="attendance-tab">
                            <div className="row">
                                <div className="approve-datas staff_profile_atten">
                                    <div className="atten-data-profile assign-data-search col-md-4 col-sm-12">
                                        <h4 className="page-title pull-left proxima_nova_semibold">Attendance</h4>
                                    </div>
                                    <div className="approve-right-data col-md-8 col-sm-12">
                                        <div className="approve-data-download dropdown-toggle proxima_nova_bold cursor_pointer report_data_download">
                                            <a id="export_excel" onClick={(e) => { e.preventDefault(); exportExcel(); }}>
                                                <div className="export_report_data">
                                                    <p className="export_data_report section_sub_title">Export</p>
                                                </div>
                                                <div className="report_down_img">
                                                    <img className="" src={'/assets/admin/images/approve_punches/download-report.svg'} alt="" />
                                                </div>
                                            </a>
                                        </div>
                                        <div className="staff_profile_datepicker">
                                            <input type="text" id="attendance_datepicker" className="start_date form-control m-0 attence_datepicker proxima_nova_semibold input-group-addon" defaultValue={range.start} readOnly />
                                            <div className="date_range_to">
                                                to
                                            </div>
                                            <input type="text" id="attendance_datepicker" className="end_date form-control m-0 attence_datepicker proxima_nova_semibold input-group-addon" defaultValue={range.end} readOnly />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="approve-datas atten-datas staff-profile-approve staff_profile_attendance sms_staff">


                            </div>
                        </div>
                    </div>

                    <div className="atten-status-main staff-atten-profile">
                        <div className="atten-status-sub">
                            <div className="atten-third-section-box">
                                <div className="atten-status-boxs">
                                    <h2 className="section_title proxima_nova_semibold" id="month_count">{weekdays(startD, endD)}
                                    </h2>
                                    <p className="section_sub_title proxima_nova_semibold">Days</p>
                                </div>
                                <div>
                                    <img src={'/assets/admin/images/staff_manage/days.svg'} alt="" />
                                </div>
                            </div>
                            <div className="atten-third-section-box">
                                <div className="atten-status-boxs">
                                    <h2 className="section_title proxima_nova_semibold" id="present_count">
                                        {cal?.count.present_count ?? 0}
                                    </h2>
                                    <p className="section_sub_title proxima_nova_semibold">Present</p>
                                </div>
                                <div>
                                    <img src={'/assets/admin/images/staff_manage/Present.svg'} alt="" />
                                </div>
                            </div>
                            <div className="atten-third-section-box">
                                <div className="atten-status-boxs">
                                    <h2 className="section_title proxima_nova_semibold" id="absent_count">{cal?.count.absent_count ?? 0}
                                    </h2>
                                    <p className="section_sub_title proxima_nova_semibold">Absent</p>
                                </div>
                                <div>
                                    <img src={'/assets/admin/images/staff_manage/Absent.svg'} alt="" />
                                </div>
                            </div>
                            <div className="atten-third-section-box">
                                <div className="atten-status-boxs">
                                    <h2 className="section_title proxima_nova_semibold" id="half_day">{cal?.count.halfday_count ?? 0}
                                    </h2>
                                    <p className="section_sub_title proxima_nova_semibold">Half Day</p>
                                </div>
                                <div>
                                    <img src={'/assets/admin/images/staff_manage/Halfday.svg'} alt="" />
                                </div>
                            </div>
                            <div className="atten-third-section-box">
                                <div className="atten-status-boxs">
                                    <h2 className="section_title proxima_nova_semibold" id="paid_leave">{cal?.count.leave ?? 0}
                                    </h2>
                                    <p className="section_sub_title proxima_nova_semibold">Paid Leave</p>
                                </div>
                                <div>
                                    <img src={'/assets/admin/images/staff_manage/leave.svg'} alt="" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="approve_staff_data">
                        <DataTable
                            id="staff_attendance_data"
                            deps={[rows]}
                            head={<tr>
                                <th>Date / Day</th>
                                <th>Staff Time</th>
                                <th>Note</th>
                                <th>Status</th>
                                <th>Overtime</th>
                                <th>Fine</th>
                                <th>Action</th>
                            </tr>}
                            options={() => ({
                                data: rows,
                                searching: false,
                                lengthChange: false,
                                info: false,
                                responsive: true,
                                paging: false,
                                order: [],
                                language: { emptyTable: '<div class="no_data_found"><div class=""><img src="/assets/admin/images/staff_manage/no_data.svg" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, staff profile</div></div>' },
                                columns: [
                                    { data: 'date', render: (d: string) => { const x = new Date(`${d}T00:00:00`); return `${pad(x.getDate())} ${MON[x.getMonth()]} | ${DAY[x.getDay()]}`; } },
                                    { data: 'total_seconds', render: (_d: number, _t: string, r: Day) => (r.status === 'Present' ? fmtDuration(r.total_seconds) : '0h 0m') },
                                    { data: 'note', render: (d: string | null) => esc(d || '-') },
                                    { data: 'status', render: (d: string) => badge(d === 'Pending' ? 'Not Marked' : d) },
                                    { data: 'overtime_seconds', render: (d: number) => fmtHm(d) },
                                    { data: 'shortfall_seconds', render: (d: number) => (d > 0 ? fmtHm(d) : '-') },
                                    {
                                        data: 'date',
                                        orderable: false,
                                        render: (d: string, _t: string, r: Day) =>
                                            `<div class="atten-action-main"> <div data-act="note" data-date="${d}" class="create-data dropdown-toggle proxima_nova_bold" data-bs-toggle="offcanvas" data-bs-target="#create-toggle-right" aria-controls="create-toggle-right"> ${r.note ? NOTE_BLUE : NOTE_GREY} </div><div data-act="log" data-date="${d}" class="create-data dropdown-toggle proxima_nova_bold" data-bs-toggle="offcanvas" data-bs-target="#view-toggle-right" aria-controls="view-toggle-right"> ${LOG_ICON} </div> </div>`,
                                    },
                                ],
                            })}
                            onReady={(_api, box, $) => {
                                const click = function (this: HTMLElement) {
                                    const date = this.getAttribute('data-date')!;
                                    if (this.getAttribute('data-act') === 'note') openNote(date);
                                    else openLog(date);
                                };
                                $(box).on('click', '[data-act]', click);
                                return () => $(box).off('click', '[data-act]', click);
                            }}
                        />
                    </div>
                </div>

                <div className="offcanvas offcanvas-end daily-work-data-download" tabIndex={-1} id="view-toggle-right" data-bs-scroll="true" aria-labelledby="offcanvasRightLabel" style={{ height: '100vh' }}>
                    <div className="offcanvas-header">
                        <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close" style={{ cursor: 'pointer' }}>
                            <I.I9dae93 />
                        </div>
                    </div>
                    <div className="view_log_model_inner">
                        <h5 className="section_title_heading proxima_nova_bold download-work-main-header">View Log</h5>
                        <hr />
                        <div className="view-log-model">
                            <h2 className="proxima_nova_semibold section_title note_name">{logName}</h2>
                            <p className="log_date">{logDate}</p>
                        </div>
                        <div className="view-log-model-main ">
                            {logs.map((l) => (
                                <ul className="view-log-content" key={l.id}>
                                    <li className="view-log-status proxima_nova_semibold section_title status_log_value"> Marked {l.detail}</li>
                                    <p className="status_log_by">By {l.by ?? ''} on {logTime(l.created_at)}</p>
                                </ul>
                            ))}
                        </div>
                    </div>
                    <div className="download-cancel-btns-main">
                        <div className="download-cancel-btn">
                            <button name="" className="download-btn proxima_nova_semibold close_view_log" data-bs-dismiss="offcanvas" aria-label="Close">Close</button>
                        </div>
                    </div>
                </div>
                <div className="offcanvas offcanvas-end daily-work-data-download" tabIndex={-1} id="create-toggle-right" data-bs-scroll="true" aria-labelledby="offcanvasRightLabel" style={{ height: '100vh' }}>
                    <div className="offcanvas-header">
                        <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close" style={{ cursor: 'pointer' }}>
                            <I.I9dae93 />
                        </div>
                    </div>
                    <div className="offcanvas-body overflow-auto">
                        <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main">Add
                            Note</h5>
                        <hr />
                        <div className="filter-sub-sec" style={{ minHeight: '0px', height: '0px' }}>
                            <form id="staff_add_note" method="" onSubmit={saveNote}>
                                <div className="staff_add_form_inner">
                                    <input type="hidden" id="staff_id" name="staff_id" value={id} readOnly />
                                    <input type="hidden" id="attendance_date" name="attendance_date" value={noteDate} readOnly />
                                    <div className="daily-work-select">
                                        <h2 className="filter-shiftcheck section_title proxima_nova_semibold note_name">{noteName}</h2>
                                        <div className="form-check add-note-main">
                                            <textarea placeholder="Leave needs to be added." className="section_sub_title w-100" name="note_area" id="note_area" value={noteText} onChange={(e) => setNoteText(e.target.value)}></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div className="download-cancel-btns-main">
                                    <div className="download-cancel-btn">
                                        <button type="submit" name="" className="download-btn proxima_nova_semibold w-100">Save</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal fade" id="profile-img-model" tabIndex={-1} aria-labelledby="exampleModalLabel" aria-hidden="true">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title profile-title-model section_title_heading proxima_nova_bold" id="exampleModalLabel">{staff?.name} {staff?.last_name}</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <form id="staff_attendance_profile" method="post" encType="multipart/form-data" onSubmit={(e) => e.preventDefault()}>

                            <input type="hidden" id="staff_id" name="staff_id" value={id} readOnly />
                            <div className="modal-body staff-images-show mb-5">
                                <div id="append-preview">
                                    {hasPhoto && (
                                        <div className="addes-img-sub" id="">
                                            <img src={staff!.photo!} alt="" className="added-images" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <div className="offcanvas offcanvas-end daily-work-data-download" tabIndex={-1} id="deactivateModal" data-bs-scroll="true" aria-labelledby="offcanvasRightLabel">
                <div className="offcanvas-header">
                    <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close"><I.I9dae93 />
                    </div>
                </div>
                <div className="offcanvas-body overflow-auto">
                    <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main">
                        Deactivate Staff</h5>
                    <hr />
                    <div className="staff_view_delete_title">
                        <h5>Are you sure to deactivate this staff?</h5>
                    </div>
                    <div className="filter-sub-sec">
                        <div className="download-cancel-btns-main">
                            <div className="download-cancel-btn mb-0">
                                <button type="submit" name="" className="download-btn proxima_nova_semibold w-100 deactivate_staff_btn close_delete_modal" onClick={deactivate} disabled={busy !== ''}>Deactivate
                                    <img className="loader" src={'/assets/admin/images/white_loader.gif'} alt="" />
                                </button>
                                <button type="submit" name="" className="download-btn proxima_nova_semibold w-100 cancel_modal" data-bs-dismiss="offcanvas" aria-label="Close" disabled={busy !== ''}>Cancel
                                    <img className="loader" src={'/assets/admin/images/white_loader.gif'} alt="" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="offcanvas offcanvas-end daily-work-data-download" tabIndex={-1} id="deleteModal" data-bs-scroll="true" aria-labelledby="offcanvasRightLabel">
                <div className="offcanvas-header">
                    <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close"><I.I9dae93 />
                    </div>
                </div>
                <div className="offcanvas-body overflow-auto">
                    <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main">Delete
                        Staff</h5>
                    <hr />
                    <div className="staff_view_delete_title">
                        <h5>Are you sure to delete this staff?</h5>
                    </div>
                    <div className="filter-sub-sec">
                        <div className="download-cancel-btns-main">
                            <div className="download-cancel-btn mb-0">
                                <button type="submit" name="" className="download-btn proxima_nova_semibold w-100 delete_staff_btn close_delete_modal" onClick={remove} disabled={busy !== ''}>Delete
                                    <img className="loader" src={'/assets/admin/images/white_loader.gif'} alt="" />
                                </button>
                                <button type="submit" name="" className="download-btn proxima_nova_semibold w-100 cancel_modal" data-bs-dismiss="offcanvas" aria-label="Close" disabled={busy !== ''}>Cancel
                                    <img className="loader" src={'/assets/admin/images/white_loader.gif'} alt="" />
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
