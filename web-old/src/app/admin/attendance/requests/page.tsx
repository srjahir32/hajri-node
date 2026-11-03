'use client';

import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader, StatusBadge } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Field';
import { Avatar, EmptyState, ErrorState, Pagination, TableSkeleton, Tabs } from '@/components/ui/Misc';
import { Table, TableWrap, Td, Th, THead, Tr } from '@/components/ui/Table';
import { adminApi } from '@/lib/api';
import { fmtClock, fmtDate, fmtDateTime, fmtDuration } from '@/lib/format';
import { useAction, useAdmin } from '@/lib/query';
import type { Pagination as Pg, Punch, StaffCard } from '@/lib/types';

type Row = Punch & { request_id: number; requested_at: string; staff: StaffCard };

export default function RequestsPage() {
  const [tab, setTab] = useState<'0' | '1' | '2'>('0');
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<number[]>([]);
  const list = useAdmin<Row[]>('/admin/attendance/requests', { approval: tab, page, per_page: 25 }, { keepPrevious: true });
  const meta = list.data as unknown as Pg | undefined;
  const decide = useAction((v: { ids: number[]; action: 'approve' | 'reject' }) => adminApi.post('/admin/attendance/requests/decide', v), {
    invalidate: ['/admin/attendance', '/admin/dashboard', '/admin/payroll'],
    onSuccess: () => setPicked([]),
  });
  const rows = list.data?.data ?? [];
  const pending = tab === '0';

  return (
    <>
      <PageHeader title="Attendance approvals" subtitle="Punches from remote staff and “forgot to punch” requests" />
      <Card>
        <div className="space-y-4 p-4">
          <Tabs value={tab} onChange={(t) => { setTab(t); setPage(1); setPicked([]); }} tabs={[{ id: '0', label: 'Pending' }, { id: '1', label: 'Approved' }, { id: '2', label: 'Rejected' }]} />
          {pending && picked.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">{picked.length} selected</span>
              <Button size="sm" variant="success" icon={<Check className="size-4" />} loading={decide.isPending} onClick={() => decide.mutate({ ids: picked, action: 'approve' })}>Approve</Button>
              <Button size="sm" variant="danger" icon={<X className="size-4" />} loading={decide.isPending} onClick={() => decide.mutate({ ids: picked, action: 'reject' })}>Reject</Button>
            </div>
          )}
        </div>
        {list.error ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> : !list.data ? <TableSkeleton cols={6} /> : rows.length === 0 ? (
          <EmptyState title={pending ? 'Nothing waiting for approval' : 'No records'} message={pending ? 'New requests from staff will appear here.' : undefined} />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <tr>
                    {pending && <Th><Checkbox aria-label="Select all" checked={rows.every((r) => picked.includes(r.id))} onChange={(e) => setPicked(e.target.checked ? rows.map((r) => r.id) : [])} /></Th>}
                    <Th>Staff</Th><Th>Date</Th><Th>In → Out</Th><Th align="right">Duration</Th><Th>Type</Th><Th>Reason</Th><Th>Requested</Th>{pending ? <Th /> : <Th>Status</Th>}
                  </tr>
                </THead>
                <tbody>
                  {rows.map((r) => (
                    <Tr key={r.request_id}>
                      {pending && <Td><Checkbox aria-label={`Select request ${r.request_id}`} checked={picked.includes(r.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, r.id] : p.filter((x) => x !== r.id)))} /></Td>}
                      <Td><span className="flex items-center gap-2"><Avatar name={r.staff.full_name} src={r.staff.photo} size={28} />{r.staff.full_name}</span></Td>
                      <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
                      <Td className="tnum whitespace-nowrap">{fmtClock(r.in_time)} → {fmtClock(r.out_time)}</Td>
                      <Td align="right" className="tnum">{fmtDuration(r.total_seconds)}</Td>
                      <Td className="text-muted">{r.note ? 'Missed punch' : 'Remote punch'}</Td>
                      <Td className="max-w-56 truncate text-muted" title={r.note ?? ''}>{r.note ?? '—'}</Td>
                      <Td className="whitespace-nowrap text-muted">{fmtDateTime(r.requested_at)}</Td>
                      {pending ? (
                        <Td align="right">
                          <span className="inline-flex gap-1.5">
                            <Button size="sm" variant="success" aria-label="Approve" onClick={() => decide.mutate({ ids: [r.id], action: 'approve' })}><Check className="size-4" /></Button>
                            <Button size="sm" variant="danger" aria-label="Reject" onClick={() => decide.mutate({ ids: [r.id], action: 'reject' })}><X className="size-4" /></Button>
                          </span>
                        </Td>
                      ) : <Td><StatusBadge status={tab === '1' ? 'Approved' : 'Rejected'} /></Td>}
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
            <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} total={meta?.total} onChange={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
