'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeader, StatusBadge } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { SuperList } from '@/components/ui/Lists';
import { Td, Tr } from '@/components/ui/Table';
import { fmtDate } from '@/lib/format';

interface B { id: number; name: string; category: string | null; city: string | null; is_active: boolean; staff_count: number; owner: { name: string | null; phone: string; trial_ends_at: string | null } | null; created_at: string }

export default function BusinessesPage() {
  const [status, setStatus] = useState('');
  return (
    <>
      <PageHeader title="Businesses" />
      <SuperList<B>
        path="/super-admin/businesses"
        extraQuery={{ status }}
        searchPlaceholder="Search business, owner or phone"
        columns={[{ label: 'Business' }, { label: 'Owner' }, { label: 'City' }, { label: 'Staff', align: 'right' }, { label: 'Trial ends' }, { label: 'Status' }, { label: 'Created' }]}
        toolbar={<Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40" aria-label="Status"><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></Select>}
        row={(b) => (
          <Tr key={b.id}>
            <Td><Link href={`/super-admin/businesses/${b.id}`} className="font-medium hover:text-brand">{b.name}</Link><span className="block text-xs text-muted">{b.category}</span></Td>
            <Td>{b.owner?.name ?? '—'}<span className="block text-xs text-muted">{b.owner?.phone}</span></Td>
            <Td className="text-muted">{b.city ?? '—'}</Td>
            <Td align="right" className="tnum">{b.staff_count}</Td>
            <Td className="text-muted">{b.owner?.trial_ends_at ? fmtDate(b.owner.trial_ends_at) : '—'}</Td>
            <Td><StatusBadge status={b.is_active ? 'Active' : 'Deactivated'} /></Td>
            <Td className="text-muted">{fmtDate(b.created_at)}</Td>
          </Tr>
        )}
      />
    </>
  );
}
