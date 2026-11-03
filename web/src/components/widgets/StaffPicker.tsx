'use client';

import { useMemo, useRef, useState } from 'react';
import { useAdminSession } from '@/lib/auth';
import { esc } from '@/lib/bs';
import { CustomDropdown } from './CustomDropdown';
import { DataTable } from './DataTable';

export interface PickRow {
  id: number;
  name: string;
  phone_number: string | null;
  photo: string | null;
  /** department (or whatever sub-label the page shows under the name) */
  sub?: string | null;
  assigned: boolean;
}

const PER_PAGE = [
  { value: 'all', label: 'All' },
  { value: '10perpage', label: '10 Per Page' },
  { value: '50perpage', label: '50 Per Page' },
  { value: '100perpage', label: '100 Per Page' },
];

/**
 * The "search + per page + checkbox table + Apply" block every Laravel assignment page repeats
 * (department / holiday / weekly-holiday / leave / shift / automation-rule staff lists).
 */
export function StaffPicker({ rows, buttonLabel, busy, onApply, emptyText = 'No staff found' }: {
  rows: PickRow[];
  buttonLabel: string;
  busy?: boolean;
  onApply: (selected: number[], unselected: number[]) => void;
  emptyText?: string;
}) {
  const { business } = useAdminSession();
  const prefix = (business?.name ?? '').slice(0, 3);
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState('10perpage');
  // ids currently ticked; seeded from the server and kept across searching/paging
  const initial = useMemo(() => new Set(rows.filter((r) => r.assigned).map((r) => r.id)), [rows]);
  const checked = useRef<Set<number>>(new Set(initial));
  const seeded = useRef(initial);
  if (seeded.current !== initial) {
    seeded.current = initial;
    checked.current = new Set(initial);
  }
  const [count, setCount] = useState(checked.current.size);
  const sync = () => setCount(checked.current.size);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => `${r.name} ${r.phone_number ?? ''}`.toLowerCase().includes(q)) : rows;
  }, [rows, search]);
  const pageLen = perPage === 'all' ? -1 : parseInt(perPage);

  const apply = () => {
    const selected = [...checked.current];
    const unselected = [...initial].filter((id) => !checked.current.has(id));
    onApply(selected, unselected);
  };

  return (
    <>
      <div>
        <div className="approve-datas atten-datas">
          <div className="atten-data-search assign-data-search col-md-6 col-sm-6">
            <form onSubmit={(e) => e.preventDefault()}>
              <input className="input-search-rounded" type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
            </form>
          </div>
          <div className="col-md-6 col-sm-6 staff-right-length">
            <CustomDropdown className="business_selct_box" selectClassName="mySelect_pagi number_page_sorting" options={PER_PAGE} value={perPage} onChange={setPerPage} />
          </div>
        </div>
      </div>
      <div className="approve_staff_data">
        <DataTable
          id="staff_datas"
          deps={[filtered, pageLen]}
          head={
            <tr>
              <th className="data_list_check"><input type="checkbox" id="selectAllCheckbox" /></th>
              <th>Staff Name</th>
              <th>Staff ID</th>
              <th>Salary Payment Type</th>
              <th>Phone Number</th>
            </tr>
          }
          options={() => ({
            data: filtered,
            searching: false,
            lengthChange: false,
            info: false,
            responsive: true,
            order: [],
            pageLength: pageLen,
            language: { emptyTable: emptyText },
            columnDefs: [{ width: '10px', targets: 0, orderable: false }],
            columns: [
              { data: 'id', orderable: false, render: (_d: number, _t: string, r: PickRow) => `<input type="checkbox" class="selectCheckbox_model" value="${r.id}" ${checked.current.has(r.id) ? 'checked' : ''}>` },
              {
                data: 'name',
                render: (d: string, _t: string, r: PickRow) =>
                  `<a href="/staff/staff-profile-new/${r.id}" class="staff-edit"><div class="user-images"><div><img src="${esc(r.photo ?? '/assets/admin/images/dummy/dummy-user.svg')}" class="approve-user-img" alt=""></div><div>${esc(d)}<p class="data-sub-field">${r.sub ? esc(r.sub) : "<span style='color: red!important;'>No Department Assigned</span>"}</p></div></div></a>`,
              },
              { data: 'id', render: (d: number) => `${esc(prefix)}${d}` },
              { data: null, orderable: false, render: () => `<div class="salary-payment-type"><div class="salary-payment-text section_sub_title">R<div class="tooltip-text">Regular</div></div>Monthly</div>` },
              { data: 'phone_number', render: (d: string | null) => esc(d ?? '') },
            ],
          })}
          onReady={(_api, box, $) => {
            const syncAll = () => {
              const boxes = $(box).find('.selectCheckbox_model');
              $(box).find('#selectAllCheckbox, .data_list_check input').prop('checked', boxes.length > 0 && boxes.filter(':checked').length === boxes.length);
            };
            const onRow = function (this: HTMLInputElement) {
              const id = Number(this.value);
              if (this.checked) checked.current.add(id);
              else checked.current.delete(id);
              syncAll();
              sync();
            };
            const onAll = function (this: HTMLInputElement) {
              $(box).find('.selectCheckbox_model').each((_i: number, el: HTMLInputElement) => {
                el.checked = this.checked;
                const id = Number(el.value);
                if (this.checked) checked.current.add(id);
                else checked.current.delete(id);
              });
              sync();
            };
            $(box).on('change', '.selectCheckbox_model', onRow).on('change', '.data_list_check input', onAll).on('click', '.data_list_check input', (e: Event) => e.stopPropagation());
            syncAll();
            return () => $(box).off('change', '.selectCheckbox_model', onRow).off('change', '.data_list_check input', onAll);
          }}
        />
      </div>
      <div className="flex justify-end pt-4">
        <button
          onClick={apply}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95"
        >
          {buttonLabel} (<span className="save_count">{count}</span>)
        </button>
      </div>
    </>
  );
}
