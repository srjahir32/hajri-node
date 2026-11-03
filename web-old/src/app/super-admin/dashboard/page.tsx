'use client';

import { Building2, CreditCard, IndianRupee, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, CardBody, CardHeader, PageHeader, Stat } from '@/components/ui/Card';
import { ErrorState, Skeleton } from '@/components/ui/Misc';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useSuper } from '@/lib/query';

interface Dash {
  totals: { businesses: number; owners: number; staff: number; active_subscriptions: number; trial_users: number; revenue_total: number; revenue_this_month: number; new_businesses_this_month: number };
  recent_businesses: { id: number; name: string; owner: string | null; phone: string | null; staff_count: number; is_active: boolean; created_at: string }[];
}

export default function SuperDashboard() {
  const q = useSuper<Dash>('/super-admin/dashboard');
  const rep = useSuper<{ month: string; label: string; revenue: number; new_businesses: number }[]>('/super-admin/reports', { months: 12 });
  if (q.error) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />;
  const t = q.data?.data.totals;
  return (
    <>
      <PageHeader title="Platform overview" />
      {!t ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Businesses" value={fmtNum(t.businesses)} icon={<Building2 className="size-5" />} hint={`${t.new_businesses_this_month} new this month`} href="/super-admin/businesses" />
          <Stat label="Staff" value={fmtNum(t.staff)} icon={<Users className="size-5" />} tone="info" href="/super-admin/staff" />
          <Stat label="Active subscriptions" value={fmtNum(t.active_subscriptions)} icon={<CreditCard className="size-5" />} tone="success" hint={`${t.trial_users} on trial`} href="/super-admin/subscriptions" />
          <Stat label="Revenue (all time)" value={fmtMoney(t.revenue_total)} icon={<IndianRupee className="size-5" />} tone="warning" hint={`${fmtMoney(t.revenue_this_month)} this month`} href="/super-admin/payments" />
        </div>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Revenue & signups" subtitle="Last 12 months" actions={<Link href="/super-admin/reports" className="text-sm text-brand hover:underline">Details</Link>} />
          <CardBody>
            {!rep.data ? <Skeleton className="h-64" /> : (
              <div className="h-64" role="img" aria-label="Monthly revenue chart">
                <ResponsiveContainer>
                  <BarChart data={rep.data.data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted)" />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted)" />
                    <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }} />
                    <Bar dataKey="revenue" name="Revenue" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Newest businesses" actions={<TrendingUp className="size-4 text-muted" />} />
          <ul className="divide-y divide-line">
            {(q.data?.data.recent_businesses ?? []).map((b) => (
              <li key={b.id}>
                <Link href={`/super-admin/businesses/${b.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface2">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{b.name}</span><span className="block truncate text-xs text-muted">{b.owner ?? '—'} · {fmtDate(b.created_at)}</span></span>
                  <Badge tone={b.is_active ? 'success' : 'danger'}>{b.staff_count} staff</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
