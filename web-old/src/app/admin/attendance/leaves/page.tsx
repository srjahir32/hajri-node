'use client';

import { Check, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { AddLeaveModal } from '@/components/attendance/Modals';
import { Button } from '@/components/ui/Button';
import { Badge, Card, PageHeader } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { Checkbox } from '@/components/ui/Field';
import { Avatar, EmptyState, ErrorState, Pagination, SearchInput, TableSkeleton, Tabs } from '@/components/ui/Misc';
import { Table, TableWrap, Td, Th, THead, Tr } from '@/components/ui/Table';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { fmtDate } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import { useAction, useAdmin } from '@/lib/query';
import type { LeaveDto, Pagination as Pg } from '@/lib/types';

export default function LeavesPage() {
  const { can } = useAdminSession();
  const [tab, setTab] = useState<'0' | '1' | '2'>('0');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const q = useDebounced(search);
  const [ask, dialog] = useConfirm();

  const list = useAdmin<LeaveDto[]>('/admin/attendance/leaves', { status: tab, search: q, page, per_page: 25 }, { keepPrevious: true });
  const staff = useAdmin<{ id: number; full_name: string }[]>(adding ? '/admin/staff' : null, { per_page: 500 });
  const meta = list.data as unknown as Pg | undefined;
  const decide = useAction((v: { ids: number[]; action: 'approve' | 'reject' }) => adminApi.post('/admin/attendance/leaves/decide', v), { invalidate: ['/admin/attendance', '/admin/dashboard', '/admin/payroll'], onSuccess: () => setPicked([]) });
  const cancel = useAction((id: number) => adminApi.del(`/admin/attendance/leaves/${id}`), { invalidate: ['/admin/attendance'] });
  const rows = list.data?.data ?? [];
  const pending = tab === '0';
  const canDecide = can('approve_leave', 'rejected_leave');

  return (
    <>
      <PageHeader title="Leaves" subtitle="Leave requests and balances" actions={can('view_leave_management') && <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>Add leave</Button>} />
      <Card>
        <div className="space-y-4 p-4">
          <Tabs value={tab} onChange={(t) => { setTab(t); setPage(1); setPicked([]); }} tabs={[{ id: '0', label: 'Pending' }, { id: '1', label: 'Approved' }, { id: '2', label: 'Rejected' }]} />
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search staff" className="w-full sm:w-72" />
            {pending && canDecide && picked.length > 0 && (
              <>
                <Button size="sm" variant="success" icon={<Check className="size-4" />} loading={decide.isPending} onClick={() => decide.mutate({ ids: picked, action: 'approve' })}>Approve {picked.length}</Button>
                <Button size="sm" variant="danger" icon={<X className="size-4" />} loading={decide.isPending} onClick={() => decide.mutate({ ids: picked, action: 'reject' })}>Reject {picked.length}</Button>
              </>
            )}
          </div>
        </div>
        {list.error ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> : !list.data ? <TableSkeleton cols={6} /> : rows.length === 0 ? <EmptyState title="No leave requests" /> : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <tr>
                    {pending && canDecide && <Th><Checkbox aria-label="Select all" checked={rows.every((r) => picked.includes(r.id))} onChange={(e) => setPicked(e.target.checked ? rows.map((r) => r.id) : [])} /></Th>}
                    <Th>Staff</Th><Th>Dates</Th><Th>Type</Th><Th>Pay</Th><Th>Reason</Th><Th />
                  </tr>
                </THead>
                <tbody>
                  {rows.map((l) => (
                    <Tr key={l.id}>
                      {pending && canDecide && <Td><Checkbox aria-label={`Select leave ${l.id}`} checked={picked.includes(l.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, l.id] : p.filter((x) => x !== l.id)))} /></Td>}
                      <Td><span className="flex items-center gap-2"><Avatar name={l.staff?.name} src={l.staff?.photo} size={28} /><span>{l.staff?.name}<span className="block text-xs text-muted">{l.staff?.department}</span></span></span></Td>
                      <Td className="whitespace-nowrap">{fmtDate(l.start_date)}{l.end_date !== l.start_date && ` – ${fmtDate(l.end_date)}`}</Td>
                      <Td>{l.leave_type}{l.shift_type && <span className="block text-xs text-muted">{l.shift_type}</span>}</Td>
                      <Td>{l.is_unpaid ? <Badge tone="warning">Unpaid</Badge> : <Badge tone="success">Paid</Badge>}</Td>
                      <Td className="max-w-64 truncate text-muted" title={l.reason ?? ''}>{l.reason}</Td>
                      <Td align="right">
                        <span className="inline-flex gap-1.5">
                          {pending && canDecide && (
                            <>
                              <Button size="sm" variant="success" aria-label="Approve" onClick={() => decide.mutate({ ids: [l.id], action: 'approve' })}><Check className="size-4" /></Button>
                              <Button size="sm" variant="danger" aria-label="Reject" onClick={() => decide.mutate({ ids: [l.id], action: 'reject' })}><X className="size-4" /></Button>
                            </>
                          )}
                          {tab === '1' && can('view_leave_management') && (
                            <Button size="sm" variant="secondary" onClick={() => ask({ title: 'Cancel this leave?', message: 'The days become regular working days again.', confirmLabel: 'Cancel leave', onConfirm: () => cancel.mutateAsync(l.id) })}>Cancel</Button>
                          )}
                        </span>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
            <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} total={meta?.total} onChange={setPage} />
          </>
        )}
      </Card>
      {adding && <AddLeaveModal open onClose={() => setAdding(false)} staff={(staff.data?.data ?? []).map((s) => ({ id: s.id, name: s.full_name }))} />}
      {dialog}
    </>
  );
}
