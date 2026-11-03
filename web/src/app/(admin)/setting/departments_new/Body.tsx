'use client';

import { useEffect, useRef, useState } from 'react';
import * as I from '@/components/icons';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { hideOffcanvas, showOffcanvas } from '@/lib/bs';
import { toast } from '@/lib/toast';
import { DataTable } from '@/components/widgets/DataTable';
import { BackCrumb } from '@/components/shell/BackCrumb';

interface Dept { id: number; name: string; staff_count: number; is_shared: boolean }

export default function Body() {
  const list = useAdmin<Dept[]>('/admin/departments');
  const rows = list.data?.data ?? [];
  const [name, setName] = useState('');
  const [editName, setEditName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const [editErr, setEditErr] = useState('');
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const create = useAction((n: string) => adminApi.post('/admin/departments', { name: n }), {
    invalidate: ['/admin/departments'],
    onSuccess: () => {
      setName('');
      void hideOffcanvas('create-toggle-right');
    },
  });
  const update = useAction((v: { id: number; name: string }) => adminApi.put(`/admin/departments/${v.id}`, { name: v.name }), {
    invalidate: ['/admin/departments'],
    onSuccess: () => void hideOffcanvas('edit-toggle-right'),
  });
  const remove = useAction((id: number) => adminApi.del(`/admin/departments/${id}`), {
    invalidate: ['/admin/departments'],
    onSuccess: () => void hideOffcanvas('deleteModal'),
  });

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr('Department field is required');
    setErr('');
    create.mutate(name.trim());
  };
  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = editName.trim();
    if (!n) return setEditErr('Department field is required');
    if (rows.some((r) => r.name.toLowerCase() === n.toLowerCase() && r.id !== editId)) return setEditErr('Department Name Already Exists');
    setEditErr('');
    update.mutate({ id: editId!, name: n });
  };

  useEffect(() => {
    if (!list.isLoading && list.error) toast.error(list.error.message);
  }, [list.isLoading, list.error]);

  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title="Business Settings" crumbs={['Settings', 'Holiday / Leave Settings', 'Departments']} />
          {!list.isLoading && rows.length === 0 ? (
            <div className="business-create-department">
              <p className="proxima_nova_bold">No Departments Added</p>
              <button className="approve-btn-btn proxima_nova_semibold create-data dropdown-toggle proxima_nova_bold" onClick={() => void showOffcanvas('create-toggle-right')}>
                Create Department
              </button>
            </div>
          ) : (
            <div className="approve_staff_data">
              <div className="create_department_table">
                <DataTable
                  id="staff_datas"
                  deps={[rows]}
                  head={
                    <tr>
                      <th>Departments</th>
                      <th>Assign Staff</th>
                      <th>Assign Staff</th>
                      <th>Action</th>
                    </tr>
                  }
                  options={() => ({
                    data: rows,
                    searching: false,
                    lengthChange: false,
                    info: false,
                    responsive: true,
                    order: [],
                    columns: [
                      { data: 'name' },
                      { data: 'staff_count', render: (d: number) => `${d} Staff` },
                      { data: null, render: (_d: unknown, _t: string, row: Dept) => `<a href="/assign_staff_new?id=${row.id}">Assign Staff</a>` },
                      {
                        data: null,
                        render: (_d: unknown, _t: string, row: Dept) =>
                          row.is_shared
                            ? ''
                            : `<div class="btn-group upload-actions">
                                <div class="dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">${actionDots}</div>
                                <div class="dropdown-menu">
                                  <a class="dropdown-item proxima_nova_semibold" href="#" data-act="edit" data-id="${row.id}">Edit</a>
                                  <a class="dropdown-item proxima_nova_semibold" href="#" data-act="delete" data-id="${row.id}">Delete</a>
                                </div>
                              </div>`,
                      },
                    ],
                  })}
                  onReady={(_api, box, $) => {
                    const onClick = (e: Event) => {
                      e.preventDefault();
                      const el = e.currentTarget as HTMLElement;
                      const id = Number(el.dataset.id);
                      const dep = rowsRef.current.find((r) => r.id === id);
                      if (!dep) return;
                      if (el.dataset.act === 'edit') {
                        setEditId(id);
                        setEditName(dep.name);
                        setEditErr('');
                        void showOffcanvas('edit-toggle-right');
                      } else {
                        setDeleteId(id);
                        void showOffcanvas('deleteModal');
                      }
                    };
                    $(box).on('click', '[data-act]', onClick);
                    return () => $(box).off('click', '[data-act]', onClick);
                  }}
                />
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => void showOffcanvas('create-toggle-right')}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95"
                >
                  Create Department
                </button>
              </div>
            </div>
          )}

          <div className="offcanvas offcanvas-end daily-work-data-download" tabIndex={-1} id="create-toggle-right" data-bs-scroll="true" style={{ height: '100vh' }}>
            <div className="offcanvas-header">
              <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close" style={{ cursor: 'pointer' }}>
                <I.I9dae93 />
              </div>
            </div>
            <div className="offcanvas-body overflow-auto">
              <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main">Add Department</h5>
              <hr />
              <div className="filter-sub-sec">
                <form onSubmit={submitCreate}>
                  <div className="daily-work-select create_department_inner_form">
                    <div className="shift-inner-sub-label-edit">
                      <label className="shift-type-label">Department Name</label>
                      <input type="text" className="form-control shift-edit-input" name="name" placeholder="Enter Department Name" value={name} onChange={(e) => setName(e.target.value)} />
                      {err && <span className="error error_message proxima_nova_semibold">{err}</span>}
                    </div>
                  </div>
                  <div className="download-cancel-btns-main">
                    <div className="download-cancel-btn mb-0">
                      <button type="submit" className="download-btn proxima_nova_semibold w-100" disabled={create.isPending}>
                        Create Department
                        {create.isPending && <img className="loader" style={{ display: 'inline' }} src="/assets/admin/images/white_loader.gif" alt="" />}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="offcanvas offcanvas-end daily-work-data-download" tabIndex={-1} id="edit-toggle-right" data-bs-scroll="true" style={{ height: '100vh' }}>
            <div className="offcanvas-header">
              <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close" style={{ cursor: 'pointer' }}>
                <I.I9dae93 />
              </div>
            </div>
            <div className="offcanvas-body overflow-auto">
              <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main">Edit Department</h5>
              <hr />
              <div className="filter-sub-sec">
                <form onSubmit={submitEdit}>
                  <div className="edit_department_inner_form">
                    <div className="daily-work-select">
                      <div className="shift-inner-sub-label-edit">
                        <label className="shift-type-label">Department Name</label>
                        <input type="text" className="form-control shift-edit-input" placeholder="Enter Department Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                        {editErr && <span className="error error_message proxima_nova_semibold">{editErr}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="download-cancel-btns-main">
                    <div className="download-cancel-btn mb-0">
                      <button type="submit" className="download-btn edit_button proxima_nova_semibold w-100" disabled={update.isPending}>
                        Edit Department
                        {update.isPending && <img className="loader" style={{ display: 'inline' }} src="/assets/admin/images/white_loader.gif" alt="" />}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="offcanvas offcanvas-end daily-work-data-download" tabIndex={-1} id="deleteModal" data-bs-scroll="true" style={{ height: '100vh' }}>
            <div className="offcanvas-header">
              <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close" style={{ cursor: 'pointer' }}>
                <I.I9dae93 />
              </div>
            </div>
            <div className="offcanvas-body overflow-auto">
              <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main">Delete Department</h5>
              <hr />
              <div className="staff_view_delete_title">
                <h5>Are you sure to delete this department?</h5>
              </div>
              <div className="filter-sub-sec">
                <div className="download-cancel-btns-main">
                  <div className="download-cancel-btn mb-0">
                    <button type="button" className="download-btn proxima_nova_semibold w-100 delete_department_btn" disabled={remove.isPending} onClick={() => deleteId && remove.mutate(deleteId)}>
                      Delete
                    </button>
                    <button type="button" className="download-btn proxima_nova_semibold w-100 cancel_modal" data-bs-dismiss="offcanvas" aria-label="Close">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const actionDots = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9.9 15.7508C9.9 15.9993 9.69853 16.2008 9.45 16.2008C9.20147 16.2008 9 15.9993 9 15.7508C9 15.5023 9.20147 15.3008 9.45 15.3008C9.69853 15.3008 9.9 15.5023 9.9 15.7508" stroke="#050E17" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.9 3.14922C9.9 3.39775 9.69853 3.59922 9.45 3.59922C9.20147 3.59922 9 3.39775 9 3.14922C9 2.90069 9.20147 2.69922 9.45 2.69922C9.69853 2.69922 9.9 2.90069 9.9 3.14922" stroke="#050E17" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.9 9.45C9.9 9.69853 9.69853 9.9 9.45 9.9C9.20147 9.9 9 9.69853 9 9.45C9 9.20147 9.20147 9 9.45 9C9.69853 9 9.9 9.20147 9.9 9.45" stroke="#050E17" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
