'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { adminApi } from '@/lib/api';
import { useAction } from '@/lib/query';
import type { Shift } from '@/lib/types';
import clsx from 'clsx';

interface DetailState { id?: number; name: string; start_time: string; end_time: string; break_minutes: string }

const TYPES = [
  { id: 1, name: 'Fixed shift', desc: 'Same start and end time every day' },
  { id: 2, name: 'Rotational shift', desc: 'Rotate between several shifts' },
  { id: 3, name: 'Flexible shift', desc: 'Work a set number of hours any time' },
] as const;

const blank = (): DetailState => ({ name: '', start_time: '09:00', end_time: '18:00', break_minutes: '60' });

function hours(d: DetailState): string {
  const [sh, sm] = d.start_time.split(':').map(Number);
  const [eh, em] = d.end_time.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 1440;
  mins -= Number(d.break_minutes) || 0;
  if (mins <= 0) return 'invalid';
  return `${Math.floor(mins / 60)}h ${mins % 60}m payable`;
}

export function ShiftForm({ initial }: { initial?: Shift }) {
  const router = useRouter();
  const editing = !!initial;
  const [type, setType] = useState<1 | 2 | 3>(initial?.shift_type_id ?? 1);
  const [name, setName] = useState(initial?.name ?? '');
  const [workingHours, setWorkingHours] = useState(String(initial?.details[0]?.total_payable_hours ?? 8));
  const [details, setDetails] = useState<DetailState[]>(
    initial && initial.shift_type_id !== 3
      ? initial.details.map((d) => ({ id: d.id, name: d.name ?? '', start_time: (d.start_time ?? '09:00').slice(0, 5), end_time: (d.end_time ?? '18:00').slice(0, 5), break_minutes: String(d.break_minutes) }))
      : type === 2 ? [blank(), blank()] : [blank()],
  );

  const save = useAction(
    () => {
      const body = type === 3
        ? { shift_type_id: 3, name, working_hours: Number(workingHours) }
        : { shift_type_id: type, name, details: details.map((d) => ({ id: d.id, name: d.name || undefined, start_time: d.start_time, end_time: d.end_time, break_minutes: Number(d.break_minutes) || 0 })) };
      return editing ? adminApi.put<Shift>(`/admin/shifts/${initial!.id}`, body) : adminApi.post<Shift>('/admin/shifts', body);
    },
    { invalidate: ['/admin/shifts'], onSuccess: (res) => router.replace(`/admin/settings/shifts/${(res.data as Shift).id}`) },
  );

  const setDetail = (i: number, patch: Partial<DetailState>) => setDetails((p) => p.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const pickType = (t: 1 | 2 | 3) => {
    setType(t);
    setDetails(t === 2 ? [blank(), blank()] : [blank()]);
  };
  const invalid = !name.trim() || (type === 3 ? !(Number(workingHours) > 0) : details.some((d) => hours(d) === 'invalid'));

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!invalid) save.mutate(); }} className="space-y-6">
      {!editing && (
        <Card>
          <CardHeader title="Shift type" />
          <CardBody className="grid gap-3 sm:grid-cols-3">
            {TYPES.map((t) => (
              <button key={t.id} type="button" onClick={() => pickType(t.id)} aria-pressed={type === t.id} className={clsx('rounded-xl border p-4 text-left transition', type === t.id ? 'border-brand bg-brandsoft' : 'border-line hover:bg-surface2')}>
                <p className="font-semibold">{t.name}</p>
                <p className="mt-1 text-sm text-muted">{t.desc}</p>
              </button>
            ))}
          </CardBody>
        </Card>
      )}
      <Card>
        <CardHeader title="Details" />
        <CardBody className="space-y-5">
          <Field label="Shift name" required>{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. General shift" autoFocus />}</Field>
          {type === 3 ? (
            <Field label="Working hours per day" required hint="Staff can punch at any time; overtime starts after this many hours.">
              {(id) => <Input id={id} type="number" min="0.5" max="24" step="0.25" value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} className="w-40" />}
            </Field>
          ) : (
            <div className="space-y-4">
              {details.map((d, i) => (
                <div key={d.id ?? i} className="rounded-xl border border-line p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium">{type === 2 ? `Shift ${i + 1}` : 'Timing'} <span className={clsx('ml-2 text-xs font-normal', hours(d) === 'invalid' ? 'text-danger' : 'text-muted')}>{hours(d)}</span></p>
                    {type === 2 && details.length > 2 && <button type="button" aria-label={`Remove shift ${i + 1}`} onClick={() => setDetails((p) => p.filter((_, idx) => idx !== i))} className="rounded-lg p-1.5 text-danger hover:bg-dangersoft"><Trash2 className="size-4" /></button>}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-4">
                    {type === 2 && <Field label="Name" className="sm:col-span-4">{(id) => <Input id={id} value={d.name} onChange={(e) => setDetail(i, { name: e.target.value })} placeholder="Morning / Evening / Night" />}</Field>}
                    <Field label="Start" required>{(id) => <Input id={id} type="time" value={d.start_time} onChange={(e) => setDetail(i, { start_time: e.target.value })} />}</Field>
                    <Field label="End" required>{(id) => <Input id={id} type="time" value={d.end_time} onChange={(e) => setDetail(i, { end_time: e.target.value })} />}</Field>
                    <Field label="Break (minutes)">{(id) => <Input id={id} type="number" min="0" max="480" value={d.break_minutes} onChange={(e) => setDetail(i, { break_minutes: e.target.value })} />}</Field>
                  </div>
                </div>
              ))}
              {type === 2 && <Button type="button" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setDetails((p) => [...p, blank()])}>Add another shift</Button>}
            </div>
          )}
        </CardBody>
      </Card>
      <div className="flex justify-end gap-3">
        <LinkButton href="/admin/settings/shifts" variant="secondary">Cancel</LinkButton>
        <Button type="submit" loading={save.isPending} disabled={invalid}>{editing ? 'Save changes' : 'Create shift'}</Button>
      </div>
    </form>
  );
}
