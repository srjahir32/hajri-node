'use client';

import { Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { AssignStaffModal } from '@/components/settings/AssignStaffModal';
import { BackToSettings } from '@/components/settings/BackLink';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardBody, PageHeader } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { Field, Input, Select, ToggleRow } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Misc';
import { adminApi } from '@/lib/api';
import { MONTHS } from '@/lib/format';
import { useAction, useAdmin } from '@/lib/query';

interface Policy { id: number; template_name: string; cycle: 'monthly' | 'yearly'; start_period: string | null; end_period: string | null; number_of_leaves: number; is_carry_forward: number; staff_count: number }

const year = new Date().getFullYear();
const periodOptions = [year - 1, year, year + 1].flatMap((y) => MONTHS.map((m) => `${m.slice(0, 3)} ${y}`));

function Editor({ initial, onClose }: { initial: Policy | null; onClose: () => void }) {
  const [f, setF] = useState({
    template_name: initial?.template_name ?? '',
    cycle: initial?.cycle ?? 'monthly',
    start_period: initial?.start_period ?? `Jan ${year}`,
    end_period: initial?.end_period ?? `Dec ${year}`,
    number_of_leaves: String(initial?.number_of_leaves ?? 1),
    is_carry_forward: !!initial?.is_carry_forward,
  });
  const save = useAction(
    () => {
      const body = { ...f, number_of_leaves: Number(f.number_of_leaves) };
      return initial ? adminApi.put(`/admin/leave-policies/${initial.id}`, body) : adminApi.post('/admin/leave-policies', body);
    },
    { invalidate: ['/admin/leave-policies'], onSuccess: onClose },
  );
  const monthly = f.cycle === 'monthly';
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit leave policy' : 'New leave policy'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!f.template_name.trim() || !(Number(f.number_of_leaves) > 0)} loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Policy name" required>{(id) => <Input id={id} value={f.template_name} onChange={(e) => setF({ ...f, template_name: e.target.value })} placeholder="e.g. Casual leave" autoFocus />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cycle">{(id) => <Select id={id} value={f.cycle} onChange={(e) => setF({ ...f, cycle: e.target.value as 'monthly' | 'yearly' })}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select>}</Field>
          <Field label={monthly ? 'Leaves per month' : 'Leaves per year'} required>{(id) => <Input id={id} type="number" min="0.5" step="0.5" value={f.number_of_leaves} onChange={(e) => setF({ ...f, number_of_leaves: e.target.value })} />}</Field>
        </div>
        {monthly && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts">{(id) => <Select id={id} value={f.start_period} onChange={(e) => setF({ ...f, start_period: e.target.value })}>{periodOptions.map((p) => <option key={p}>{p}</option>)}</Select>}</Field>
              <Field label="Ends">{(id) => <Select id={id} value={f.end_period} onChange={(e) => setF({ ...f, end_period: e.target.value })}>{periodOptions.map((p) => <option key={p}>{p}</option>)}</Select>}</Field>
            </div>
            <ToggleRow title="Carry forward unused leaves" description="Unused monthly leaves add up for the following months." checked={f.is_carry_forward} onChange={(v) => setF({ ...f, is_carry_forward: v })} />
          </>
        )}
      </div>
    </Modal>
  );
}

export default function LeavePoliciesPage() {
  const list = useAdmin<Policy[]>('/admin/leave-policies');
  const [edit, setEdit] = useState<Policy | null | undefined>(undefined);
  const [assign, setAssign] = useState<Policy | null>(null);
  const [ask, dialog] = useConfirm();
  const remove = useAction((id: number) => adminApi.del(`/admin/leave-policies/${id}`), { invalidate: ['/admin/leave-policies'] });
  return (
    <>
      <PageHeader back={<BackToSettings />} title="Leave policies" subtitle="Paid leave balances staff can use" actions={<Button icon={<Plus className="size-4" />} onClick={() => setEdit(null)}>New policy</Button>} />
      {list.error ? <Card><ErrorState message={list.error.message} /></Card> : !list.data ? <Skeleton className="h-40" /> : list.data.data.length === 0 ? <Card><EmptyState title="No leave policies" message="Create a policy, then assign it to the staff who should receive that leave." /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.data.data.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div><p className="font-semibold">{p.template_name}</p><p className="text-sm text-muted">{p.staff_count} staff</p></div>
                  <Badge tone={p.cycle === 'monthly' ? 'brand' : 'info'}>{p.cycle}</Badge>
                </div>
                <p className="tnum text-2xl font-semibold">{p.number_of_leaves}<span className="ml-1 text-sm font-normal text-muted">/ {p.cycle === 'monthly' ? 'month' : 'year'}</span></p>
                <p className="mt-1 text-sm text-muted">{p.cycle === 'monthly' ? `${p.start_period} – ${p.end_period} · carry forward ${p.is_carry_forward ? 'on' : 'off'}` : 'Resets every January'}</p>
                <div className="mt-4 flex gap-1.5">
                  <Button size="sm" variant="secondary" icon={<UserPlus className="size-4" />} onClick={() => setAssign(p)}>Assign</Button>
                  <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setEdit(p)}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label="Delete" className="text-danger" onClick={() => ask({ title: `Delete ${p.template_name}?`, message: 'Staff lose this leave balance.', confirmLabel: 'Delete', onConfirm: () => remove.mutateAsync(p.id) })}><Trash2 className="size-4" /></Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      {edit !== undefined && <Editor initial={edit} onClose={() => setEdit(undefined)} />}
      {assign && <AssignStaffModal open onClose={() => setAssign(null)} title={`Assign “${assign.template_name}”`} listPath={`/admin/leave-policies/${assign.id}/staff`} savePath={`/admin/leave-policies/${assign.id}/assign`} invalidate={['/admin/leave-policies']} />}
      {dialog}
    </>
  );
}
