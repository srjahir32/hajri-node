'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { esc } from '@/lib/bs';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { CustomDropdown } from '@/components/widgets/CustomDropdown';
import { DataTable } from '@/components/widgets/DataTable';
import { PRIMARY_BTN } from '@/components/settings/SettingsCard';

const PER_PAGE = [{ value: 'all', label: 'All' }, { value: '10perpage', label: '10 Per Page' }, { value: '50perpage', label: '50 Per Page' }, { value: '100perpage', label: '100 Per Page' }];
export const STATUS_BADGE = (n: number) => `<span class="badge ${n === 1 ? 'bg-success' : n === 2 ? 'bg-danger' : 'bg-warning text-dark'}">${n === 1 ? 'Approved' : n === 2 ? 'Rejected' : 'Pending'}</span>`;

/** Employee "list" pages (attendance requests, leaves): add button, search, status + per-page filters, DataTable. */
export function StaffListTable<T extends { status?: number }>({ title, crumbs, addLabel, addHref, rows, head, columns, searchText, extraFilter }: {
  title: string;
  crumbs: string[];
  addLabel: string;
  addHref: string;
  rows: T[];
  head: ReactNode;
  columns: Record<string, unknown>[];
  searchText: (r: T) => string;
  extraFilter?: ReactNode;
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [perPage, setPerPage] = useState('10perpage');
  const shown = useMemo(() => rows.filter((r) => (status === 'all' || String(r.status) === status) && (!search.trim() || searchText(r).toLowerCase().includes(search.trim().toLowerCase()))), [rows, status, search]); // eslint-disable-line react-hooks/exhaustive-deps
  const pageLen = perPage === 'all' ? -1 : parseInt(perPage);
  return (
    <main className="flex-1 p-md-5 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-8 max-w-[1600px] mx-auto">
          <BackCrumb title={title} crumbs={crumbs} />
          <div className="text-end m-0">
            <div className="approve-right-data">
              <a href={addHref} className={PRIMARY_BTN}>{addLabel}</a>
            </div>
          </div>
          <div className="approve-datas atten-datas row">
            <div className="atten-data-search attendance-search assign-data-search col-md-6 col-sm-6">
              <input className="input-search-rounded search-input" type="text" id="staff_data_find" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="col-md-6 col-sm-6 staff-right-length">
              {extraFilter}
              <div className="business_selct_box select_mate_option staff-option_select">
                <CustomDropdown options={[{ value: 'all', label: 'All' }, { value: '0', label: 'Pending' }, { value: '1', label: 'Approved' }, { value: '2', label: 'Rejected' }]} value={status} onChange={setStatus} prefix="Sort by " selectClassName="mySelect_sort status_filter" />
              </div>
              <CustomDropdown className="business_selct_box" options={PER_PAGE} value={perPage} onChange={setPerPage} selectClassName="mySelect_pagi number_page_sorting" />
            </div>
          </div>
          <div className="approve_staff_data">
            <DataTable id="staff_datas" deps={[shown, pageLen]} head={head} options={() => ({ data: shown, searching: false, lengthChange: false, info: false, responsive: true, order: [], pageLength: pageLen, columns })} />
          </div>
        </div>
      </div>
    </main>
  );
}
export { esc };
