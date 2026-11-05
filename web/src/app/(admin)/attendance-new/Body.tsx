'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import * as I from '@/components/icons';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { ATT_ICONS } from '@/lib/attIcons';
import { esc, showOffcanvas } from '@/lib/bs';
import { fmtClock, fmtHm, todayStr } from '@/lib/format';
import { CustomDropdown } from '@/components/widgets/CustomDropdown';
import { DataTable } from '@/components/widgets/DataTable';
import { DatePicker } from '@/components/widgets/DatePicker';

const StaffMap = dynamic(() => import('@/components/widgets/StaffMap'), { ssr: false });

interface Punch { in_time: string | null; out_time: string | null }
interface Row {
  id: number; full_name: string; photo: string | null; department: { name: string } | null; is_remote: number; status: string; first_in: string | null; last_out: string | null;
  break_seconds: number; total_seconds: number; overtime_seconds: number; behavior: string | null; note: string | null; punches: Punch[];
}
interface Counts { staff_count: number; present_count: number; absent_count: number; halfday_count: number; leave_count: number }
interface Day { summary: unknown; logs: { id: number; detail: string; by: string | null; created_at: string }[]; staff: { id: number; name: string } }

const BADGE: Record<string, string> = { Present: 'bg-success', Absent: 'bg-danger', 'Half Day': 'bg-warning text-dark', 'Paid Leave': 'bg-info text-white', Holiday: 'bg-primary', 'Not Marked': 'bg-secondary' };
const BEHAVIOR: Record<string, [string, string]> = {
  Late: ['bg-red-500', ''],
  Early: ['bg-orange-500', 'background-color: #fc6510;'],
  Regular: ['bg-green-500', ''],
};
const t12 = (t: string | null) => (t ? `<span class="time-fix" style="text-transform: lowercase;">${fmtClock(t).toLowerCase()}</span>` : '-');
const PER_PAGE = [{ value: 'all', label: 'All' }, { value: '10perpage', label: '10 Per Page' }, { value: '50perpage', label: '50 Per Page' }, { value: '100perpage', label: '100 Per Page' }];
const STATUS = [{ value: 'all', label: 'All' }, { value: 'Present', label: 'Present' }, { value: 'Absent', label: 'Absent' }, { value: 'Half Day', label: 'Half Day' }];

export default function Body() {
  const [date, setDate] = useState(todayStr());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [perPage, setPerPage] = useState('10perpage');
  const q = useAdmin<Row[]>('/admin/attendance', { date, status: status === 'all' ? undefined : status }, { keepPrevious: true });
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (q.data?.data ?? []).filter((r) => !term || r.full_name.toLowerCase().includes(term));
  }, [q.data, search]);
  const c = ((q.data as unknown as { count?: Counts })?.count ?? { staff_count: 0, present_count: 0, absent_count: 0, halfday_count: 0, leave_count: 0 }) as Counts;
  const pageLen = perPage === 'all' ? -1 : parseInt(perPage);
  // The table is drawn before /admin/attendance first answers; until it has, show that instead of the empty-table text.
  const tableStatus = q.isPending ? 'Loading...' : q.isError && !q.data ? esc(q.error.message) : null;

  const [sel, setSel] = useState<Row | null>(null);
  const [note, setNote] = useState('');
  const [dayInfo, setDayInfo] = useState<Day | null>(null);
  const [loc, setLoc] = useState<{ latitude: number; longitude: number; label: string }[]>([]);
  const addNote = useAction(() => adminApi.post('/admin/attendance/note', { staff_id: sel!.id, date, note }), { invalidate: ['/admin/attendance'], success: 'Note added successfully' });

  const openNote = (r: Row) => {
    setSel(r);
    setNote(r.note ?? '');
    void showOffcanvas('create-toggle-right');
  };
  const openLog = async (r: Row) => {
    setSel(r);
    setDayInfo(null);
    void showOffcanvas('view-toggle-right');
    const res = await adminApi.get<Day>(`/admin/staff/${r.id}/day`, { date });
    setDayInfo(res.data);
  };
  const openMap = async (r: Row) => {
    setSel(r);
    setLoc([]);
    void showOffcanvas('map-toggle-right');
    try {
      const res = await adminApi.get<{ latitude: number; longitude: number }[] | { latitude: number; longitude: number }>(`/admin/staff/${r.id}/location`);
      const pts = Array.isArray(res.data) ? res.data : res.data ? [res.data] : [];
      setLoc(pts.map((p) => ({ ...p, label: r.full_name })));
    } catch {
      setLoc([]);
    }
  };
  const statusCls = (l: string) => { const x = l.toLowerCase(); return x.includes('present') ? 'status-present' : x.includes('absent') ? 'status-absent' : x.includes('half') ? 'status-halfday' : x.includes('leave') ? 'status-leave' : 'status-default'; };

  return (
    <>
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6">
            <div className="row align-items-center">
              <div className="col-sm-12 top-header-sub staff-summary-main attendance_main_data">
                <div className="">
                  <div className="breadcrumbs-sub">
                    <div className="attendance-breadcrumbs">
                      <h4 className="page-title pull-left proxima_nova_semibold">Attendance</h4>
                    </div>
                    <div className="approve-right-data col-md-6 col-sm-6 mt-0 mb-0">
                      <div className="input-group date">
                        <DatePicker id="calender_date" className="input-group-addon form-control proxima_nova_semibold calender-picker" format="dd, M yyyy" value={date} onChange={(d) => d && setDate(d)} readOnly={false} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="atten-status-main">
                    <div className="atten-status-sub">
                        <div className="atten-third-section-box">
                            <div className="atten-status-boxs">
                                <h2 className="section_title proxima_nova_semibold" id="staff_count">{c.staff_count}</h2>
                                <p className="section_sub_title proxima_nova_semibold">All Staff</p>
                            </div>
                            <div>
                                <img src={"/assets/admin/images/attendance/Staff.svg"} alt="" />
                            </div>
                        </div>
                        <div className="atten-third-section-box">
                            <div className="atten-status-boxs">
                                <h2 className="section_title proxima_nova_semibold" id="present_count">{c.present_count}</h2>
                                <p className="section_sub_title proxima_nova_semibold">Present</p>
                            </div>
                            <div>
                                <img src={"/assets/admin/images/attendance/Present.svg"} alt="" />
                            </div>
                        </div>
                        <div className="atten-third-section-box">
                            <div className="atten-status-boxs">
                                <h2 className="section_title proxima_nova_semibold" id="absent_count">{c.absent_count}</h2>
                                <p className="section_sub_title proxima_nova_semibold">Absent</p>
                            </div>
                            <div>
                                <img src={"/assets/admin/images/attendance/Absent.svg"} alt="" />
                            </div>
                        </div>
                        <div className="atten-third-section-box">
                            <div className="atten-status-boxs">
                                <h2 className="section_title proxima_nova_semibold" id="half_day">{c.halfday_count}</h2>
                                <p className="section_sub_title proxima_nova_semibold">Half Day</p>
                            </div>
                            <div>
                                <img src={"/assets/admin/images/attendance/Halfday.svg"} alt="" />
                            </div>
                        </div>
                        <div className="atten-third-section-box">
                            <div className="atten-status-boxs">
                                <h2 className="section_title proxima_nova_semibold" id="paid_leave">{c.leave_count}</h2>
                                <p className="section_sub_title proxima_nova_semibold">Paid Leave</p>
                            </div>
                            <div>
                                <img src={"/assets/admin/images/attendance/leave.svg"} alt="" />
                            </div>
                        </div>
                    </div>
                </div>
            <div className="main-content-inner on-time-main main-atten">
              <div className="approve-datas atten-datas row">
                <div className="atten-data-search attendance-search assign-data-search col-md-6 col-sm-6">
                  <input className="input-search-rounded search-input" type="text" id="staff_data_find" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="col-md-6 col-sm-6 staff-right-length">
                  <div className="business_selct_box select_mate_option staff-option_select">
                    <CustomDropdown options={STATUS} value={status} onChange={setStatus} prefix="Sort by " selectClassName="mySelect_sort status_filter" />
                  </div>
                  <CustomDropdown className="business_selct_box" options={PER_PAGE} value={perPage} onChange={setPerPage} selectClassName="mySelect_pagi number_page_sorting" />
                </div>
              </div>
              <div className="approve_staff_data">
                <DataTable
                  id="staff_datas"
                  deps={[rows, pageLen, tableStatus]}
                  head={<tr><th>Name</th><th>In Time</th><th>Out Time</th><th>Break Time</th><th>Work Time</th><th className="data_list_check">Status</th><th>Behavior</th><th>Overtime</th><th className="data_list_check">Action</th></tr>}
                  options={() => ({
                    data: rows,
                    searching: false,
                    lengthChange: false,
                    info: false,
                    responsive: true,
                    order: [],
                    pageLength: pageLen,
                    ...(tableStatus ? { language: { emptyTable: tableStatus } } : {}),
                    columnDefs: [{ width: '95px', targets: [1, 2] }, { targets: [5, 7], orderable: false }],
                    columns: [
                      { data: 'full_name', render: (d: string, _t: string, r: Row) => `<a href="/staff/staff-profile-new/${r.id}" class="staff-edit"><div class="user-images"><div><img src="${esc(r.photo ?? '/assets/admin/images/dummy/dummy-user.svg')}" class="approve-user-img" alt=""></div><div>${esc(d)}<p class="data-sub-field">${r.department ? esc(r.department.name) : "<span style='color: red!important;'>No Department Assigned</span>"}</p></div></div></a>` },
                      { data: null, render: (_d: unknown, _t: string, r: Row) => (r.punches.length ? r.punches.map((p) => t12(p.in_time)).join('<br>') : '-') },
                      { data: null, render: (_d: unknown, _t: string, r: Row) => (r.punches.some((p) => p.out_time) ? r.punches.filter((p) => p.out_time).map((p) => t12(p.out_time)).join('<br>') : '-') },
                      { data: null, render: (_d: unknown, _t: string, r: Row) => fmtHm(r.break_seconds) },
                      { data: null, render: (_d: unknown, _t: string, r: Row) => fmtHm(r.total_seconds) },
                      { data: 'status', render: (d: string) => `<span class="badge ${BADGE[d] ?? 'bg-secondary'}">${esc(d)}</span>` },
                      { data: 'behavior', render: (d: string | null) => (d && BEHAVIOR[d] ? `<span class="px-3 py-1 behavior rounded-full text-xs font-semibold ${BEHAVIOR[d][0]} text-white shadow-sm ring-1 ring-white/20" style="${BEHAVIOR[d][1]}">${d}</span>` : '-') },
                      { data: 'overtime_seconds', render: (d: number) => (d ? fmtHm(d) : '-') },
                      {
                        data: null,
                        orderable: false,
                        render: (_d: unknown, _t: string, r: Row) =>
                          `<div class="atten-action-main"><div data-act="note" data-id="${r.id}" class="create-data dropdown-toggle proxima_nova_bold">${ATT_ICONS[0]}</div><div data-act="log" data-id="${r.id}" class="create-data dropdown-toggle proxima_nova_bold">${ATT_ICONS[1]}</div>${r.is_remote ? `<div data-act="map" data-id="${r.id}" class="create-data dropdown-toggle proxima_nova_bold">${ATT_ICONS[1]}</div>` : ''}</div>`,
                      },
                    ],
                  })}
                  onReady={(_api, box, $) => {
                    const h = function (this: HTMLElement) {
                      const r = rows.find((x) => x.id === Number(this.dataset.id));
                      if (!r) return;
                      if (this.dataset.act === 'note') openNote(r);
                      else if (this.dataset.act === 'log') void openLog(r);
                      else void openMap(r);
                    };
                    $(box).on('click', '[data-act]', h);
                    return () => $(box).off('click', '[data-act]', h);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="offcanvas offcanvas-end daily-work-data-download" tabIndex={-1} id="view-toggle-right" data-bs-scroll="true">
        <div className="offcanvas-header p-0">
          <h5 className="section_title_heading proxima_nova_bold download-work-main-header m-0">View Log</h5>
          <div className="" data-bs-dismiss="offcanvas" aria-label="Close"><I.Ic726f4 /></div>
        </div>
        <div className="section_title_heading view_log_inner">
          <hr />
          <div className="view-log-model">
            <h2 className="proxima_nova_semibold section_title note_name">{sel?.full_name}</h2>
            <span className="log_date">{date}</span>
          </div>
          <div className="view-log-model-main">
            {dayInfo && dayInfo.logs.length > 0 ? (
              dayInfo.logs.map((l) => (
                <div className="view-log-item" key={l.id}>
                  <div className={`timeline-point ${statusCls(l.detail)}`}></div>
                  <div className={`view-log-card ${statusCls(l.detail)}`}>
                    <div className="view-log-card-header"><h6 className="view-log-status status_log_value">{l.detail}</h6></div>
                    <div className="view-log-card-body">
                      <p className="status_log_by"><span>By <strong>{l.by ?? 'System'}</strong> on {new Date(l.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span></p>
                    </div>
                  </div>
                </div>
              ))
            ) : dayInfo ? (
              <div className="view-log-empty-state">
                <h4 className="empty-title">No Activity Logs</h4>
                <p className="empty-desc">No log history recorded for this date.</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="offcanvas offcanvas-end daily-work-data-download" tabIndex={-1} id="create-toggle-right" data-bs-scroll="true">
        <div className="offcanvas-header p-0">
          <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main m-0">Add Note</h5>
          <div className="" data-bs-dismiss="offcanvas" aria-label="Close"><I.Ic726f4 /></div>
        </div>
        <div className="offcanvas-body overflow-auto">
          <hr />
          <div className="filter-sub-sec">
            <form onSubmit={(e) => { e.preventDefault(); if (note.trim()) addNote.mutate(); }}>
              <div className="attendance_add_form_inner">
                <div className="daily-work-select">
                  <h2 className="filter-shiftcheck section_title proxima_nova_semibold note_name">{sel?.full_name}</h2>
                  <div className="form-check add-note-main w-100 add_note_form">
                    <textarea placeholder="Leave needs to be added." className="section_sub_title w-100" value={note} onChange={(e) => setNote(e.target.value)}></textarea>
                  </div>
                </div>
              </div>
              <div className="download-cancel-btns-main">
                <div className="download-cancel-btn">
                  <button type="submit" className="download-btn proxima_nova_semibold w-100 mb-0" aria-label="Close" data-bs-dismiss="offcanvas">Save</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="offcanvas offcanvas-end daily-work-data-download filter_icon map-dailog" tabIndex={-1} id="map-toggle-right" data-bs-scroll="true">
        <div className="offcanvas-header p-0">
          <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main m-0">Live Locations</h5>
          <div className="" data-bs-dismiss="offcanvas" aria-label="Close"><I.Ic726f4 /></div>
        </div>
        <div className="offcanvas-body overflow-auto">
          <hr />
          <div className="filter-sub-sec">
            <div id="mapdiv">{loc.length > 0 ? <StaffMap points={loc} height={420} /> : <p className="text-sm text-gray-500">No location recorded yet.</p>}</div>
          </div>
        </div>
      </div>
    </>
  );
}
