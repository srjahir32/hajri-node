'use client';

import { useMemo, useRef, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { useAdmin } from '@/lib/query';
import { esc } from '@/lib/bs';
import { monthStr } from '@/lib/format';
import { toast } from '@/lib/toast';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { CustomDropdown } from '@/components/widgets/CustomDropdown';
import { DataTable } from '@/components/widgets/DataTable';
import { MonthPicker } from '@/components/widgets/MonthPicker';

export interface ReportRow { id: number; name: string; department: string | null; photo?: string | null; cells: (string | number)[] }
export interface ReportCfg<T> {
  title: string;
  heading: string[];
  /** GET endpoint; receives the chosen month ("YYYY-MM") when `month` is true */
  endpoint: string;
  query: (ym: string) => Record<string, string | number>;
  month: boolean;
  toRows: (data: T[], ctx: { prefix: string }) => ReportRow[];
  /** header labels after "Staff Name" / "Staff ID" */
  columns: string[];
  exportPath: string;
  exportQuery: (ym: string, ids: number[]) => Record<string, string | number>;
  exportName: string;
  exportId: string;
  wrap: { top: string; right: string; table: string; main?: string };
  staffIdColumn?: boolean;
}

const PER_PAGE = [{ value: 'all', label: 'All' }, { value: '10perpage', label: '10 Per Page' }, { value: '50perpage', label: '50 Per Page' }, { value: '100perpage', label: '100 Per Page' }];

/** Staff table with search / month / per-page / export — the shell of the attendance, salary and user-list reports. */
export function ReportTable<T>({ cfg }: { cfg: ReportCfg<T> }) {
  const { business } = useAdminSession();
  const prefix = (business?.name ?? '').slice(0, 3);
  const [month, setMonth] = useState(monthStr());
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState('10perpage');
  const q = useAdmin<T[]>(cfg.endpoint, cfg.query(month), { keepPrevious: true });
  const rows = useMemo(() => cfg.toRows(q.data?.data ?? [], { prefix }).filter((r) => !search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase())), [q.data, search, prefix]); // eslint-disable-line react-hooks/exhaustive-deps
  const pageLen = perPage === 'all' ? -1 : parseInt(perPage);
  const checked = useRef(new Set<number>());

  const exportIt = async () => {
    try {
      await adminApi.download(cfg.exportPath, cfg.exportQuery(month, [...checked.current]), cfg.exportName);
      toast.success('Your files is being downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Somthing went wrong.');
    }
  };
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title={cfg.title} crumbs={['Reports', cfg.title]} />
          <div className={`main-content-inner on-time-main main-atten ${cfg.wrap.main ?? ''}`}>
            <div>
              <div className={`approve-datas atten-datas report-main-list attendance_reports_table_top ${cfg.wrap.top}`}>
                <div className="atten-data-search assign-data-search report_data col-md-6">
                  <p className="proxima_nova_semibold holiday-staff-list-day mb-2">Total Staffs <span className="holiday-policy-count proxima_nova_bold">({rows.length})</span></p>
                  <form onSubmit={(e) => e.preventDefault()}>
                    <input className="input-search-rounded" type="text" id="staff_data_find" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </form>
                </div>
                <div className={`approve-right-data ${cfg.wrap.right} col-md-6`}>
                  <div className="approve-data-download dropdown-toggle proxima_nova_bold report_data_download">
                    <a id={cfg.exportId} onClick={() => void exportIt()} style={{ cursor: 'pointer' }}>
                      <div className="export_report_data">
                        <p className="export_data_report section_sub_title">Export</p>
                        <div className="report_down_img">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/admin/images/approve_punches/download-report.svg" alt="" /></div>
                      </div>
                    </a>
                  </div>
                  <CustomDropdown className="business_selct_box" options={PER_PAGE} value={perPage} onChange={setPerPage} selectClassName="mySelect_pagi number_page_sorting" />
                  {cfg.month && (
                    <div className="input-group date">
                      <MonthPicker id="calender_date" className="form-control input-group-addon proxima_nova_semibold calender-picker" value={month} onChange={setMonth} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className={`approve_staff_data ${cfg.wrap.table}`}>
              <DataTable
                id="staff_datas"
                deps={[rows, pageLen]}
                head={<tr><th className="data_list_check"><input type="checkbox" id="selectAllCheckbox" /></th><th>Staff Name</th><th>Staff ID</th>{cfg.columns.map((c) => <th key={c}>{c}</th>)}</tr>}
                options={() => ({
                  data: rows,
                  searching: false,
                  lengthChange: false,
                  info: false,
                  responsive: true,
                  order: [],
                  pageLength: pageLen,
                  columnDefs: [{ width: '10px', targets: 0, orderable: false }],
                  columns: [
                    { data: 'id', orderable: false, render: (_d: number, _t: string, r: ReportRow) => `<input type="checkbox" class="selectCheckbox_model" value="${r.id}" ${checked.current.has(r.id) ? 'checked' : ''}>` },
                    { data: 'name', render: (d: string, _t: string, r: ReportRow) => `<a href="/staff/staff-profile-new/${r.id}" class="staff-edit"><div class="user-images"><div><img src="${esc(r.photo ?? '/assets/admin/images/dummy/dummy-user.svg')}" class="approve-user-img" alt=""></div><div>${esc(d)}<p class="data-sub-field">${r.department ? esc(r.department) : "<span style='color: red!important;'>No Department Assigned</span>"}</p></div></div></a>` },
                    { data: 'id', render: (d: number) => `${esc(prefix)}${d}` },
                    ...cfg.columns.map((_c, i) => ({ data: null, render: (_d: unknown, _t: string, r: ReportRow) => String(r.cells[i] ?? '') })),
                  ],
                })}
                onReady={(_api, box, $) => {
                  const onRow = function (this: HTMLInputElement) {
                    if (this.checked) checked.current.add(Number(this.value));
                    else checked.current.delete(Number(this.value));
                  };
                  const onAll = function (this: HTMLInputElement) {
                    $(box).find('.selectCheckbox_model').each((_i: number, el: HTMLInputElement) => {
                      el.checked = this.checked;
                      if (this.checked) checked.current.add(Number(el.value));
                      else checked.current.delete(Number(el.value));
                    });
                  };
                  $(box).on('change', '.selectCheckbox_model', onRow).on('change', 'thead input', onAll).on('click', 'thead input', (e: Event) => e.stopPropagation());
                  return () => $(box).off('change', '.selectCheckbox_model', onRow).off('change', 'thead input', onAll);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
