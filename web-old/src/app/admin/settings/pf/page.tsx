'use client';

import { useEffect, useState } from 'react';
import { BackToSettings } from '@/components/settings/BackLink';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, PageHeader } from '@/components/ui/Card';
import { Field, Input, ToggleRow } from '@/components/ui/Field';
import { ErrorState, PageLoader } from '@/components/ui/Misc';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';

interface Pf { is_enabled: boolean; employee_percentage: number; employer_eps_percentage: number; employer_epf_percentage: number; capped_amount: number | null }

export default function PfPage() {
  const q = useAdmin<Pf>('/admin/pf');
  const [f, setF] = useState<{ is_enabled: boolean; employee_percentage: string; employer_eps_percentage: string; employer_epf_percentage: string; capped_amount: string } | null>(null);
  useEffect(() => {
    if (q.data) {
      const d = q.data.data;
      setF({ is_enabled: d.is_enabled, employee_percentage: String(d.employee_percentage), employer_eps_percentage: String(d.employer_eps_percentage), employer_epf_percentage: String(d.employer_epf_percentage), capped_amount: d.capped_amount ? String(d.capped_amount) : '' });
    }
  }, [q.data]);
  const save = useAction(() => adminApi.put('/admin/pf', { is_enabled: f!.is_enabled, employee_percentage: Number(f!.employee_percentage), employer_eps_percentage: Number(f!.employer_eps_percentage), employer_epf_percentage: Number(f!.employer_epf_percentage), capped_amount: f!.capped_amount ? Number(f!.capped_amount) : undefined }), { invalidate: ['/admin/pf', '/admin/payroll'] });
  if (q.error) return <ErrorState message={q.error.message} />;
  if (!f) return <PageLoader />;
  const set = (k: 'employee_percentage' | 'employer_eps_percentage' | 'employer_epf_percentage' | 'capped_amount') => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <PageHeader back={<BackToSettings />} title="Provident fund" subtitle="Contribution rates applied to each staff member's monthly salary" />
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="max-w-2xl space-y-6">
        <ToggleRow title="Deduct PF in payroll" description="When on, the employee share is deducted from net salary and employer shares are reported." checked={f.is_enabled} onChange={(v) => setF({ ...f, is_enabled: v })} />
        <Card>
          <CardHeader title="Rates" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee contribution (%)">{(id) => <Input id={id} type="number" step="0.01" min="0" max="100" value={f.employee_percentage} onChange={set('employee_percentage')} />}</Field>
            <Field label="Cap per component (₹)" hint="Optional. Each contribution is limited to this amount.">{(id) => <Input id={id} type="number" min="0" value={f.capped_amount} onChange={set('capped_amount')} />}</Field>
            <Field label="Employer EPS (%)">{(id) => <Input id={id} type="number" step="0.01" min="0" max="100" value={f.employer_eps_percentage} onChange={set('employer_eps_percentage')} />}</Field>
            <Field label="Employer EPF (%)">{(id) => <Input id={id} type="number" step="0.01" min="0" max="100" value={f.employer_epf_percentage} onChange={set('employer_epf_percentage')} />}</Field>
          </CardBody>
        </Card>
        <Button type="submit" loading={save.isPending}>Save</Button>
      </form>
    </>
  );
}
