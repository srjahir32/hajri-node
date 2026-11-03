'use client';

import { superApi } from '@/lib/api';
import { useAction, useSuper } from '@/lib/query';
import { esc } from '@/lib/bs';
import { fmtDate } from '@/lib/format';
import { confirmSwal } from '@/lib/swal';
import { SuperList } from '@/components/super/SuperList';

interface B { id: number; name: string; city: string | null; is_active: boolean; staff_count: number; created_at: string; owner: { name: string | null; email: string | null; phone: string; trial_ends_at: string | null } | null }
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6'];

export default function Body() {
  const q = useSuper<B[]>('/super-admin/businesses', { size: 500 });
  const remove = useAction((id: number) => superApi.del(`/super-admin/businesses/${id}`), { invalidate: ['/super-admin/businesses'], success: 'Business deleted successfully' });
  return (
    <SuperList<B>
      title="Business Management"
      searchPlaceholder="Search businesses..."
      rows={q.data?.data ?? []}
      loading={q.isLoading}
      tableId="business_datas"
      searchText={(r) => `${r.name} ${r.owner?.name ?? ''} ${r.owner?.phone ?? ''} ${r.owner?.email ?? ''}`}
      name={(r) => r.name}
      created={(r) => r.created_at}
      filters={[{ key: 'status', prefix: 'Status ', options: [{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], match: (r, v) => (v === 'active' ? r.is_active : !r.is_active) }]}
      head={<tr><th>Business Name</th><th>Owner Details</th><th>Plan</th><th>Active Employees</th><th>Trial / Plan Expiry</th><th>Created Date</th><th>Action</th></tr>}
      columns={[
        { data: 'name', render: (d: string, _t: string, r: B) => `<div class="business-info-cell"><div class="business-avatar" style="background-color: ${COLORS[r.id % COLORS.length]};">${esc(d.charAt(0).toUpperCase())}</div><div><span class="business-name" title="${esc(d)}">${esc(d)}</span><p class="owner-sub">${esc(r.city ?? '')}</p></div></div>` },
        { data: null, render: (_d: unknown, _t: string, r: B) => `<span class="owner-name">${esc(r.owner?.name ?? '-')}</span><p class="owner-sub">${esc(r.owner?.phone ?? '')}</p><p class="owner-sub" style="font-size: 11px; opacity: 0.85;">${esc(r.owner?.email ?? '')}</p>` },
        { data: 'is_active', render: (d: boolean) => `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${d ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}">${d ? 'Active' : 'Inactive'}</span>` },
        { data: 'staff_count' },
        { data: null, render: (_d: unknown, _t: string, r: B) => (r.owner?.trial_ends_at ? fmtDate(r.owner.trial_ends_at) : '-') },
        { data: 'created_at', render: (d: string) => `<span class="text-gray-900" style="white-space: nowrap;">${fmtDate(d)}</span>` },
        { data: null, orderable: false, render: (_d: unknown, _t: string, r: B) => `<a href="/super-admin/business/${r.id}" title="View"><i class="fas fa-eye"></i></a> <a href="#" data-del="${r.id}" class="text-danger ms-2" title="Delete"><i class="fas fa-trash"></i></a>` },
      ]}
      onReady={(_api, box, $) => {
        const h = async function (this: HTMLElement, e: Event) {
          e.preventDefault();
          if (await confirmSwal({ title: 'Delete business?', text: 'This removes the business and its staff.', confirmText: 'Delete' })) remove.mutate(Number(this.dataset.del));
        };
        $(box).on('click', '[data-del]', h);
        return () => $(box).off('click', '[data-del]', h);
      }}
    />
  );
}
