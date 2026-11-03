'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader, StatusBadge } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { Checkbox, Input, Select } from '@/components/ui/Field';
import { Avatar, EmptyState, ErrorState, Pagination, SearchInput, TableSkeleton } from '@/components/ui/Misc';
import { Table, TableWrap, Td, Th, THead, Tr } from '@/components/ui/Table';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { fmtClock, fmtDate, fmtDuration, todayStr } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import { useAction, useAdmin } from '@/lib/query';
import type { Pagination as Pg, Punch, StaffCard } from '@/lib/types';

type Row = Punch & { staff: StaffCard };
const APPROVAL = ['Pending', 'Approved', 'Rejected'];

export default function PunchesPage() {
  const { can } = useAdminSession();
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [approval, setApproval] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<number[]>([]);
  const q = useDebounced(search);
  const [ask, dialog] = useConfirm();

  const list = useAdmin<Row[]>('/admin/attendance/punches', { from, to, approval, search: q, page, per_page: 25 }, { keepPrevious: true });
  const meta = list.data as unknown as Pg | undefined;
  const del = useAction((ids: number[]) => adminApi.del('/admin/attendance/punches', { ids }), { invalidate: ['/admin/attendance', '/admin/dashboard'], onSuccess: () => setPicked([]) });
  const rows = list.data?.data ?? [];
  const allPicked = rows.length > 0 && rows.every((r) => picked.includes(r.id));

  return (
    <>
      <PageHeader title="Punches" subtitle="Every punch in and out, across all staff" />
      <Card>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <label className="text-sm">From<Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="mt-1 w-40" /></label>
          <label className="text-sm">To<Input type="date" value={to} min={from} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="mt-1 w-40" /></label>
          <Select value={approval} onChange={(e) => { setApproval(e.target.value); setPage(1); }} className="w-40" aria-label="Approval status">
            <option value="">All statuses</option><option value="0">Pending</option><option value="1">Approved</option><option value="2">Rejected</option>
          </Select>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search staff" className="w-full sm:w-64" />
          {can('rejected_punches', 'approve_punches') && picked.length > 0 && (
            <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => ask({ title: `Delete ${picked.length} punch(es)?`, message: 'The punches are removed from reports and payroll.', confirmLabel: 'Delete', onConfirm: () => del.mutateAsync(picked) })}>Delete selected</Button>
          )}
        </div>
        {list.error ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> : !list.data ? <TableSkeleton cols={7} /> : rows.length === 0 ? <EmptyState title="No punches in this range" /> : (
          <>
            <TableWrap>
              <Table>
                <THead><tr><Th><Checkbox aria-label="Select all" checked={allPicked} onChange={(e) => setPicked(e.target.checked ? rows.map((r) => r.id) : [])} /></Th><Th>Date</Th><Th>Staff</Th><Th>In</Th><Th>Out</Th><Th align="right">Duration</Th><Th>Approval</Th><Th>Note</Th></tr></THead>
                <tbody>
                  {rows.map((r) => (
                    <Tr key={r.id}>
                      <Td><Checkbox aria-label={`Select punch ${r.id}`} checked={picked.includes(r.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, r.id] : p.filter((x) => x !== r.id)))} /></Td>
                      <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
                      <Td><span className="flex items-center gap-2"><Avatar name={r.staff.full_name} src={r.staff.photo} size={28} />{r.staff.full_name}</span></Td>
                      <Td className="tnum">{fmtClock(r.in_time)}</Td>
                      <Td className="tnum">{fmtClock(r.out_time)}</Td>
                      <Td align="right" className="tnum">{fmtDuration(r.total_seconds)}</Td>
                      <Td><StatusBadge status={APPROVAL[r.attendance_status]} /> {r.is_manual ? <span className="ml-1 text-xs text-muted">manual</span> : null}</Td>
                      <Td className="max-w-56 truncate text-muted">{r.note}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
            <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} total={meta?.total} onChange={setPage} />
          </>
        )}
      </Card>
      {dialog}
    </>
  );
}
