'use client';

import { CalendarPlus, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { AssignStaffModal } from '@/components/settings/AssignStaffModal';
import { BackToSettings } from '@/components/settings/BackLink';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardBody, CardHeader, PageHeader } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { Checkbox, Field, Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Avatar, EmptyState, ErrorState, Skeleton, Tabs } from '@/components/ui/Misc';
import { adminApi } from '@/lib/api';
import { fmtDate, WEEKDAYS } from '@/lib/format';
import { useAction, useAdmin } from '@/lib/query';

interface Holiday { id?: number; name: string; date: string }
interface Policy { id: number; name: string; year: number; staff_count: number; holidays: (Holiday & { id: number })[] }

function PolicyEditor({ initial, onClose }: { initial: Policy | null; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [year, setYear] = useState(String(initial?.year ?? new Date().getFullYear()));
  const [holidays, setHolidays] = useState<Holiday[]>(initial?.holidays ?? []);
  const save = useAction(
    () => {
      const body = { name, year: Number(year), holidays };
      return initial ? adminApi.put(`/admin/holidays/policies/${initial.id}`, body) : adminApi.post('/admin/holidays/policies', body);
    },
    { invalidate: ['/admin/holidays'], onSuccess: onClose },
  );
  const setH = (i: number, patch: Partial<Holiday>) => setHolidays((p) => p.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  const valid = name.trim() && holidays.every((h) => h.name.trim() && h.date);
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit holiday template' : 'New holiday template'} size="lg" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!valid} loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Template name" required className="sm:col-span-2">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Public holidays 2026" autoFocus />}</Field>
          <Field label="Year">{(id) => <Input id={id} type="number" value={year} onChange={(e) => setYear(e.target.value)} />}</Field>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Holidays</p>
          {holidays.map((h, i) => (
            <div key={h.id ?? `n${i}`} className="grid grid-cols-[1fr_9.5rem_auto] items-center gap-2">
              <Input aria-label="Holiday name" value={h.name} onChange={(e) => setH(i, { name: e.target.value })} placeholder="Holiday name" />
              <Input aria-label="Holiday date" type="date" value={h.date} onChange={(e) => setH(i, { date: e.target.value })} />
              <button type="button" aria-label="Remove holiday" onClick={() => setHolidays((p) => p.filter((_, idx) => idx !== i))} className="rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 className="size-4" /></button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" icon={<CalendarPlus className="size-4" />} onClick={() => setHolidays((p) => [...p, { name: '', date: '' }])}>Add holiday</Button>
        </div>
      </div>
    </Modal>
  );
}

function Templates() {
  const list = useAdmin<Policy[]>('/admin/holidays/policies');
  const [edit, setEdit] = useState<Policy | null | undefined>(undefined);
  const [assign, setAssign] = useState<Policy | null>(null);
  const [ask, dialog] = useConfirm();
  const remove = useAction((id: number) => adminApi.del(`/admin/holidays/policies/${id}`), { invalidate: ['/admin/holidays'] });
  if (list.error) return <ErrorState message={list.error.message} />;
  if (!list.data) return <Skeleton className="h-40" />;
  return (
    <>
      <div className="mb-4 flex justify-end"><Button icon={<Plus className="size-4" />} onClick={() => setEdit(null)}>New template</Button></div>
      {list.data.data.length === 0 ? <Card><EmptyState title="No holiday templates" message="Create a template with your public holidays and assign it to staff." /></Card> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.data.data.map((p) => (
            <Card key={p.id}>
              <CardHeader title={p.name} subtitle={`${p.year} · ${p.holidays.length} holidays · ${p.staff_count || 'all'} staff`} actions={
                <>
                  <Button size="sm" variant="ghost" aria-label="Assign staff" onClick={() => setAssign(p)}><UserPlus className="size-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setEdit(p)}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label="Delete" className="text-danger" onClick={() => ask({ title: `Delete ${p.name}?`, message: 'All holidays in this template are removed.', confirmLabel: 'Delete', onConfirm: () => remove.mutateAsync(p.id) })}><Trash2 className="size-4" /></Button>
                </>
              } />
              <ul className="max-h-64 divide-y divide-line overflow-y-auto">
                {p.holidays.map((h) => <li key={h.id} className="flex items-center justify-between px-5 py-2.5 text-sm"><span>{h.name}</span><Badge tone="brand">{fmtDate(h.date, { weekday: 'short', day: '2-digit', month: 'short' })}</Badge></li>)}
                {p.holidays.length === 0 && <li className="px-5 py-6 text-center text-sm text-muted">No holidays yet.</li>}
              </ul>
            </Card>
          ))}
        </div>
      )}
      {edit !== undefined && <PolicyEditor initial={edit} onClose={() => setEdit(undefined)} />}
      {assign && <AssignStaffModal open onClose={() => setAssign(null)} title={`Apply “${assign.name}” to staff`} listPath={`/admin/holidays/policies/${assign.id}/staff`} savePath={`/admin/holidays/policies/${assign.id}/assign`} invalidate={['/admin/holidays']} />}
      {dialog}
    </>
  );
}

function WeeklyBusiness() {
  const q = useAdmin<{ days: number[] }>('/admin/holidays/weekly/business');
  const [days, setDays] = useState<number[] | null>(null);
  const current = days ?? q.data?.data.days ?? [];
  const save = useAction(() => adminApi.put('/admin/holidays/weekly/business', { days: current }), { invalidate: ['/admin/holidays'], onSuccess: () => setDays(null) });
  if (q.error) return <ErrorState message={q.error.message} />;
  if (!q.data) return <Skeleton className="h-40" />;
  return (
    <Card>
      <CardHeader title="Weekly offs for the whole business" subtitle="Staff don't need to punch on these days and they are excluded from working days in payroll." />
      <CardBody className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-4">
          {WEEKDAYS.map((d, i) => (
            <Checkbox key={d} label={d} checked={current.includes(i)} onChange={(e) => setDays((current.includes(i) ? current.filter((x) => x !== i) : [...current, i]).sort())} className="rounded-lg border border-line px-3 py-2" />
          ))}
        </div>
        <Button loading={save.isPending} disabled={days === null} onClick={() => save.mutate()}>Save weekly offs</Button>
      </CardBody>
    </Card>
  );
}

interface StaffWeekly { id: number; name: string; department: string | null; photo: string | null; days: number[]; custom: boolean }

function WeeklyStaff() {
  const q = useAdmin<StaffWeekly[]>('/admin/holidays/weekly/staff');
  const [picked, setPicked] = useState<number[]>([]);
  const [days, setDays] = useState<number[]>([]);
  const save = useAction((reset: boolean) => adminApi.put('/admin/holidays/weekly/staff', { staff_ids: picked, days: reset ? [] : days }), { invalidate: ['/admin/holidays'], onSuccess: () => setPicked([]) });
  if (q.error) return <ErrorState message={q.error.message} />;
  if (!q.data) return <Skeleton className="h-40" />;
  return (
    <Card>
      <CardHeader title="Individual weekly offs" subtitle="Override the business weekly offs for selected staff (e.g. a Wednesday off)." />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {WEEKDAYS.map((d, i) => <Checkbox key={d} label={d.slice(0, 3)} checked={days.includes(i)} onChange={(e) => setDays((p) => (e.target.checked ? [...p, i] : p.filter((x) => x !== i)))} />)}
          <Button size="sm" disabled={!picked.length || !days.length} loading={save.isPending} onClick={() => save.mutate(false)}>Apply to {picked.length} selected</Button>
          <Button size="sm" variant="secondary" disabled={!picked.length} onClick={() => save.mutate(true)}>Reset to business default</Button>
        </div>
        <ul className="divide-y divide-line rounded-lg border border-line">
          {q.data.data.map((s) => (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface2">
                <input type="checkbox" className="size-4 accent-brand" checked={picked.includes(s.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, s.id] : p.filter((x) => x !== s.id)))} />
                <Avatar name={s.name} src={s.photo} size={28} />
                <span className="flex-1 text-sm">{s.name}</span>
                <span className="text-xs text-muted">{s.custom ? s.days.map((d) => WEEKDAYS[d].slice(0, 3)).join(', ') : 'Business default'}</span>
              </label>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

export default function HolidaysPage() {
  const [tab, setTab] = useState<'templates' | 'weekly' | 'staff'>('templates');
  return (
    <>
      <PageHeader back={<BackToSettings />} title="Holidays" subtitle="Public holidays and weekly offs" />
      <div className="mb-6"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'templates', label: 'Holiday templates' }, { id: 'weekly', label: 'Weekly offs' }, { id: 'staff', label: 'Per-staff weekly offs' }]} /></div>
      {tab === 'templates' && <Templates />}
      {tab === 'weekly' && <WeeklyBusiness />}
      {tab === 'staff' && <WeeklyStaff />}
    </>
  );
}
