'use client';

import { useMemo, useRef, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { useAction, useAdmin } from '@/lib/query';
import { ICON_DOTS } from '@/lib/actionIcons';
import { esc, showOffcanvas } from '@/lib/bs';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { ConfirmOffcanvas } from '@/components/widgets/ConfirmOffcanvas';
import { CustomDropdown } from '@/components/widgets/CustomDropdown';
import { DataTable } from '@/components/widgets/DataTable';

interface Role { id: number; name: string; user_count: number }
const PER_PAGE = [{ value: 'all', label: 'All' }, { value: '10perpage', label: '10 Per Page' }, { value: '50perpage', label: '50 Per Page' }, { value: '100perpage', label: '100 Per Page' }];

export default function Body() {
  const { can } = useAdminSession();
  const list = useAdmin<Role[]>('/admin/roles');
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState('10perpage');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const rows = useMemo(() => (list.data?.data ?? []).filter((r) => !search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase())), [list.data, search]);
  const pageLen = perPage === 'all' ? -1 : parseInt(perPage);
  const idRef = useRef<number | null>(null);
  idRef.current = deleteId;
  const remove = useAction((id: number) => adminApi.del(`/admin/roles/${id}`), { invalidate: ['/admin/roles'] });
  const actions = can('edit_role') || can('delete_role');

  return (
    <>
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6">
            <div className="flex flex-col gap-1">
              <BackCrumb title="Roles" crumbs={['Role Management', 'Roles']} />
            </div>
            {can('add_role') && (
              <div className="mb-0 text-end">
                <button className="staff-manage-summary-btn ">
                  <a href="/roles/add-role" className="dropdown-toggle text-decoration-none filter_staff_data">Add Role</a>
                </button>
              </div>
            )}
            <div className="main-content-inner on-time-main main-atten">
              <div className="approve-datas atten-datas row mt-0">
                <div className="atten-data-search attendance-search assign-data-search col-md-6 col-sm-6">
                  <input className="input-search-rounded search-input" type="text" id="staff_data_find" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="col-md-6 col-sm-6 staff-right-length">
                  <CustomDropdown className="business_selct_box" options={PER_PAGE} value={perPage} onChange={setPerPage} selectClassName="mySelect_pagi number_page_sorting" />
                </div>
              </div>
              <div className="approve_staff_data">
                <DataTable
                  id="staff_datas"
                  deps={[rows, pageLen, actions]}
                  head={<tr><th>Name</th>{actions && <th className="text-end">Action</th>}</tr>}
                  options={() => ({
                    data: rows,
                    searching: false,
                    lengthChange: false,
                    info: false,
                    responsive: true,
                    order: [],
                    pageLength: pageLen,
                    columns: [
                      { data: 'name', render: (d: string) => esc(d) },
                      ...(actions
                        ? [{
                            data: null,
                            orderable: false,
                            render: (_d: unknown, _t: string, r: Role) =>
                              `<div class="btn-group upload-actions float-end"><div class="dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">${ICON_DOTS}</div><div class="dropdown-menu">${can('edit_role') ? `<a class="dropdown-item proxima_nova_semibold" href="/roles/edit-role/${r.id}">Edit</a>` : ''}${can('delete_role') ? `<a class="dropdown-item proxima_nova_semibold" href="#" data-del="${r.id}">Delete</a>` : ''}</div></div>`,
                          }]
                        : []),
                    ],
                  })}
                  onReady={(_api, box, $) => {
                    const h = function (this: HTMLElement, e: Event) {
                      e.preventDefault();
                      setDeleteId(Number(this.dataset.del));
                      void showOffcanvas('deleteModal');
                    };
                    $(box).on('click', '[data-del]', h);
                    return () => $(box).off('click', '[data-del]', h);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      <ConfirmOffcanvas id="deleteModal" title="Delete Role" message="Are you sure to delete this role?" busy={remove.isPending} onConfirm={() => deleteId && remove.mutate(deleteId)} />
    </>
  );
}
