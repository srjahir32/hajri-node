'use client';

import { Fragment } from 'react';
import * as I from '@/components/icons';
import { useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdmin } from '@/lib/query';
import { toast } from '@/lib/toast';
import { fmtDate } from '@/lib/format';
import { DataTable } from '@/components/widgets/DataTable';

interface Row { id: number; full_name: string; phone_number: string; salary_amount: number | null; shift: string | null; photo: string | null; department: { name: string } | null; department_id: number | null; deactivate_date?: string | null }
interface Dept { id: number; name: string }
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export default function Body() {
  const list = useAdmin<Row[]>('/admin/staff', { size: 500, status: 'deactivated' });
  const depts = useAdmin<Dept[]>('/admin/departments');
  const departments = depts.data?.data ?? [];
  const meta = list.data as unknown as { active_count?: number; deactivated_count?: number } | undefined;
  const staff_count = meta?.active_count ?? 0;
  const deactivated_staff_count = meta?.deactivated_count ?? 0;
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [perPage, setPerPage] = useState('10perpage');
  const [picked, setPicked] = useState<string[]>([]);
  const [applied, setApplied] = useState<string[]>([]);

  const rows = useMemo(() => {
    let r = list.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((x) => [x.full_name, x.phone_number, x.department?.name].some((v) => String(v ?? '').toLowerCase().includes(q)));
    if (applied.length) r = r.filter((x) => applied.includes(String(x.department_id)));
    const by = { newest: (a: Row, b: Row) => b.id - a.id, oldest: (a: Row, b: Row) => a.id - b.id, atoz: (a: Row, b: Row) => a.full_name.localeCompare(b.full_name), ztoa: (a: Row, b: Row) => b.full_name.localeCompare(a.full_name) }[sort] ?? ((a: Row, b: Row) => b.id - a.id);
    return [...r].sort(by);
  }, [list.data, search, sort, applied]);
  const pageLen = perPage === 'all' ? -1 : parseInt(perPage);
  const activate = async (id: number) => {
    try {
      const res = await adminApi.post(`/admin/staff/${id}/activate`);
      toast.success(String(res.message));
      await list.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
  };
  return (
    <>

    <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
                <div className="page-title-area">
                    <div className="row align-items-center">
                        <div className="col-sm-12 top-header-sub staff-summary-main">
                            <div className="breadcrumbs-area clearfix">
                                <div className="breadcrumbs-sub staf-add-btn-top">
                                    <h4 className="page-title pull-left proxima_nova_semibold">Deactivated Staff
                                        <span className="proxima_nova_bold" id="deactivated_staff_count">({deactivated_staff_count})</span>
                                    </h4>
                                    <div className="staff-summary-main d-flex align-items-center">
                                        <button className="staff-manage-summary-btn deactivated-staff-btn me-2">
                                            <a href={"/staff-new"} className="text-decoration-none text-white proxima_nova_semibold">
                                                Active Staff List ({staff_count})
                                            </a>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="on-time-main">
                    <div>
                        <div className="approve-datas main-staff-data-list">
                            <div className="approve-data-search assign-data-search col-md-6 col-sm-6">
                                <div>
                                    <div className="dropdown staff_department_dropdown" style={applied.length ? { backgroundColor: 'rgba(47, 140, 255, 0.1)' } : undefined}>
                                        <a className="dropdown-toggle text-decoration-none filter_staff_data flex align-items-center" href="#" data-bs-toggle="offcanvas" data-bs-target="#create-toggle-right" aria-controls="create-toggle-right">
                                            <I.I621ddd />
                                            <span className="section_sub_title proxima_nova_semibold ps-1">Filter<span className="select_department_count proxima_nova_semibold ps-1">{applied.length ? `(${applied.length})` : ''}</span></span>
                                        </a>
                                    </div>
                                </div>
                                <input className="input-search-rounded" type="text" id="staff_data_find" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                            <div className="col-md-6 col-sm-6 staff-right-length">
                                <div className="business_selct_box select_mate_option staff-option_select">
                                    <div className="custom-dropdown">
                                        <div className="dropdown-trigger">
                                            <span className="sort_by_text">Sort by </span>
                                            <span className="selected-value">Newest</span>
                                        </div>
                                        <ul className="dropdown-options">
                                            <li data-value="newest" className="selected">Newest</li>
                                            <li data-value="oldest">Oldest</li>
                                            <li data-value="atoz">A to Z</li>
                                            <li data-value="ztoa">Z to A</li>
                                        </ul>
                                        <select className="mySelect_sort character_page_sorting" style={{ display: "none" }} value={sort} onChange={(e) => setSort(e.target.value)}>
                                            <option value="newest">Newest</option>
                                            <option value="oldest">Oldest</option>
                                            <option value="atoz">A to Z</option>
                                            <option value="ztoa">Z to A</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="business_selct_box custom-dropdown">
                                    <div className="dropdown-trigger">
                                        <span className="selected-value">10 Per Page</span>
                                    </div>
                                    <ul className="dropdown-options">
                                        <li data-value="all">All</li>
                                        <li data-value="10perpage" className="selected">10 Per Page</li>
                                        <li data-value="50perpage">50 Per Page</li>
                                        <li data-value="100perpage">100 Per Page</li>
                                    </ul>
                                    <select className="mySelect_pagi number_page_sorting" style={{ display: "none" }} value={perPage} onChange={(e) => setPerPage(e.target.value)}>
                                        <option value="10perpage">10 Per Page</option>
                                        <option value="50perpage">50 Per Page</option>
                                        <option value="100perpage">100 Per Page</option>
                                        <option value="all">All</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="approve_staff_data">
                        <DataTable
                            id="staff_datas"
                            deps={[rows, pageLen]}
                            head={<tr>
                                <th className="data_list_check"><input type="checkbox" id="selectAllCheckbox" /></th>
                                <th>Staff Name</th>
                                <th>Phone Number</th>
                                <th>Salary amount</th>
                                <th>Shift Type</th>
                                <th>Deactivated Date</th>
                                <th>Action</th>
                            </tr>}
                            options={() => ({
                                data: rows,
                                searching: false,
                                lengthChange: false,
                                info: false,
                                responsive: true,
                                order: [],
                                pageLength: pageLen,
                                language: { emptyTable: '<div class="no_data_found"><div class=""><img src="/assets/admin/images/staff_manage/no_data.svg" alt="No Data"></div><div class="proxima_nova_semibold section_title">No deactivated staff found</div></div>' },
                                columns: [
                                    { data: 'id', orderable: false, render: (_d: unknown, _t: string, row: Row) => `<input type="checkbox" class="selectCheckbox_model" value="${row.id}">` },
                                    { data: 'full_name', render: (data: string, _t: string, row: Row) => `<a href="/staff/staff-profile-new/${row.id}" class="staff-edit"><div class="user-images"><div><img src="${esc(row.photo ?? '/assets/admin/images/dummy/dummy-user.svg')}" class="approve-user-img" alt=""></div><div>${esc(data)}<p class="data-sub-field">${esc(row.department?.name ?? 'N/A')}</p></div></div></a>` },
                                    { data: 'phone_number' },
                                    { data: 'salary_amount', render: (d: number | null) => (d == null ? '' : String(d)) },
                                    { data: 'shift', render: (d: string | null) => esc(d ?? '') },
                                    { data: 'deactivate_date', render: (d: string | null) => esc(d ? fmtDate(d) : '') },
                                    { data: null, orderable: false, render: (_d: unknown, _t: string, row: Row) => `<button type="button" class="activate_staff_action_btn" data-staff-id="${row.id}">Activate</button>` },
                                ],
                            })}
                            onReady={(_api, box, $) => {
                                const h = (e: Event) => void activate(Number((e.currentTarget as HTMLElement).dataset.staffId));
                                $(box).on('click', '.activate_staff_action_btn', h);
                                return () => $(box).off('click', '.activate_staff_action_btn', h);
                            }}
                        />
                    </div>
                    <div className="offcanvas offcanvas-end daily-work-data-download filter_icon" tabIndex={-1} id="create-toggle-right" data-bs-scroll="true" aria-labelledby="offcanvasRightLabel">
                        <div className="offcanvas-header">
                            <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close">
                                <I.I9dae93 />
                            </div>
                        </div>
                        <div className="offcanvas-body overflow-auto">
                            <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main">Filter</h5>
                            <hr />
                            <div className="filter-sub-sec">
                                <form method="">
                                    
                                    <div className="daily-work-select">
                                        <h2 className="filter-shiftcheck section_title proxima_nova_semibold">Filter By Departments</h2>
                                        {departments.map((department, _i1) => (<Fragment key={_i1}>
                                            <div className="form-check filter-shift-main">
                                                <input className="form-check-input select_department" type="checkbox" value={String(department.id)} name="select_department" id={String(department.id)} checked={picked.includes(String(department.id))} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, String(department.id)] : p.filter((x) => x !== String(department.id))))} />
                                                <label className="form-check-label proxima_nova_regular" htmlFor={String(department.id)}>{department.name}</label>
                                            </div>
                                        </Fragment>))}
                                    </div>
                                    <div className="download-cancel-btns-main">
                                        <div className="download-cancel-btn">
                                            <button type="button" name="" className="download-btn proxima_nova_semibold apply_staff_filter" data-bs-dismiss="offcanvas" aria-label="Close" onClick={() => setApplied(picked)}>Apply</button>
                                            <button type="button" name="" className="proxima_nova_semibold cancel-staff-btn clear_filter" style={{ width: "100%" }} disabled={picked.length === 0} onClick={() => setPicked([])}>Clear</button>
                                        </div>
                                    </div>
                                </form>
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
