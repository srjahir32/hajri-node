'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { useAction, useAdmin } from '@/lib/query';
import { esc } from '@/lib/bs';
import { confirmSwal } from '@/lib/swal';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { DataTable } from '@/components/widgets/DataTable';

interface Row { id: number; name: string; phone_number: string | null; photo: string | null; department: string | null; assigned: boolean }

export default function Body() {
  const id = Number(useParams<{ id: string }>().id);
  const { business } = useAdminSession();
  const prefix = (business?.name ?? '').slice(0, 3);
  const all = useAdmin<Row[]>(`/admin/shifts/${id}/staff`).data?.data ?? [];
  const [search, setSearch] = useState('');
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((s) => s.assigned && (!q || `${s.name} ${s.phone_number ?? ''}`.toLowerCase().includes(q)));
  }, [all, search]);
  const remove = useAction((sid: number) => adminApi.post(`/admin/shifts/${id}/unassign`, { staff_ids: [sid] }), { invalidate: ['/admin/shifts'], success: 'Staff has been removed' });
  const total = all.filter((s) => s.assigned).length;
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title={`Assign Staff (${total})`} crumbs={['Settings', 'Attendance Settings', 'Shift Settings', 'Edit Shift', 'Assigned Staff']} />
          <div>
            <div className="approve-datas">
              <div className="approve-data-search assign-data-search col-md-6 col-sm-6">
                <form onSubmit={(e) => e.preventDefault()}>
                  <input className="input-search-rounded" type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                </form>
              </div>
            </div>
            <div className="approve_staff_data">
              <DataTable
                id="staff_datas"
                deps={[rows]}
                head={<tr><th>Staff Name</th><th>Staff ID</th><th>Phone Number</th><th>Action</th></tr>}
                options={() => ({
                  data: rows,
                  searching: false,
                  lengthChange: false,
                  info: false,
                  responsive: true,
                  order: [],
                  columns: [
                    { data: 'name', render: (d: string, _t: string, r: Row) => `<a href="/staff/staff-profile-new/${r.id}" class="staff-edit"><div class="user-images"><div><img src="${esc(r.photo ?? '/assets/admin/images/dummy/dummy-user.svg')}" class="approve-user-img" alt=""></div><div>${esc(d)}<p class="data-sub-field">${esc(r.department ?? '')}</p></div></div></a>` },
                    { data: 'id', render: (d: number) => `${esc(prefix)}${d}` },
                    { data: 'phone_number', render: (d: string | null) => esc(d ?? '') },
                    { data: null, orderable: false, render: (_d: unknown, _t: string, r: Row) => `<a href="#" class="text-danger" data-remove="${r.id}">Remove</a>` },
                  ],
                })}
                onReady={(_api, box, $) => {
                  const h = async function (this: HTMLElement, e: Event) {
                    e.preventDefault();
                    if (await confirmSwal({ title: 'Are you sure?', text: 'Do you want to remove this staff', confirmText: 'Yes, remove' })) remove.mutate(Number(this.dataset.remove));
                  };
                  $(box).on('click', '[data-remove]', h);
                  return () => $(box).off('click', '[data-remove]', h);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
