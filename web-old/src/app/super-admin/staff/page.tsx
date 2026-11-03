'use client';

import { PageHeader, StatusBadge } from '@/components/ui/Card';
import { SuperList } from '@/components/ui/Lists';
import { Td, Tr } from '@/components/ui/Table';
import { fmtDate } from '@/lib/format';
import Link from 'next/link';

interface S { id: number; name: string; phone: string; email: string | null; business: { id: number; name: string }; department: string | null; is_deactivated: boolean; created_at: string }

export default function SuperStaffPage() {
  return (
    <>
      <PageHeader title="All staff" />
      <SuperList<S>
        path="/super-admin/staff"
        searchPlaceholder="Search name, phone or business"
        columns={[{ label: 'Name' }, { label: 'Phone' }, { label: 'Business' }, { label: 'Department' }, { label: 'Status' }, { label: 'Added' }]}
        row={(s) => (
          <Tr key={s.id}>
            <Td className="font-medium">{s.name}<span className="block text-xs font-normal text-muted">{s.email}</span></Td>
            <Td className="tnum text-muted">{s.phone}</Td>
            <Td><Link href={`/super-admin/businesses/${s.business.id}`} className="hover:text-brand">{s.business.name}</Link></Td>
            <Td className="text-muted">{s.department ?? '—'}</Td>
            <Td><StatusBadge status={s.is_deactivated ? 'Deactivated' : 'Active'} /></Td>
            <Td className="text-muted">{fmtDate(s.created_at)}</Td>
          </Tr>
        )}
      />
    </>
  );
}
