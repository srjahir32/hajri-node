'use client';

import clsx from 'clsx';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, Pagination, TableSkeleton } from '@/components/ui/Misc';
import { staffApi } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { useAction, useStaff } from '@/lib/query';
import type { NotificationDto, Pagination as Pg } from '@/lib/types';

export default function EmployeeNotificationsPage() {
  const [page, setPage] = useState(1);
  const q = useStaff<NotificationDto[]>('/employee/notifications', { page, per_page: 20 }, { keepPrevious: true });
  const meta = q.data as unknown as (Pg & { unread_count: number }) | undefined;
  const readAll = useAction(() => staffApi.post('/employee/notifications/read-all'), { success: false, invalidate: ['/employee/notifications'] });
  const readOne = useAction((id: number) => staffApi.post(`/employee/notifications/${id}/read`), { success: false, invalidate: ['/employee/notifications'] });
  return (
    <>
      <PageHeader title="Notifications" actions={!!meta?.unread_count && <Button variant="secondary" onClick={() => readAll.mutate()}>Mark all as read</Button>} />
      <Card>
        {q.error ? <ErrorState message={q.error.message} /> : !q.data ? <TableSkeleton cols={1} /> : q.data.data.length === 0 ? <EmptyState icon={<Bell className="size-7" />} title="Nothing here yet" /> : (
          <>
            <ul className="divide-y divide-line">
              {q.data.data.map((n) => (
                <li key={n.id}>
                  <button onClick={() => !n.read && readOne.mutate(n.id)} className={clsx('flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-surface2', !n.read && 'bg-brandsoft/40')}>
                    <span className={clsx('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand')} />
                    <span className="flex-1"><span className="block text-sm font-medium">{n.message ?? n.title}</span><span className="text-xs text-muted">{fmtDateTime(n.created_at)}</span></span>
                  </button>
                </li>
              ))}
            </ul>
            <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} total={meta?.total} onChange={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
