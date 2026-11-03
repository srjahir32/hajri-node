'use client';

import { ArrowLeft, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, use, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, PageHeader, StatusBadge } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { ErrorState, MonthPicker, PageLoader } from '@/components/ui/Misc';
import { adminApi } from '@/lib/api';
import { fmtDuration, fmtMoney, monthLabel, monthStr } from '@/lib/format';
import { useAction, useAdmin } from '@/lib/query';
import type { PayrollCalc } from '@/lib/types';

function Line({ label, value, hint, tone, strong }: { label: string; value: string; hint?: string; tone?: 'plus' | 'minus'; strong?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 py-2 ${strong ? 'border-t border-line pt-3 text-base font-semibold' : 'text-sm'}`}>
      <div>
        <p>{label}</p>
        {hint && <p className="text-xs font-normal text-muted">{hint}</p>}
      </div>
      <p className={`tnum whitespace-nowrap ${tone === 'minus' ? 'text-danger' : tone === 'plus' ? 'text-success' : ''}`}>{tone === 'minus' && value !== fmtMoney(0) ? '− ' : ''}{value}</p>
    </div>
  );
}

function PayrollDetail({ staffId }: { staffId: string }) {
  const sp = useSearchParams();
  const [month, setMonth] = useState(sp.get('month') ?? monthStr());
  const [y, m] = month.split('-').map(Number);
  const [ask, dialog] = useConfirm();
  const q = useAdmin<{ calculation: PayrollCalc; processed: Record<string, number | string> | null }>(`/admin/payroll/staff/${staffId}`, { month: m, year: y }, { keepPrevious: true });
  const process = useAction(() => adminApi.post('/admin/payroll/process', { month: m, year: y, staff_ids: [Number(staffId)] }), { invalidate: ['/admin/payroll'] });
  const reopen = useAction(() => adminApi.post('/admin/payroll/reopen', { staff_id: Number(staffId), month: m, year: y }), { invalidate: ['/admin/payroll'] });

  if (q.error) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />;
  if (!q.data) return <PageLoader />;
  const c = q.data.data.calculation;
  const saved = q.data.data.processed;

  return (
    <>
      <PageHeader
        back={<Link href="/admin/payroll" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Payroll</Link>}
        title={`Salary – ${monthLabel(month)}`}
        subtitle={<span className="flex items-center gap-2">{saved ? <StatusBadge status="Processed" /> : <StatusBadge status="Pending" />}<span>{c.salary_mode === 'daily' ? 'Paid per day present' : 'Paid per hour worked'}</span></span>}
        actions={
          <>
            <MonthPicker value={month} onChange={setMonth} />
            {saved ? (
              <Button variant="secondary" icon={<RotateCcw className="size-4" />} onClick={() => ask({ title: 'Reopen this payroll?', message: 'The saved figures are discarded so you can recalculate after fixing attendance.', confirmLabel: 'Reopen', onConfirm: () => reopen.mutateAsync() })}>Reopen</Button>
            ) : (
              <Button loading={process.isPending} onClick={() => process.mutate()}>Process payroll</Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Attendance summary" />
          <CardBody className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {[
              ['Working days', c.working_days],
              ['Weekly offs & holidays', c.holiday_days],
              ['Days present', c.present_days],
              ['Half days', c.half_days],
              ['Paid leave days', c.paid_leave_days],
              ['Unpaid leave days', c.unpaid_leave_days],
              ['Hours worked', fmtDuration(c.worked_seconds)],
              ['Regular hours', fmtDuration(c.regular_seconds)],
              ['Overtime', fmtDuration(c.overtime_seconds)],
              ['Shift length', fmtDuration(c.payable_seconds_per_day)],
              ['Late arrivals charged', c.late_occurrences],
              ['Early exits charged', c.early_occurrences],
            ].map(([k, v]) => (
              <div key={k as string}><p className="text-xs uppercase tracking-wide text-muted">{k}</p><p className="tnum text-base font-medium">{v}</p></div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Salary calculation" subtitle={`Monthly salary ${fmtMoney(c.salary_amount)} · ${fmtMoney(c.per_day_salary)}/day · ${fmtMoney(c.per_hour_salary)}/hour`} />
          <CardBody className="divide-y divide-line">
            <Line label="Base salary" hint={c.salary_mode === 'daily' ? `${c.present_days + c.half_days * 0.5} day(s) × ${fmtMoney(c.per_day_salary)}` : 'Hours worked (rounded up to 15 min) × hourly rate'} value={fmtMoney(c.base_salary)} />
            <Line label="Paid leave" value={fmtMoney(c.paid_leave_salary)} tone="plus" />
            <Line label="Overtime pay" value={fmtMoney(c.overtime_salary)} tone="plus" />
            <Line label="Break deduction" value={fmtMoney(c.break_deduction)} tone="minus" />
            <Line label="Late-entry deduction" value={fmtMoney(c.late_deduction)} tone="minus" />
            <Line label="Early-exit deduction" value={fmtMoney(c.early_deduction)} tone="minus" />
            <Line label="Provident fund (employee)" value={fmtMoney(c.pf_cut)} tone="minus" hint={c.epf_amount || c.eps_amount ? `Employer: EPF ${fmtMoney(c.epf_amount)} · EPS ${fmtMoney(c.eps_amount)}` : undefined} />
            <Line label="Net salary" value={fmtMoney(c.net_salary)} strong />
          </CardBody>
        </Card>
      </div>
      {dialog}
    </>
  );
}

export default function Page({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = use(params);
  return (
    <Suspense fallback={<PageLoader />}>
      <PayrollDetail staffId={staffId} />
    </Suspense>
  );
}
