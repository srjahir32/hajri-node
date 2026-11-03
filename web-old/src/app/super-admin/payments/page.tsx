'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { PageHeader, StatusBadge } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { SuperList } from '@/components/ui/Lists';
import { Td, Tr } from '@/components/ui/Table';
import { superApi } from '@/lib/api';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { errMsg } from '@/lib/query';

interface P { id: number; user: { name: string | null; phoneNumber: string } | null; gateway: string | null; plan: string | null; event_type: string; payment_id: string | null; amount: number | null; currency: string; status: string | null; created_at: string }

export default function PaymentsPage() {
  const [gateway, setGateway] = useState('');
  return (
    <>
      <PageHeader title="Payments" actions={<Button variant="secondary" icon={<Download className="size-4" />} onClick={() => void superApi.download('/super-admin/payments/export', undefined, 'payments.xlsx').catch((e) => toast.error(errMsg(e)))}>Export Excel</Button>} />
      <SuperList<P>
        path="/super-admin/payments"
        extraQuery={{ gateway }}
        searchPlaceholder="Search"
        toolbar={<Select value={gateway} onChange={(e) => setGateway(e.target.value)} className="w-44" aria-label="Gateway"><option value="">All gateways</option><option value="cashfree">Cashfree</option><option value="kelviq">Kelviq</option></Select>}
        columns={[{ label: 'Date' }, { label: 'Customer' }, { label: 'Gateway' }, { label: 'Event' }, { label: 'Reference' }, { label: 'Amount', align: 'right' }, { label: 'Status' }]}
        row={(p) => (
          <Tr key={p.id}>
            <Td className="whitespace-nowrap text-muted">{fmtDateTime(p.created_at)}</Td>
            <Td>{p.user?.name ?? '—'}<span className="block text-xs text-muted">{p.user?.phoneNumber}</span></Td>
            <Td>{p.gateway ?? '—'}</Td>
            <Td className="text-muted">{p.event_type.replace(/_/g, ' ').toLowerCase()}</Td>
            <Td className="max-w-40 truncate text-muted">{p.payment_id}</Td>
            <Td align="right" className="tnum">{p.amount ? fmtMoney(p.amount, p.currency) : '—'}</Td>
            <Td><StatusBadge status={p.status} /></Td>
          </Tr>
        )}
      />
    </>
  );
}
