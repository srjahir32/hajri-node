'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardBody, CardHeader, PageHeader, StatusBadge } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, Pagination, Skeleton, TableSkeleton, Tabs } from '@/components/ui/Misc';
import { staffApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { useAction, useStaff } from '@/lib/query';
import type { LeaveCard, LeaveDto, Pagination as Pg } from '@/lib/types';

function Apply({ cards, onClose }: { cards: LeaveCard[]; onClose: () => void }) {
  const [f, setF] = useState({ leave_type: 'Full Day', shift_type: 'First Half', leave_policy_id: cards[0] ? String(cards[0].policy_id) : 'unpaid', reason: '', start_date: '', end_date: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const save = useAction(
    () => staffApi.post('/employee/leaves', {
      leave_type: f.leave_type,
      shift_type: f.leave_type === 'Half Day' ? f.shift_type : null,
      is_unpaid: f.leave_policy_id === 'unpaid',
      leave_policy_id: f.leave_policy_id === 'unpaid' ? undefined : Number(f.leave_policy_id),
      reason: f.reason,
      start_date: f.start_date,
      end_date: f.end_date || f.start_date,
    }),
    { invalidate: ['/employee'], onSuccess: onClose },
  );
  return (
    <Modal open onClose={onClose} title="Apply for leave" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} disabled={!f.start_date || !f.reason.trim()} onClick={() => save.mutate()}>Submit</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Leave type">{(id) => <Select id={id} value={f.leave_type} onChange={set('leave_type')}><option>Full Day</option><option>Half Day</option></Select>}</Field>
        {f.leave_type === 'Half Day' ? <Field label="Which half">{(id) => <Select id={id} value={f.shift_type} onChange={set('shift_type')}><option>First Half</option><option>Last Half</option></Select>}</Field> : <div />}
        <Field label="From" required>{(id) => <Input id={id} type="date" value={f.start_date} onChange={set('start_date')} />}</Field>
        <Field label="To">{(id) => <Input id={id} type="date" min={f.start_date} value={f.end_date} onChange={set('end_date')} />}</Field>
        <Field label="Deduct from" className="sm:col-span-2" hint="Unpaid leave reduces your salary for those days.">
          {(id) => (
            <Select id={id} value={f.leave_policy_id} onChange={set('leave_policy_id')}>
              {cards.map((c) => <option key={c.policy_id} value={c.policy_id}>{c.template_name} ({c.remaining_balance} left)</option>)}
              <option value="unpaid">Unpaid leave</option>
            </Select>
          )}
        </Field>
        <Field label="Reason" required className="sm:col-span-2">{(id) => <Textarea id={id} value={f.reason} onChange={set('reason')} className="min-h-20" />}</Field>
      </div>
    </Modal>
  );
}

export default function EmployeeLeavesPage() {
  const [tab, setTab] = useState<'' | '0' | '1' | '2'>('');
  const [page, setPage] = useState(1);
  const [applying, setApplying] = useState(false);
  const [ask, dialog] = useConfirm();
  const cards = useStaff<LeaveCard[]>('/employee/leaves/balance');
  const list = useStaff<LeaveDto[]>('/employee/leaves', { status: tab, page, per_page: 15 }, { keepPrevious: true });
  const meta = list.data as unknown as Pg | undefined;
  const cancel = useAction((id: number) => staffApi.del(`/employee/leaves/${id}`), { invalidate: ['/employee/leaves'] });

  return (
    <>
      <PageHeader title="Leaves" actions={<Button icon={<Plus className="size-4" />} onClick={() => setApplying(true)} disabled={!cards.data}>Apply for leave</Button>} />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!cards.data ? <Skeleton className="h-32" /> : cards.data.data.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3"><CardBody className="text-sm text-muted">No leave policy has been assigned to you yet. You can still apply for unpaid leave.</CardBody></Card>
        ) : cards.data.data.map((c) => (
          <Card key={c.policy_id}>
            <CardHeader title={c.template_name} actions={<Badge tone={c.leave_policy_cycle === 'monthly' ? 'brand' : 'info'}>{c.leave_policy_cycle}</Badge>} />
            <CardBody>
              <p className="tnum text-3xl font-semibold">{c.remaining_balance}<span className="ml-1 text-sm font-normal text-muted">day(s) · {c.remaining_label.toLowerCase()}</span></p>
              <div className="mt-3 h-2 rounded-full bg-surface2"><div className="h-2 rounded-full bg-brand" style={{ width: `${c.progress_percent}%` }} /></div>
              <p className="mt-2 text-xs text-muted">{c.total_used} used of {c.total_period_balance} · {c.period_text} · {c.carry_forward_label}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      <Card>
        <div className="p-4"><Tabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} tabs={[{ id: '', label: 'All' }, { id: '0', label: 'Pending' }, { id: '1', label: 'Approved' }, { id: '2', label: 'Rejected' }]} /></div>
        {list.error ? <ErrorState message={list.error.message} /> : !list.data ? <TableSkeleton cols={4} /> : list.data.data.length === 0 ? <EmptyState title="No leave requests" /> : (
          <>
            <ul className="divide-y divide-line">
              {list.data.data.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-medium">{fmtDate(l.start_date)}{l.end_date !== l.start_date && ` – ${fmtDate(l.end_date)}`} <span className="font-normal text-muted">· {l.leave_type}{l.shift_type ? ` (${l.shift_type})` : ''}</span></p>
                    <p className="text-sm text-muted">{l.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.is_unpaid ? <Badge tone="warning">Unpaid</Badge> : <Badge tone="success">Paid</Badge>}
                    <StatusBadge status={l.apply_status === 'Approve' ? 'Approved' : l.apply_status} />
                    {l.status === 0 && <Button size="sm" variant="ghost" aria-label="Cancel request" onClick={() => ask({ title: 'Cancel this request?', message: 'Your manager will no longer see it.', confirmLabel: 'Cancel request', onConfirm: () => cancel.mutateAsync(l.id) })}><X className="size-4" /></Button>}
                  </div>
                </li>
              ))}
            </ul>
            <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} total={meta?.total} onChange={setPage} />
          </>
        )}
      </Card>
      {applying && cards.data && <Apply cards={cards.data.data} onClose={() => setApplying(false)} />}
      {dialog}
    </>
  );
}
