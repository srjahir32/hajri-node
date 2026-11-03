'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { SuperList } from '@/components/ui/Lists';
import { Td, Tr } from '@/components/ui/Table';
import { fmtDate, fmtMoney } from '@/lib/format';

interface S { id: number; plan_label: string; seats: number; total_amount: number; currency: string; status: string; payment_method: string; expires_at: string | null; created_at: string; user: { name: string | null; phoneNumber: string } }

export default function SuperSubscriptionsPage() {
  const [status, setStatus] = useState('');
  return (
    <>
      <PageHeader title="Subscriptions" />
      <SuperList<S>
        path="/super-admin/subscriptions"
        extraQuery={{ status }}
        searchPlaceholder="Search customer"
        toolbar={<Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44" aria-label="Status"><option value="">All statuses</option>{['active', 'pending', 'cancelled', 'failed', 'expired', 'payment_failed'].map((s) => <option key={s}>{s}</option>)}</Select>}
        columns={[{ label: 'Customer' }, { label: 'Plan' }, { label: 'Seats', align: 'right' }, { label: 'Amount', align: 'right' }, { label: 'Gateway' }, { label: 'Status' }, { label: 'Expires' }]}
        row={(s) => (
          <Tr key={s.id}>
            <Td className="font-medium">{s.user.name ?? '—'}<span className="block text-xs font-normal text-muted">{s.user.phoneNumber}</span></Td>
            <Td>{s.plan_label}</Td>
            <Td align="right" className="tnum">{s.seats}</Td>
            <Td align="right" className="tnum">{fmtMoney(s.total_amount, s.currency)}</Td>
            <Td className="text-muted">{s.payment_method}</Td>
            <Td><StatusBadge status={s.status} /></Td>
            <Td className="text-muted">{s.expires_at ? fmtDate(s.expires_at) : '—'}</Td>
          </Tr>
        )}
      />
    </>
  );
}
