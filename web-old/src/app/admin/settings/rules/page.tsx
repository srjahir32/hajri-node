'use client';

import { Plus, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AssignStaffModal } from '@/components/settings/AssignStaffModal';
import { BackToSettings } from '@/components/settings/BackLink';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, PageHeader } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { Input, Select } from '@/components/ui/Field';
import { ErrorState, PageLoader, Tabs } from '@/components/ui/Misc';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';

type Kind = 'overtime' | 'break' | 'late-entry' | 'early-exit';

interface Rule { id?: number; rule_type: number; threshold_minutes: number; multiples: number | null; fixed_amount: number | null; occurrences: number }
interface RulesDto { rules: Rule[]; staff_count: number }

const COPY: Record<Kind, { title: string; intro: string; unit: string; t1: string; t2: string; t3: string; paying: boolean; occurrences: boolean }> = {
  overtime: { title: 'Overtime pay', intro: 'Pay extra when staff work beyond their shift hours. The matching rule with the longest overtime threshold applies to each day.', unit: 'overtime of at least', t1: 'Pay per minute', t2: 'Pay half-day salary', t3: 'Pay full-day salary', paying: true, occurrences: false },
  break: { title: 'Break deduction', intro: 'Deduct salary when breaks run longer than the break allowed in the shift.', unit: 'break of at least', t1: 'Deduct per extra minute', t2: 'Deduct half-day salary', t3: 'Deduct full-day salary', paying: false, occurrences: false },
  'late-entry': { title: 'Late-entry deduction', intro: 'Deduct salary when staff punch in after the shift start. Days on approved leave are skipped.', unit: 'late by at least', t1: 'Deduct per late minute', t2: 'Deduct half-day salary', t3: 'Deduct full-day salary', paying: false, occurrences: true },
  'early-exit': { title: 'Early-exit deduction', intro: 'Deduct salary when staff punch out before the shift end. Days on approved leave are skipped.', unit: 'leaving early by at least', t1: 'Deduct per early minute', t2: 'Deduct half-day salary', t3: 'Deduct full-day salary', paying: false, occurrences: true },
};

const MULTIPLES = [1, 1.25, 1.5, 2, 2.5, 3];

function RulesEditor({ kind }: { kind: Kind }) {
  const c = COPY[kind];
  const q = useAdmin<RulesDto>(`/admin/rules/${kind}`);
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [assign, setAssign] = useState(false);
  const [ask, dialog] = useConfirm();
  useEffect(() => setRules(null), [kind]);
  const current = rules ?? q.data?.data.rules ?? [];
  const staffField = { overtime: 'overtime_rule', break: 'break_rule', 'late-entry': 'late_entry_rule', 'early-exit': 'early_exit_rule' }[kind];
  void staffField;

  const save = useAction(() => adminApi.put(`/admin/rules/${kind}`, { rules: current.map((r) => ({ rule_type: r.rule_type, threshold_minutes: r.threshold_minutes, multiples: r.rule_type === 1 && !r.fixed_amount ? r.multiples ?? 1 : undefined, fixed_amount: r.rule_type === 1 ? r.fixed_amount || undefined : undefined, occurrences: r.occurrences })) }), { invalidate: ['/admin/rules'], onSuccess: () => setRules(null) });
  const clear = useAction(() => adminApi.del(`/admin/rules/${kind}`), { invalidate: ['/admin/rules'], onSuccess: () => setRules(null) });

  const set = (i: number, patch: Partial<Rule>) => setRules(current.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const add = () => setRules([...current, { rule_type: 1, threshold_minutes: 15, multiples: 1, fixed_amount: null, occurrences: 0 }]);

  if (q.error) return <ErrorState message={q.error.message} />;
  if (!q.data) return <PageLoader />;
  return (
    <Card>
      <CardHeader title={c.title} subtitle={c.intro} actions={<Button variant="secondary" size="sm" icon={<UserPlus className="size-4" />} onClick={() => setAssign(true)}>Apply to staff ({q.data.data.staff_count})</Button>} />
      <CardBody className="space-y-3">
        {current.length === 0 && <p className="rounded-lg bg-surface2 p-4 text-sm text-muted">No rules yet. Add a rule, save, then choose which staff it applies to.</p>}
        {current.map((r, i) => (
          <div key={r.id ?? `n${i}`} className="grid gap-3 rounded-xl border border-line p-4 md:grid-cols-[1fr_9rem_1fr_auto] md:items-end">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Rule</span>
              <Select value={r.rule_type} onChange={(e) => set(i, { rule_type: Number(e.target.value) })}>
                <option value={1}>{c.t1}</option><option value={2}>{c.t2}</option><option value={3}>{c.t3}</option>
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">When {c.unit} (min)</span>
              <Input type="number" min="0" value={r.threshold_minutes} onChange={(e) => set(i, { threshold_minutes: Number(e.target.value) })} />
            </label>
            {r.rule_type === 1 ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label>
                  <span className="mb-1 block font-medium">× hourly rate</span>
                  <Select value={r.fixed_amount ? 'fixed' : String(r.multiples ?? 1)} onChange={(e) => (e.target.value === 'fixed' ? set(i, { fixed_amount: 100, multiples: null }) : set(i, { fixed_amount: null, multiples: Number(e.target.value) }))}>
                    {MULTIPLES.map((m) => <option key={m} value={m}>{m}×</option>)}
                    <option value="fixed">Fixed amount</option>
                  </Select>
                </label>
                {r.fixed_amount ? (
                  <label><span className="mb-1 block font-medium">Amount</span><Input type="number" min="1" value={r.fixed_amount} onChange={(e) => set(i, { fixed_amount: Number(e.target.value) })} /></label>
                ) : c.occurrences ? (
                  <label><span className="mb-1 block font-medium">Track first N times</span><Input type="number" min="0" value={r.occurrences} onChange={(e) => set(i, { occurrences: Number(e.target.value) })} /></label>
                ) : <span />}
              </div>
            ) : c.occurrences ? (
              <label className="text-sm"><span className="mb-1 block font-medium">Track first N times</span><Input type="number" min="0" value={r.occurrences} onChange={(e) => set(i, { occurrences: Number(e.target.value) })} /></label>
            ) : <span className="text-sm text-muted">{r.rule_type === 2 ? 'Half of one day’s salary' : 'One full day’s salary'}</span>}
            <button type="button" aria-label="Remove rule" onClick={() => setRules(current.filter((_, idx) => idx !== i))} className="justify-self-end rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 className="size-4" /></button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button variant="secondary" icon={<Plus className="size-4" />} onClick={add}>Add rule</Button>
          <Button loading={save.isPending} disabled={rules === null} onClick={() => save.mutate()}>Save rules</Button>
          {q.data.data.rules.length > 0 && <Button variant="ghost" className="ml-auto text-danger" onClick={() => ask({ title: `Delete all ${c.title.toLowerCase()} rules?`, message: 'The rules are removed and unassigned from every staff member.', confirmLabel: 'Delete rules', onConfirm: () => clear.mutateAsync() })}>Delete all</Button>}
        </div>
      </CardBody>
      {assign && <AssignStaffModal open onClose={() => setAssign(false)} title={`Apply ${c.title.toLowerCase()} to staff`} listPath={`/admin/rules/${kind}/staff`} savePath={`/admin/rules/${kind}/apply`} invalidate={['/admin/rules', '/admin/staff']} />}
      {dialog}
    </Card>
  );
}

export default function RulesPage() {
  const [kind, setKind] = useState<Kind>('overtime');
  return (
    <>
      <PageHeader back={<BackToSettings />} title="Automation rules" subtitle="Rules are used when payroll is calculated" />
      <div className="mb-6">
        <Tabs value={kind} onChange={setKind} tabs={[{ id: 'overtime', label: 'Overtime' }, { id: 'break', label: 'Break' }, { id: 'late-entry', label: 'Late entry' }, { id: 'early-exit', label: 'Early exit' }]} />
      </div>
      <RulesEditor kind={kind} />
    </>
  );
}
