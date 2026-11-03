'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, PageHeader, StatusBadge } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { Field, Input, Select } from '@/components/ui/Field';
import { ErrorState, KeyValue, PageLoader } from '@/components/ui/Misc';
import { Modal } from '@/components/ui/Modal';
import { superApi } from '@/lib/api';
import { fmtDate, fmtMoney } from '@/lib/format';
import { useAction, useSuper } from '@/lib/query';

interface Detail {
  id: number; name: string; address: string | null; city: string | null; state: string | null; country: string | null; category: string | null; timezone: string; is_active: boolean; created_at: string;
  staff: { active: number; deactivated: number; departments: number; shifts: number };
  owner: { id: number; name: string | null; email: string | null; phone: string; trial_ends_at: string | null; is_active: boolean } | null;
  subscriptions: { id: number; plan_label: string; seats: number; total_amount: number; currency: string; status: string; expires_at: string | null; payment_method: string }[];
}

export default function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const q = useSuper<Detail>(`/super-admin/businesses/${id}`);
  const [ask, dialog] = useConfirm();
  const [trial, setTrial] = useState<string | null>(null);
  const [grant, setGrant] = useState<{ plan: string; seats: string } | null>(null);
  const extend = useAction(() => superApi.post(`/super-admin/businesses/${id}/extend-trial`, { days: Number(trial) }), { invalidate: ['/super-admin/businesses'], onSuccess: () => setTrial(null) });
  const toggle = useAction(() => superApi.post(`/super-admin/businesses/${id}/toggle-status`), { invalidate: ['/super-admin/businesses'] });
  const remove = useAction(() => superApi.del(`/super-admin/businesses/${id}`), { invalidate: ['/super-admin/businesses'], onSuccess: () => router.replace('/super-admin/businesses') });
  const grantSub = useAction(() => superApi.post(`/super-admin/businesses/${id}/grant-subscription`, { plan: grant!.plan, seats: Number(grant!.seats) }), { invalidate: ['/super-admin/businesses'], onSuccess: () => setGrant(null) });

  if (q.error) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />;
  if (!q.data) return <PageLoader />;
  const b = q.data.data;
  return (
    <>
      <PageHeader
        back={<Link href="/super-admin/businesses" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Businesses</Link>}
        title={b.name}
        subtitle={[b.category, b.city, b.country].filter(Boolean).join(' · ')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setTrial('7')}>Extend trial</Button>
            <Button variant="secondary" onClick={() => setGrant({ plan: 'monthly', seats: '10' })}>Grant subscription</Button>
            <Button variant={b.is_active ? 'secondary' : 'primary'} onClick={() => ask({ title: b.is_active ? 'Deactivate business?' : 'Activate business?', message: b.is_active ? 'The owner can no longer sign in.' : 'The owner can sign in again.', confirmLabel: b.is_active ? 'Deactivate' : 'Activate', tone: b.is_active ? 'danger' : 'primary', onConfirm: () => toggle.mutateAsync() })}>{b.is_active ? 'Deactivate' : 'Activate'}</Button>
            <Button variant="danger" onClick={() => ask({ title: 'Delete this business?', message: 'The business and all its staff are removed from the platform.', confirmLabel: 'Delete', onConfirm: () => remove.mutateAsync() })}>Delete</Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Business" actions={<StatusBadge status={b.is_active ? 'Active' : 'Deactivated'} />} />
          <CardBody><dl className="grid grid-cols-2 gap-4">
            <KeyValue label="Created">{fmtDate(b.created_at)}</KeyValue><KeyValue label="Timezone">{b.timezone}</KeyValue>
            <KeyValue label="Active staff">{b.staff.active}</KeyValue><KeyValue label="Deactivated">{b.staff.deactivated}</KeyValue>
            <KeyValue label="Departments">{b.staff.departments}</KeyValue><KeyValue label="Shifts">{b.staff.shifts}</KeyValue>
            <div className="col-span-2"><KeyValue label="Address">{[b.address, b.city, b.state].filter(Boolean).join(', ')}</KeyValue></div>
          </dl></CardBody>
        </Card>
        <Card>
          <CardHeader title="Owner" />
          <CardBody><dl className="grid gap-4">
            <KeyValue label="Name">{b.owner?.name}</KeyValue><KeyValue label="Phone">{b.owner?.phone}</KeyValue><KeyValue label="Email">{b.owner?.email}</KeyValue>
            <KeyValue label="Trial ends">{b.owner?.trial_ends_at && fmtDate(b.owner.trial_ends_at)}</KeyValue>
          </dl></CardBody>
        </Card>
        <Card>
          <CardHeader title="Subscriptions" />
          <ul className="divide-y divide-line">
            {b.subscriptions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span><span className="block font-medium">{s.plan_label} · {s.seats} seats</span><span className="text-xs text-muted">{fmtMoney(s.total_amount, s.currency)} · {s.payment_method} · {s.expires_at ? `until ${fmtDate(s.expires_at)}` : ''}</span></span>
                <StatusBadge status={s.status} />
              </li>
            ))}
            {b.subscriptions.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No subscriptions yet.</li>}
          </ul>
        </Card>
      </div>
      <Modal open={trial !== null} onClose={() => setTrial(null)} title="Extend free trial" size="sm" footer={<><Button variant="secondary" onClick={() => setTrial(null)}>Cancel</Button><Button loading={extend.isPending} disabled={!Number(trial)} onClick={() => extend.mutate()}>Extend</Button></>}>
        <Field label="Days to add">{(fid) => <Input id={fid} type="number" min="1" max="365" value={trial ?? ''} onChange={(e) => setTrial(e.target.value)} autoFocus />}</Field>
      </Modal>
      <Modal open={!!grant} onClose={() => setGrant(null)} title="Grant subscription" size="sm" footer={<><Button variant="secondary" onClick={() => setGrant(null)}>Cancel</Button><Button loading={grantSub.isPending} disabled={!Number(grant?.seats)} onClick={() => grantSub.mutate()}>Grant</Button></>}>
        <div className="space-y-4">
          <Field label="Plan">{(fid) => <Select id={fid} value={grant?.plan} onChange={(e) => setGrant((g) => g && { ...g, plan: e.target.value })}><option value="monthly">Monthly (1 month)</option><option value="yearly">Yearly (12 months)</option></Select>}</Field>
          <Field label="Seats">{(fid) => <Input id={fid} type="number" min="1" max="500" value={grant?.seats ?? ''} onChange={(e) => setGrant((g) => g && { ...g, seats: e.target.value })} />}</Field>
          <p className="text-xs text-muted">Creates an active, free subscription (e.g. after an offline payment).</p>
        </div>
      </Modal>
      {dialog}
    </>
  );
}
