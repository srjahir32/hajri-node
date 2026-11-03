'use client';

import { useSuper } from '@/lib/query';
import { superApi } from '@/lib/api';
import { esc } from '@/lib/bs';
import { toast } from '@/lib/toast';
import { SuperList } from '@/components/super/SuperList';

interface P { id: number; user: { name: string | null; phoneNumber: string }; gateway: string; plan: string; seats: number; event_type: string; order_id: string | null; payment_id: string | null; amount: number; currency: string; status: string | null; created_at: string }
const PILL = (s: string) => (['success', 'paid', 'successful'].includes(s) ? 'pill-green' : s === 'pending' ? 'pill-yellow' : 'pill-red');
const dt = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

export default function Body() {
  const q = useSuper<P[]>('/super-admin/payments', { size: 500 });
  const exportAll = async () => {
    try {
      await superApi.download('/super-admin/payments/export', undefined, 'payments.xlsx');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed');
    }
  };
  return (
    <SuperList<P>
      title="Subscription Payments"
      searchPlaceholder="Search by name, email, order ID..."
      rows={q.data?.data ?? []}
      loading={q.isLoading}
      tableId="sub_payments_data"
      searchText={(r) => `${r.user.name ?? ''} ${r.user.phoneNumber} ${r.order_id ?? ''} ${r.payment_id ?? ''}`}
      name={(r) => r.user.name ?? ''}
      created={(r) => r.created_at}
      sortable={false}
      headerExtra={<button className="staff-manage-summary-btn" onClick={() => void exportAll()}>Export</button>}
      filters={[{ key: 'status', options: [{ value: '', label: 'All Status' }, { value: 'success', label: 'Success' }, { value: 'pending', label: 'Pending' }, { value: 'failed', label: 'Failed' }], match: (r, v) => { const s = (r.status ?? '').toLowerCase(); return v === 'success' ? ['success', 'paid', 'successful'].includes(s) : v === 'pending' ? s === 'pending' : !['success', 'paid', 'successful', 'pending'].includes(s); } }]}
      head={<tr><th>#</th><th>User</th><th>Plan</th><th>Event</th><th>Payment Method</th><th>Amount</th><th>Status</th><th>Order ID</th><th>Payment ID</th><th>Date &amp; Time</th></tr>}
      columns={[
        { data: 'id' },
        { data: 'user', render: (u: P['user']) => `<strong>${esc(u.name ?? '-')}</strong><p class="owner-sub">${esc(u.phoneNumber)}</p>` },
        { data: 'plan', render: (d: string) => esc(d) },
        { data: 'event_type', render: (d: string) => esc(d.replaceAll('_', ' ').toLowerCase()) },
        { data: 'gateway', render: (d: string) => esc(d) },
        { data: null, render: (_d: unknown, _t: string, r: P) => `${r.currency === 'USD' ? '$' : '₹'}${r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        { data: 'status', render: (d: string | null) => `<span class="pill ${PILL((d ?? '').toLowerCase())}">${esc(d ?? '-')}</span>` },
        { data: 'order_id', render: (d: string | null) => esc(d ?? '-') },
        { data: 'payment_id', render: (d: string | null) => esc(d ?? '-') },
        { data: 'created_at', render: (d: string) => dt(d) },
      ]}
    />
  );
}
