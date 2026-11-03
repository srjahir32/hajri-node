'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader, StatusBadge } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, Pagination, TableSkeleton, Tabs } from '@/components/ui/Misc';
import { staffApi } from '@/lib/api';
import { fmtClock, fmtDate, fmtDuration } from '@/lib/format';
import { useAction, useStaff } from '@/lib/query';
import type { Pagination as Pg, Punch } from '@/lib/types';

type Row = Punch & { request_id: number };
const APPROVAL = ['Pending', 'Approved', 'Rejected'];

function NewRequest({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ date: '', in: '09:00', out: '18:00', reason: '' });
  const save = useAction(() => staffApi.post('/employee/attendance-requests', { punch_in: `${f.date}T${f.in}`, punch_out: `${f.date}T${f.out}`, reason: f.reason }), { invalidate: ['/employee/attendance-requests'], onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Request a missed punch" size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} disabled={!f.date || !f.reason.trim() || f.out <= f.in} onClick={() => save.mutate()}>Submit</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-muted">Forgot to punch? Tell your manager when you worked and they can approve it.</p>
        <Field label="Date" required>{(id) => <Input id={id} type="date" max={new Date().toISOString().slice(0, 10)} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Punch in" required>{(id) => <Input id={id} type="time" value={f.in} onChange={(e) => setF({ ...f, in: e.target.value })} />}</Field>
          <Field label="Punch out" required>{(id) => <Input id={id} type="time" value={f.out} onChange={(e) => setF({ ...f, out: e.target.value })} />}</Field>
        </div>
        <Field label="Reason" required>{(id) => <Textarea id={id} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} className="min-h-20" />}</Field>
      </div>
    </Modal>
  );
}

export default function RequestsPage() {
  const [tab, setTab] = useState<'' | '0' | '1' | '2'>('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const list = useStaff<Row[]>('/employee/attendance-requests', { status: tab, page, per_page: 15 }, { keepPrevious: true });
  const meta = list.data as unknown as Pg | undefined;
  return (
    <>
      <PageHeader title="Punch requests" subtitle="Missed punches and remote punches waiting for approval" actions={<Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>New request</Button>} />
      <Card>
        <div className="p-4"><Tabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} tabs={[{ id: '', label: 'All' }, { id: '0', label: 'Pending' }, { id: '1', label: 'Approved' }, { id: '2', label: 'Rejected' }]} /></div>
        {list.error ? <ErrorState message={list.error.message} /> : !list.data ? <TableSkeleton cols={3} /> : list.data.data.length === 0 ? <EmptyState title="No requests" /> : (
          <>
            <ul className="divide-y divide-line">
              {list.data.data.map((r) => (
                <li key={r.request_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-medium">{fmtDate(r.date)} <span className="tnum font-normal text-muted">· {fmtClock(r.in_time)} → {fmtClock(r.out_time)} ({fmtDuration(r.total_seconds)})</span></p>
                    {r.note && <p className="text-sm text-muted">{r.note}</p>}
                  </div>
                  <StatusBadge status={APPROVAL[r.attendance_status]} />
                </li>
              ))}
            </ul>
            <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} total={meta?.total} onChange={setPage} />
          </>
        )}
      </Card>
      {adding && <NewRequest onClose={() => setAdding(false)} />}
    </>
  );
}
