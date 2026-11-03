'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { CustomDropdown, type Opt } from '@/components/widgets/CustomDropdown';
import { DataTable } from '@/components/widgets/DataTable';

const SORTS: Opt[] = [{ value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }, { value: 'atoz', label: 'A to Z' }, { value: 'ztoa', label: 'Z to A' }];
const PER_PAGE: Opt[] = [{ value: '10perpage', label: '10 Per Page' }, { value: '50perpage', label: '50 Per Page' }, { value: '100perpage', label: '100 Per Page' }, { value: 'all', label: 'All' }];

export interface Filter<T> { key: string; options: Opt[]; match: (row: T, value: string) => boolean; prefix?: string }

/** Shared look of the super-admin list pages: title + count, search, filters, sort, per page, DataTable. */
export function SuperList<T>({ title, searchPlaceholder, rows, loading, searchText, name, created, filters = [], head, columns, tableId, headerExtra, sortable = true, onReady }: {
  title: string;
  searchPlaceholder: string;
  rows: T[];
  loading?: boolean;
  searchText: (r: T) => string;
  name: (r: T) => string;
  created: (r: T) => string;
  filters?: Filter<T>[];
  head: ReactNode;
  columns: Record<string, unknown>[];
  tableId: string;
  headerExtra?: ReactNode;
  sortable?: boolean;
  onReady?: (api: unknown, box: HTMLElement, $: any) => void | (() => void); // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [perPage, setPerPage] = useState('10perpage');
  const [vals, setVals] = useState<Record<string, string>>({});
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    let r = rows.filter((x) => (!q || searchText(x).toLowerCase().includes(q)) && filters.every((f) => !vals[f.key] || f.match(x, vals[f.key])));
    const by: Record<string, (a: T, b: T) => number> = {
      newest: (a, b) => created(b).localeCompare(created(a)),
      oldest: (a, b) => created(a).localeCompare(created(b)),
      atoz: (a, b) => name(a).localeCompare(name(b)),
      ztoa: (a, b) => name(b).localeCompare(name(a)),
    };
    r = [...r].sort(by[sort]);
    return r;
  }, [rows, search, sort, vals]); // eslint-disable-line react-hooks/exhaustive-deps
  const pageLen = perPage === 'all' ? -1 : parseInt(perPage);
  return (
    <main className="flex-1 pb-4 pt-4 overflow-y-auto">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <div className="page-title-area">
            <div className="row align-items-center">
              <div className="col-sm-12 top-header-sub staff-summary-main">
                <div className="breadcrumbs-area clearfix">
                  <div className="breadcrumbs-sub staf-add-btn-top">
                    <h4 className="page-title pull-left">{title} <span>({shown.length})</span></h4>
                    {headerExtra}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="on-time-main">
            <div className="row mb-3">
              <div className="col-12 approve-datas main-staff-data-list">
                <div className="approve-data-search assign-data-search col-md-6 col-sm-6">
                  <input className="input-search-rounded" type="text" placeholder={searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="col-md-6 col-sm-6 staff-right-length">
                  {filters.map((f) => (
                    <div className="business_selct_box select_mate_option staff-option_select" key={f.key}>
                      <CustomDropdown options={f.options} value={vals[f.key] ?? ''} onChange={(v) => setVals((c) => ({ ...c, [f.key]: v }))} prefix={f.prefix} />
                    </div>
                  ))}
                  {sortable && (
                    <div className="business_selct_box select_mate_option staff-option_select">
                      <CustomDropdown options={SORTS} value={sort} onChange={setSort} prefix="Sort by " selectClassName="mySelect_sort character_page_sorting" />
                    </div>
                  )}
                  <CustomDropdown className="business_selct_box" options={PER_PAGE} value={perPage} onChange={setPerPage} selectClassName="mySelect_pagi number_page_sorting" />
                </div>
              </div>
            </div>
            <div className="approve_staff_data">
              <DataTable
                id={tableId}
                className="tab-table display"
                deps={[shown, pageLen, loading]}
                head={head}
                options={() => ({ data: shown, searching: false, lengthChange: false, info: false, responsive: true, order: [], pageLength: pageLen, columns, language: { emptyTable: loading ? 'Loading…' : 'No data found' } })}
                onReady={onReady}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
