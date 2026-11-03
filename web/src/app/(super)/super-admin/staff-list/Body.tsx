'use client';

import { superApi } from '@/lib/api';
import { useAction, useSuper } from '@/lib/query';
import { esc } from '@/lib/bs';
import { fmtDate } from '@/lib/format';
import { confirmSwal } from '@/lib/swal';
import { SuperList } from '@/components/super/SuperList';

interface S { id: number; name: string; phone: string; email: string | null; business: { id: number; name: string } | null; department: string | null; is_deactivated: boolean; created_at: string }

export default function Body() {
  const q = useSuper<S[]>('/super-admin/staff', { size: 1000 });
  const rows = q.data?.data ?? [];
  const companies = [...new Map(rows.filter((r) => r.business).map((r) => [r.business!.id, r.business!.name])).entries()];
  const remove = useAction((id: number) => superApi.del(`/super-admin/staff/${id}`), { invalidate: ['/super-admin/staff'], success: 'Staff deleted successfully' });
  return (
    <SuperList<S>
      title="Staff Management"
      searchPlaceholder="Search staff..."
      rows={rows}
      loading={q.isLoading}
      tableId="staff_datas"
      searchText={(r) => `${r.name} ${r.phone} ${r.email ?? ''} ${r.business?.name ?? ''}`}
      name={(r) => r.name}
      created={(r) => r.created_at}
      filters={[
        { key: 'company', options: [{ value: '', label: 'All Companies' }, ...companies.map(([id, n]) => ({ value: String(id), label: n }))], match: (r, v) => String(r.business?.id) === v },
        { key: 'status', options: [{ value: '', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'deactive', label: 'Deactive' }], match: (r, v) => (v === 'active' ? !r.is_deactivated : r.is_deactivated) },
      ]}
      head={<tr><th>Name</th><th>Email</th><th>Phone Number</th><th>Company Name</th><th>Status</th><th>Created Date</th><th>Action</th></tr>}
      columns={[
        { data: 'name', render: (d: string, _t: string, r: S) => `<a href="/super-admin/staff-profile/${r.id}">${esc(d)}</a>` },
        { data: 'email', render: (d: string | null) => esc(d ?? '-') },
        { data: 'phone' },
        { data: 'business', render: (d: { id: number; name: string } | null) => (d ? `<a href="/super-admin/business/${d.id}">${esc(d.name)}</a>` : '-') },
        { data: 'is_deactivated', render: (d: boolean) => `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${d ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}">${d ? 'Deactive' : 'Active'}</span>` },
        { data: 'created_at', render: (d: string) => fmtDate(d) },
        { data: null, orderable: false, render: (_d: unknown, _t: string, r: S) => `<a href="/super-admin/staff-profile/${r.id}" title="View"><i class="fas fa-eye"></i></a> <a href="#" data-del="${r.id}" class="text-danger ms-2" title="Delete"><i class="fas fa-trash"></i></a>` },
      ]}
      onReady={(_api, box, $) => {
        const h = async function (this: HTMLElement, e: Event) {
          e.preventDefault();
          if (await confirmSwal({ title: 'Delete staff?', text: 'This cannot be undone.', confirmText: 'Delete' })) remove.mutate(Number(this.dataset.del));
        };
        $(box).on('click', '[data-del]', h);
        return () => $(box).off('click', '[data-del]', h);
      }}
    />
  );
}
