'use client';

import { CalendarPlus, ClipboardEdit, Eye, MessageSquarePlus, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ManualPunchModal, MarkStatusModal, NoteModal } from '@/components/attendance/Modals';
import { Dropdown } from '@/components/layout/Menus';
import { Badge, Card, PageHeader, StatusBadge } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Field';
import { Avatar, EmptyState, ErrorState, SearchInput, TableSkeleton } from '@/components/ui/Misc';
import { Table, TableWrap, Td, Th, THead, Tr } from '@/components/ui/Table';
import { useAdminSession } from '@/lib/auth';
import { fmtClock, fmtDate, fmtDuration, todayStr } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import { useAdmin } from '@/lib/query';
import type { DayCounts, DayRow, Department } from '@/lib/types';
import clsx from 'clsx';

const CHIPS = [
  ['', 'All', 'staff_count'], ['Present', 'Present', 'present_count'], ['Absent', 'Absent', 'absent_count'], ['Half Day', 'Half day', 'halfday_count'],
  ['Late', 'Late', 'late_count'], ['Pending', 'Pending', 'pending_count'], ['Not Marked', 'Not marked', 'not_marked_count'],
] as const;

function DailyAttendance() {
  const { can } = useAdminSession();
  const sp = useSearchParams();
  const [date, setDate] = useState(todayStr());
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const q = useDebounced(search);
  const [modal, setModal] = useState<{ kind: 'status' | 'punch' | 'note'; row: DayRow } | null>(null);

  const res = useAdmin<DayRow[]>('/admin/attendance', { date, search: q, department_id: dept, status }, { keepPrevious: true });
  const counts = (res.data as unknown as { count?: DayCounts } | undefined)?.count;
  const departments = useAdmin<Department[]>('/admin/departments');
  const canEdit = can('approve_punches', 'view_attendance');

  return (
    <>
      <PageHeader title="Daily attendance" subtitle={fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} actions={<Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-44" aria-label="Date" />} />
      <Card>
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {CHIPS.map(([value, label, key]) => (
              <button key={label} onClick={() => setStatus(value)} aria-pressed={status === value} className={clsx('rounded-full border px-3 py-1.5 text-sm transition', status === value ? 'border-brand bg-brandsoft font-medium text-brand' : 'border-line text-muted hover:bg-surface2')}>
                {label} <span className="tnum ml-1 opacity-80">{counts?.[key as keyof DayCounts] ?? '–'}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search staff" className="w-full sm:w-72" />
            <Select value={dept} onChange={(e) => setDept(e.target.value)} className="w-full sm:w-56" aria-label="Department">
              <option value="">All departments</option>
              {departments.data?.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>
        </div>
        {res.error ? <ErrorState message={res.error.message} onRetry={() => void res.refetch()} /> : !res.data ? <TableSkeleton cols={7} /> : res.data.data.length === 0 ? (
          <EmptyState title="No staff match" message="Change the filters or the date." />
        ) : (
          <TableWrap>
            <Table>
              <THead><tr><Th>Staff</Th><Th>Status</Th><Th>In</Th><Th>Out</Th><Th align="right">Worked</Th><Th align="right">Break</Th><Th align="right">Overtime</Th><Th /></tr></THead>
              <tbody>
                {res.data.data.map((r) => (
                  <Tr key={r.id}>
                    <Td>
                      <Link href={`/admin/attendance/${r.id}`} className="flex items-center gap-3 hover:text-brand">
                        <Avatar name={r.full_name} src={r.photo} size={32} />
                        <span><span className="block font-medium">{r.full_name}</span><span className="block text-xs text-muted">{r.department?.name ?? '—'}</span></span>
                      </Link>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={r.status} />
                        {r.behavior === 'Late' && <Badge tone="warning">Late</Badge>}
                        {r.is_leave === 1 && r.status !== 'Leave' && <Badge tone="info">Leave</Badge>}
                      </div>
                    </Td>
                    <Td className="tnum">{fmtClock(r.first_in)}</Td>
                    <Td className="tnum">{fmtClock(r.last_out)}</Td>
                    <Td align="right" className="tnum">{r.total_seconds ? fmtDuration(r.total_seconds) : '—'}</Td>
                    <Td align="right" className="tnum text-muted">{r.break_seconds ? fmtDuration(r.break_seconds) : '—'}</Td>
                    <Td align="right" className="tnum">{r.overtime_seconds ? <span className="text-success">{fmtDuration(r.overtime_seconds)}</span> : '—'}</Td>
                    <Td align="right">
                      <Dropdown width="w-52" trigger={() => <span className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface2" aria-label={`Actions for ${r.full_name}`}><MoreVertical className="size-4" /></span>}>
                        {(close) => (
                          <div className="p-1.5 text-sm">
                            <Link href={`/admin/attendance/${r.id}`} onClick={close} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-surface2"><Eye className="size-4" /> View month</Link>
                            {canEdit && (
                              <>
                                <button onClick={() => { close(); setModal({ kind: 'status', row: r }); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-surface2"><ClipboardEdit className="size-4" /> Mark status</button>
                                <button onClick={() => { close(); setModal({ kind: 'punch', row: r }); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-surface2"><CalendarPlus className="size-4" /> Add punch</button>
                                <button onClick={() => { close(); setModal({ kind: 'note', row: r }); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-surface2"><MessageSquarePlus className="size-4" /> Add note</button>
                              </>
                            )}
                          </div>
                        )}
                      </Dropdown>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
      {modal?.kind === 'status' && <MarkStatusModal open onClose={() => setModal(null)} staffId={modal.row.id} staffName={modal.row.full_name} date={date} />}
      {modal?.kind === 'punch' && <ManualPunchModal open onClose={() => setModal(null)} staffId={modal.row.id} staffName={modal.row.full_name} date={date} />}
      {modal?.kind === 'note' && <NoteModal open onClose={() => setModal(null)} staffId={modal.row.id} staffName={modal.row.full_name} date={date} />}
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <DailyAttendance />
    </Suspense>
  );
}
