'use client';

import { superApi } from '@/lib/api';
import { useAction, useSuper } from '@/lib/query';
import { esc } from '@/lib/bs';
import { fmtDate } from '@/lib/format';
import { SuperList } from '@/components/super/SuperList';

interface U { id: number; name: string | null; email: string | null; phone: string; is_sub_admin: boolean; is_active: boolean; businesses: { id: number; name: string }[]; created_at: string }

export default function Body() {
  const q = useSuper<U[]>('/super-admin/users', { size: 500 });
  const toggle = useAction((id: number) => superApi.post(`/super-admin/users/${id}/toggle-status`), { invalidate: ['/super-admin/users'] });
  return (
    <SuperList<U>
      title="Business Owners"
      searchPlaceholder="Search users..."
      rows={(q.data?.data ?? []).filter((u) => !u.is_sub_admin)}
      loading={q.isLoading}
      tableId="users_datas"
      searchText={(r) => `${r.name ?? ''} ${r.email ?? ''} ${r.phone}`}
      name={(r) => r.name ?? ''}
      created={(r) => r.created_at}
      filters={[{ key: 'reg', options: [{ value: '', label: 'All Users' }, { value: 'registered', label: 'Registered' }, { value: 'incomplete', label: 'Incomplete' }], match: (r, v) => (v === 'registered' ? r.businesses.length > 0 : r.businesses.length === 0) }]}
      head={<tr><th>Name</th><th>Email</th><th>Phone Number</th><th>Business(es)</th><th>Status</th><th>Created Date</th><th>Action</th></tr>}
      columns={[
        { data: 'name', render: (d: string | null) => esc(d ?? '-') },
        { data: 'email', render: (d: string | null) => (d ? `<span style="text-transform: none !important;">${esc(d)}</span>` : '-') },
        { data: 'phone' },
        { data: 'businesses', render: (d: { id: number; name: string }[]) => (d.length ? d.map((b) => `<a href="/super-admin/business/${b.id}">${esc(b.name)}</a>`).join(', ') : '-') },
        { data: 'businesses', render: (d: unknown[]) => `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${d.length ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}">${d.length ? 'Registered' : 'Incomplete'}</span>` },
        { data: 'created_at', render: (d: string) => fmtDate(d) },
        { data: null, orderable: false, render: (_d: unknown, _t: string, r: U) => `<a href="#" data-toggle="${r.id}">${r.is_active ? 'Deactivate' : 'Activate'}</a>` },
      ]}
      onReady={(_api, box, $) => {
        const h = function (this: HTMLElement, e: Event) {
          e.preventDefault();
          toggle.mutate(Number(this.dataset.toggle));
        };
        $(box).on('click', '[data-toggle]', h);
        return () => $(box).off('click', '[data-toggle]', h);
      }}
    />
  );
}
