'use client';

import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { BackToSettings } from '@/components/settings/BackLink';
import { Button, LinkButton } from '@/components/ui/Button';
import { Badge, Card, CardBody, PageHeader } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Misc';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import type { Shift } from '@/lib/types';

export default function ShiftsPage() {
  const list = useAdmin<Shift[]>('/admin/shifts');
  const [ask, dialog] = useConfirm();
  const remove = useAction((id: number) => adminApi.del(`/admin/shifts/${id}`), { invalidate: ['/admin/shifts'] });
  return (
    <>
      <PageHeader back={<BackToSettings />} title="Shifts" subtitle="Assign a shift to every staff member" actions={<LinkButton href="/admin/settings/shifts/new" icon={<Plus className="size-4" />}>New shift</LinkButton>} />
      {list.error ? <Card><ErrorState message={list.error.message} /></Card> : !list.data ? <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-36" /><Skeleton className="h-36" /></div> : list.data.data.length === 0 ? <Card><EmptyState title="No shifts" /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.data.data.map((s) => (
            <Card key={s.id}>
              <CardBody>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/admin/settings/shifts/${s.id}`} className="text-base font-semibold hover:text-brand">{s.name}</Link>
                    <p className="mt-0.5 text-sm text-muted">{s.staff_count} staff assigned</p>
                  </div>
                  <Badge tone={s.shift_type_id === 1 ? 'brand' : s.shift_type_id === 2 ? 'warning' : 'info'}>{s.shift_type}</Badge>
                </div>
                <ul className="space-y-1 text-sm">
                  {s.details.map((d) => (
                    <li key={d.id} className="flex justify-between text-muted">
                      <span>{d.name ?? (s.shift_type_id === 3 ? 'Any time' : 'Shift')}{d.start_time && ` · ${d.start_time.slice(0, 5)}–${d.end_time?.slice(0, 5)}`}</span>
                      <span className="tnum">{d.total_payable_hours}h</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex gap-2">
                  <LinkButton href={`/admin/settings/shifts/${s.id}`} variant="secondary" size="sm">Edit & assign</LinkButton>
                  <Button size="sm" variant="ghost" className="text-danger" icon={<Trash2 className="size-4" />} onClick={() => ask({ title: `Delete ${s.name}?`, message: 'Only shifts without assigned staff can be deleted.', confirmLabel: 'Delete', onConfirm: () => remove.mutateAsync(s.id) })}>Delete</Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      {dialog}
    </>
  );
}
