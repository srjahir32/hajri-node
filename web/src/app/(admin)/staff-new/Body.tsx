'use client';

import { Fragment } from 'react';
import * as I from '@/components/icons';
import { useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { useAdmin } from '@/lib/query';
import { toast } from '@/lib/toast';
import { DataTable } from '@/components/widgets/DataTable';

interface Row { id: number; full_name: string; phone_number: string; salary_amount: number | null; shift: string | null; photo: string | null; department: { name: string } | null; created_at: string }
interface Dept { id: number; name: string }

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export default function Body() {
  const { can } = useAdminSession();
  const list = useAdmin<Row[]>('/admin/staff', { size: 500 });
  const depts = useAdmin<Dept[]>('/admin/departments');
  const departments = depts.data?.data ?? [];
  const meta = list.data as unknown as { active_count?: number; deactivated_count?: number } | undefined;
  const [staff_count, setStaffCount] = useState<number | null>(null);
  const shownCount = staff_count ?? meta?.active_count ?? 0;
  const deactivated_staff_count = meta?.deactivated_count ?? 0;
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [perPage, setPerPage] = useState('10perpage');
  const [picked, setPicked] = useState<string[]>([]); // department ids ticked in the filter panel
  const [applied, setApplied] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const rows = useMemo(() => {
    let r = list.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((x) => [x.full_name, x.phone_number, x.department?.name].some((v) => String(v ?? '').toLowerCase().includes(q)));
    if (applied.length) r = r.filter((x) => applied.includes(String((x as unknown as { department_id: number }).department_id)));
    const by = { newest: (a: Row, b: Row) => b.id - a.id, oldest: (a: Row, b: Row) => a.id - b.id, atoz: (a: Row, b: Row) => a.full_name.localeCompare(b.full_name), ztoa: (a: Row, b: Row) => b.full_name.localeCompare(a.full_name) }[sort] ?? ((a: Row, b: Row) => b.id - a.id);
    return [...r].sort(by);
  }, [list.data, search, sort, applied]);

  const pageLen = perPage === 'all' ? -1 : parseInt(perPage);
  const clearSelection = () => setSelected([]);
  const deleteSelected = async () => {
    try {
      const res = await adminApi.post<{ deleted: number }>('/admin/staff/bulk-delete', { ids: selected.map(Number) });
      toast.success(String(res.message));
      clearSelection();
      await list.refetch();
      setStaffCount(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    }
  };
  const exportSelected = async () => {
    try {
      await adminApi.download('/admin/staff/export', { ids: selected.join(',') }, 'staff.xlsx');
      toast.success('Your files is being downloaded');
      clearSelection();
    } catch {
      toast.error('Somthing went wrong.');
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
                                    
                                    <h4 className="page-title pull-left proxima_nova_semibold">Staff Management
                                        <span className="proxima_nova_bold" id="staff_count">({shownCount})</span>
                                    </h4>
                                    <div className="staff-summary-main d-flex align-items-center">
                                        <button className="staff-manage-summary-btn deactivated-staff-btn me-2">
                                            <a className="text-decoration-none text-white proxima_nova_semibold" href={"/deactivated-staff-new"}>
                                                Deactivated Staff ({deactivated_staff_count})
                                            </a>
                                        </button>
                                        {can('add_staff') && (<>
                                            <button className="staff-manage-summary-btn ">
                                                <a className="dropdown-toggle text-decoration-none filter_staff_data" href="#" data-bs-toggle="offcanvas" data-bs-target="#xml-download-toggle-right" aria-controls="xml-download-toggle-right">
                                                    <I.I495a7b />
                                                    Add Staff
                                                </a>
                                            </button>
                                        </>)}
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
                                <input className="input-search-rounded" type="text" id="staff_data_find" placeholder="Search" value={search} onChange={(e) => { setSearch(e.target.value); clearSelection(); }} />
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
                            </tr>}
                            options={() => ({
                                data: rows,
                                searching: false,
                                lengthChange: false,
                                info: false,
                                responsive: true,
                                order: [],
                                pageLength: pageLen,
                                language: { emptyTable: '<div class="no_data_found"><div class=""><img src="/assets/admin/images/staff_manage/no_data.svg" alt="Advertisement"></div><div class="proxima_nova_semibold section_title">No data found, add staff</div></div>' },
                                columns: [
                                    { data: 'id', orderable: false, render: (_d: unknown, _t: string, row: Row) => `<input type="checkbox" class="selectCheckbox_model" id="selectCheckbox_model" value="${row.id}">` },
                                    { data: 'full_name', render: (data: string, _t: string, row: Row) => `<a href="/staff/staff-profile-new/${row.id}" class="staff-edit"><div class="user-images"><div><img src="${esc(row.photo ?? '/assets/admin/images/dummy/dummy-user.svg')}" class="approve-user-img" alt=""></div><div>${esc(data)}<p class="data-sub-field">${esc(row.department?.name ?? 'N/A')}</p></div></div></a>` },
                                    { data: 'phone_number' },
                                    { data: 'salary_amount', render: (d: number | null) => (d == null ? '' : String(d)) },
                                    { data: 'shift', render: (d: string | null) => esc(d ?? '') },
                                ],
                            })}
                            onReady={(_api, box, $) => {
                                const ids = () => $(box).find('.selectCheckbox_model:checked').map((_: number, el: HTMLInputElement) => el.value).get() as string[];
                                const onRow = () => setSelected(ids());
                                const onAll = (e: Event) => { $(box).find('.selectCheckbox_model').prop('checked', (e.target as HTMLInputElement).checked); setSelected(ids()); };
                                $(box).on('change', '.selectCheckbox_model', onRow);
                                $(box).on('change', '#selectAllCheckbox', onAll);
                                return () => { $(box).off('change', '.selectCheckbox_model', onRow); $(box).off('change', '#selectAllCheckbox', onAll); };
                            }}
                        />
                    </div>
                    <div className="offcanvas offcanvas-end daily-work-data-download filter_icon" tabIndex={-1} id="xml-download-toggle-right" data-bs-scroll="true" aria-labelledby="offcanvasRightLabel">
                        <div className="offcanvas-header">
                            <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close">
                                <I.I9dae93 />
                            </div>
                        </div>
                        <div className="offcanvas-body overflow-auto">
                            <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main">Add Staff</h5>
                            <hr />
                            <div className="filter-sub-sec">
                                <form method="">
                                    
                                    <div className="download-cancel-btns-main">
                                        <a href={"/staff/add-staff-new"}>
                                            <button type="button" name="" className="download-btn proxima_nova_semibold apply_staff_filter xml_data_staff" data-bs-dismiss="offcanvas" aria-label="Close">Add Staff</button>
                                        </a>
                                        <a href={"/staff/bulk_excel_add_staff_new"}>
                                            <button type="button" name="" className="download-btn proxima_nova_semibold apply_staff_filter xml_data_staff_excel" data-bs-dismiss="offcanvas" aria-label="Close">
                                                Bulk Excel Add
                                            </button>
                                        </a>
                                        <div className="download-cancel-btn"></div>
                                    </div>
                                </form>
                            </div>
                        </div>
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
                                            <button type="button" name="" className="download-btn proxima_nova_semibold apply_staff_filter" data-bs-dismiss="offcanvas" aria-label="Close" onClick={() => { setApplied(picked); clearSelection(); }}>Apply</button>
                                            <button type="button" name="" className="proxima_nova_semibold cancel-staff-btn clear_filter" style={{ width: "100%" }} disabled={picked.length === 0} onClick={() => setPicked([])}>Clear</button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="offcanvas offcanvas-end daily-work-data-download" tabIndex={-1} id="deleteModal" data-bs-scroll="true" aria-labelledby="offcanvasRightLabel">
                        <div className="offcanvas-header">
                            <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close">
                                <I.I9dae93 />
                            </div>
                        </div>
                        <div className="offcanvas-body overflow-auto">
                            <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main">Delete Staff</h5>
                            <hr />
                            <div className="staff_view_delete_title">
                                <h5>Are you sure to delete this Staff?</h5>
                            </div>
                            <div className="filter-sub-sec">
                                <div className="download-cancel-btns-main">
                                    <div className="download-cancel-btn mb-0">
                                        <button type="submit" name="" className="download-btn proxima_nova_semibold w-100 close_delete_modal delete_staff_btn" data-bs-dismiss="offcanvas" aria-label="Close" onClick={deleteSelected}>Delete
                                            <img className="loader" src={"/assets/admin/images/white_loader.gif"} alt="" />
                                        </button>
                                        <button type="submit" name="" className="download-btn proxima_nova_semibold w-100 cancel_modal cancel_selected_id" data-bs-dismiss="offcanvas" aria-label="Close" onClick={clearSelection}>Cancel
                                            <img className="loader" src={"/assets/admin/images/white_loader.gif"} alt="" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="myModal" className="modal check-model" style={{ display: selected.length > 0 ? 'block' : 'none' }}>
                        <div className="model-section">
                            <div className="model_left_side">
                                <div className="selected_check_member proxima_nova_semibold">{selected.length}</div>
                            </div>
                            <div className="model_right_side">
                                <div className="member_div proxima_nova_semibold">Members Selected</div>
                                <div className="export_div" onClick={exportSelected}>
                                    <I.I5b1ab5 />
                                    <p>Export</p>
                                </div>
                                <div className="delete_div">
                                    <a href="#" data-bs-toggle="offcanvas" data-bs-target="#deleteModal" aria-controls="deleteModal">
                                        <I.I7ec976 />
                                    </a>
                                    <p>Delete</p>
                                </div>
                                <div className="cancel_div cancel_selected_id" id="closeModal" onClick={clearSelection}>
                                    <I.I74b8dc />
                                    <p>Cancel</p>
                                </div>
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
