'use client';

import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardBody, CardHeader, PageHeader, Stat, StatusBadge } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { Field, Input } from '@/components/ui/Field';
import { ErrorState, PageLoader } from '@/components/ui/Misc';
import { Table, TableWrap, Td, Th, THead, Tr } from '@/components/ui/Table';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { fmtDate, fmtDateTime, fmtMoney } from '@/lib/format';
import { useAction, useAdmin } from '@/lib/query';

interface Overview {
  subscription: { id: number; plan: string; plan_label: string; seats: number; active_staff: number | null; available_seats: number | null; price_per_seat: number; total_amount: number; currency: string; status: string; payment_method: string; expires_at: string | null; is_active: boolean } | null;
  active_staff_count: number;
  trial: { ends_at: string | null; expired: boolean; days_left: number | null };
  plans: { key: 'monthly' | 'yearly'; label: string; price_per_seat: number; currency: string; min_seats: number; max_seats: number; features: string[] }[];
  kelviq: { enabled: boolean; prices: { monthly: number; yearly: number } };
  cashfree: { enabled: boolean };
  transactions: { id: number; event_type: string; order_id: string | null; payment_id: string | null; amount: number | null; currency: string; status: string | null; created_at: string }[];
}

function Page() {
  const { session, refresh } = useAdminSession();
  const sp = useSearchParams();
  const q = useAdmin<Overview>('/admin/subscriptions');
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [seats, setSeats] = useState('5');
  const [gateway, setGateway] = useState<'cashfree' | 'kelviq'>('cashfree');
  const [newSeats, setNewSeats] = useState('');
  const [ask, dialog] = useConfirm();
  const owner = !session.user.is_sub_admin;

  useEffect(() => {
    const m = sp.get('success') ?? sp.get('error') ?? sp.get('info');
    if (!m) return;
    if (sp.get('success')) { toast.success(m); refresh(); } else if (sp.get('error')) toast.error(m); else toast.info(m);
    window.history.replaceState(null, '', '/admin/subscriptions');
  }, [sp, refresh]);

  useEffect(() => {
    if (q.data) {
      setSeats((s) => String(Math.max(Number(s) || 1, q.data!.data.active_staff_count || 1)));
      setNewSeats(String(q.data.data.subscription?.seats ?? ''));
    }
  }, [q.data]);

  const checkout = useAction(() => adminApi.post<{ redirect_url: string }>('/admin/subscriptions/checkout', { plan, seats: Number(seats), payment_method: gateway }), {
    success: false,
    onSuccess: (res) => { window.location.href = (res.data as { redirect_url: string }).redirect_url; },
  });
  const changeSeats = useAction(() => adminApi.post('/admin/subscriptions/seats', { seats: Number(newSeats) }), { invalidate: ['/admin/subscriptions'] });
  const cancel = useAction(() => adminApi.post('/admin/subscriptions/cancel'), { invalidate: ['/admin/subscriptions'], onSuccess: refresh });

  if (q.error) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />;
  if (!q.data) return <PageLoader />;
  const d = q.data.data;
  const sub = d.subscription;
  const active = sub?.is_active;
  const cur = d.plans.find((p) => p.key === plan)!;
  const price = gateway === 'kelviq' ? d.kelviq.prices[plan] : cur.price_per_seat;
  const currency = gateway === 'kelviq' ? 'USD' : 'INR';
  const total = price * (Number(seats) || 0);

  return (
    <>
      <PageHeader title="Subscription" subtitle="Pay per staff seat. Cancel any time." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Status" value={active ? 'Active' : d.trial.expired ? 'Trial ended' : 'Free trial'} tone={active ? 'success' : d.trial.expired ? 'danger' : 'info'} hint={active ? `Renews ${fmtDate(sub!.expires_at)}` : d.trial.ends_at ? `${d.trial.expired ? 'Ended' : 'Ends'} ${fmtDate(d.trial.ends_at)}${!d.trial.expired && d.trial.days_left !== null ? ` · ${d.trial.days_left} day(s) left` : ''}` : undefined} />
        <Stat label="Active staff" value={d.active_staff_count} tone="brand" hint={sub ? `${sub.seats} seats purchased` : 'in this business'} />
        <Stat label="Current charge" value={sub && active ? fmtMoney(sub.total_amount, sub.currency) : '—'} tone="warning" hint={sub && active ? `${fmtMoney(sub.price_per_seat, sub.currency)} per seat · ${sub.plan_label}` : undefined} />
      </div>

      {active && sub ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Seats" subtitle={`${sub.active_staff ?? d.active_staff_count} of ${sub.seats} seats in use`} />
            <CardBody className="space-y-4">
              {owner ? (
                <>
                  <Field label="Total seats" hint="Increasing seats takes effect immediately; reducing is limited by your active staff.">{(id) => <Input id={id} type="number" min="1" max="500" value={newSeats} onChange={(e) => setNewSeats(e.target.value)} className="w-40" />}</Field>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button loading={changeSeats.isPending} disabled={!newSeats || Number(newSeats) === sub.seats} onClick={() => changeSeats.mutate()}>Update seats</Button>
                    <span className="text-sm text-muted">New total: {fmtMoney(sub.price_per_seat * (Number(newSeats) || 0), sub.currency)} / {sub.plan === 'yearly' ? 'year' : 'month'}</span>
                  </div>
                </>
              ) : <p className="text-sm text-muted">Only the business owner can change billing.</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Plan" subtitle={sub.plan_label} actions={<Badge tone="success">via {sub.payment_method}</Badge>} />
            <CardBody className="space-y-4">
              <p className="text-sm text-muted">Current period ends on <b className="text-ink">{fmtDate(sub.expires_at)}</b>. Your plan renews automatically.</p>
              {owner && <Button variant="danger" onClick={() => ask({ title: 'Cancel subscription?', message: 'You keep access until the end of the paid period; after that the account is locked until you subscribe again.', confirmLabel: 'Cancel subscription', onConfirm: () => cancel.mutateAsync() })}>Cancel subscription</Button>}
            </CardBody>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader title="Choose a plan" subtitle="All plans include attendance, GPS tracking, shifts, leave and payroll." />
          <CardBody className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {d.plans.map((p) => {
                const shown = gateway === 'kelviq' ? d.kelviq.prices[p.key] : p.price_per_seat;
                return (
                  <button key={p.key} type="button" onClick={() => setPlan(p.key)} aria-pressed={plan === p.key} className={clsx('rounded-2xl border p-5 text-left transition', plan === p.key ? 'border-brand bg-brandsoft' : 'border-line hover:bg-surface2')}>
                    <div className="flex items-center justify-between"><p className="font-semibold">{p.label}</p>{p.key === 'yearly' && <Badge tone="success">Best value</Badge>}</div>
                    <p className="tnum mt-2 text-3xl font-semibold">{fmtMoney(shown, currency)}<span className="text-sm font-normal text-muted"> / seat / {p.key === 'yearly' ? 'year' : 'month'}</span></p>
                    <ul className="mt-3 space-y-1.5 text-sm text-muted">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{f}</li>)}</ul>
                  </button>
                );
              })}
            </div>
            {owner ? (
              <div className="grid items-end gap-4 sm:grid-cols-[10rem_1fr_auto]">
                <Field label="Seats (staff)" hint={`At least ${d.active_staff_count} active`}>{(id) => <Input id={id} type="number" min={Math.max(1, d.active_staff_count)} max="500" value={seats} onChange={(e) => setSeats(e.target.value)} />}</Field>
                <Field label="Pay with">
                  {() => (
                    <div className="flex gap-2">
                      <Button type="button" variant={gateway === 'cashfree' ? 'primary' : 'secondary'} disabled={!d.cashfree.enabled && !d.kelviq.enabled} onClick={() => setGateway('cashfree')}>Cashfree (₹)</Button>
                      {d.kelviq.enabled && <Button type="button" variant={gateway === 'kelviq' ? 'primary' : 'secondary'} onClick={() => setGateway('kelviq')}>Kelviq ($)</Button>}
                    </div>
                  )}
                </Field>
                <Button size="lg" loading={checkout.isPending} disabled={!Number(seats) || Number(seats) < d.active_staff_count} onClick={() => checkout.mutate()}>Pay {fmtMoney(total, currency)}</Button>
              </div>
            ) : <p className="text-sm text-muted">Ask the business owner to subscribe.</p>}
            {!d.cashfree.enabled && gateway === 'cashfree' && <p className="rounded-lg bg-warningsoft px-3 py-2 text-sm text-warning">Cashfree credentials are not configured on this server — set CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET in the API environment.</p>}
          </CardBody>
        </Card>
      )}

      {d.transactions.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Payment history" />
          <TableWrap>
            <Table>
              <THead><tr><Th>Date</Th><Th>Event</Th><Th>Reference</Th><Th align="right">Amount</Th><Th>Status</Th></tr></THead>
              <tbody>
                {d.transactions.map((t) => (
                  <Tr key={t.id}><Td className="whitespace-nowrap">{fmtDateTime(t.created_at)}</Td><Td>{t.event_type.replace(/_/g, ' ').toLowerCase()}</Td><Td className="max-w-48 truncate text-muted">{t.payment_id ?? t.order_id}</Td><Td align="right" className="tnum">{t.amount ? fmtMoney(t.amount, t.currency) : '—'}</Td><Td><StatusBadge status={t.status} /></Td></Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      )}
      {dialog}
    </>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Page />
    </Suspense>
  );
}
