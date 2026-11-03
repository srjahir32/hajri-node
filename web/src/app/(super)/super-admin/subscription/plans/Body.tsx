'use client';

import { useSuper } from '@/lib/query';
import { esc } from '@/lib/bs';
import { fmtDate } from '@/lib/format';
import { SuperList } from '@/components/super/SuperList';

interface P { id: number; plan_label: string; billing_cycle: string; seats: number; total_amount: number; currency: string; status: string; payment_method: string; starts_at: string | null; expires_at: string | null; created_at: string; user: { name: string | null; phoneNumber: string; email: string | null } }
const PILL: Record<string, string> = { active: 'pill-green', pending: 'pill-yellow', expired: 'pill-red', cancelled: 'pill-red', failed: 'pill-red' };

export default function Body() {
  const q = useSuper<P[]>('/super-admin/subscriptions', { size: 500 });
  return (
    <SuperList<P>
      title="Subscription Plans"
      searchPlaceholder="Search by name, email, plan..."
      rows={q.data?.data ?? []}
      loading={q.isLoading}
      tableId="sub_plans_data"
      searchText={(r) => `${r.user.name ?? ''} ${r.user.email ?? ''} ${r.user.phoneNumber} ${r.plan_label}`}
      name={(r) => r.user.name ?? ''}
      created={(r) => r.created_at}
      sortable={false}
      filters={[{ key: 'status', options: [{ value: '', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'expired', label: 'Expired' }, { value: 'inactive', label: 'Inactive' }], match: (r, v) => (v === 'inactive' ? ['cancelled', 'failed'].includes(r.status) : r.status === v) }]}
      head={<tr><th>#</th><th>User</th><th>Plan</th><th>Billing Cycle</th><th>Seats</th><th>Amount</th><th>Status</th><th>Payment Method</th><th>Starts At</th><th>Expires At</th><th>Created</th></tr>}
      columns={[
        { data: 'id' },
        { data: 'user', render: (u: P['user']) => `<strong>${esc(u.name ?? '-')}</strong><p class="owner-sub">${esc(u.email ?? u.phoneNumber)}</p>` },
        { data: 'plan_label' },
        { data: 'billing_cycle', render: (d: string) => d[0].toUpperCase() + d.slice(1) },
        { data: 'seats' },
        { data: null, render: (_d: unknown, _t: string, r: P) => `${r.currency === 'USD' ? '$' : '₹'}${r.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        { data: 'status', render: (d: string) => `<span class="pill ${PILL[d] ?? 'pill-yellow'}">${d[0].toUpperCase() + d.slice(1)}</span>` },
        { data: 'payment_method', render: (d: string) => esc(d) },
        { data: 'starts_at', render: (d: string | null) => (d ? fmtDate(d) : '-') },
        { data: 'expires_at', render: (d: string | null) => (d ? fmtDate(d) : '-') },
        { data: 'created_at', render: (d: string) => fmtDate(d) },
      ]}
    />
  );
}
