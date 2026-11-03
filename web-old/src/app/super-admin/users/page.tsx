'use client';

import { PageHeader, Badge, StatusBadge } from '@/components/ui/Card';
import { SuperList } from '@/components/ui/Lists';
import { Td, Tr } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { superApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { useAction } from '@/lib/query';

interface U { id: number; name: string | null; email: string | null; phone: string; is_sub_admin: boolean; role: string | null; is_active: boolean; trial_ends_at: string | null; businesses: { id: number; name: string }[]; last_login_at: string | null; created_at: string }

export default function UsersPage() {
  const toggle = useAction((id: number) => superApi.post(`/super-admin/users/${id}/toggle-status`), { invalidate: ['/super-admin/users'] });
  return (
    <>
      <PageHeader title="Owners & admin users" />
      <SuperList<U>
        path="/super-admin/users"
        searchPlaceholder="Search name, phone or email"
        columns={[{ label: 'User' }, { label: 'Phone' }, { label: 'Type' }, { label: 'Businesses' }, { label: 'Last login' }, { label: 'Status' }, { label: '' }]}
        row={(u) => (
          <Tr key={u.id}>
            <Td><span className="font-medium">{u.name ?? '—'}</span><span className="block text-xs text-muted">{u.email}</span></Td>
            <Td className="tnum text-muted">{u.phone}</Td>
            <Td>{u.is_sub_admin ? <Badge tone="info">Admin · {u.role ?? 'no role'}</Badge> : <Badge tone="brand">Owner</Badge>}</Td>
            <Td className="text-muted">{u.businesses.map((b) => b.name).join(', ') || '—'}</Td>
            <Td className="text-muted">{u.last_login_at ? fmtDate(u.last_login_at) : 'Never'}</Td>
            <Td><StatusBadge status={u.is_active ? 'Active' : 'Deactivated'} /></Td>
            <Td align="right"><Button size="sm" variant="ghost" onClick={() => toggle.mutate(u.id)}>{u.is_active ? 'Deactivate' : 'Activate'}</Button></Td>
          </Tr>
        )}
      />
    </>
  );
}
