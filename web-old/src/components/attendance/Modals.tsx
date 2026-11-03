'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { adminApi } from '@/lib/api';
import { useAction } from '@/lib/query';

const INVALIDATE = ['/admin/attendance', '/admin/staff', '/admin/dashboard'];

export function MarkStatusModal({ open, onClose, staffId, staffName, date }: { open: boolean; onClose: () => void; staffId: number; staffName: string; date: string }) {
  const [status, setStatus] = useState<'Present' | 'Absent' | 'Half Day'>('Present');
  const [note, setNote] = useState('');
  const save = useAction(() => adminApi.post('/admin/attendance/status', { staff_id: staffId, date, status, note: note || undefined }), { invalidate: INVALIDATE, onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} title={`Mark attendance – ${staffName}`} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-muted">Date: <b className="text-ink">{date}</b></p>
        <div className="grid grid-cols-3 gap-2">
          {(['Present', 'Half Day', 'Absent'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)} aria-pressed={status === s} className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${status === s ? 'border-brand bg-brandsoft text-brand' : 'border-line hover:bg-surface2'}`}>{s}</button>
          ))}
        </div>
        <Field label="Note (optional)">{(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" />}</Field>
      </div>
    </Modal>
  );
}

export function ManualPunchModal({ open, onClose, staffId, staffName, date }: { open: boolean; onClose: () => void; staffId: number; staffName: string; date: string }) {
  const [inTime, setIn] = useState('09:00');
  const [outTime, setOut] = useState('18:00');
  const [note, setNote] = useState('');
  const save = useAction(() => adminApi.post('/admin/attendance/manual', { staff_id: staffId, date, in_time: inTime, out_time: outTime || null, note: note || undefined }), { invalidate: INVALIDATE, onSuccess: onClose });
  return (
    <Modal open={open} onClose={onClose} title={`Add punch – ${staffName}`} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Add punch</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-muted">Date: <b className="text-ink">{date}</b> (times are in the staff member&apos;s timezone)</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Punch in" required>{(id) => <Input id={id} type="time" value={inTime} onChange={(e) => setIn(e.target.value)} />}</Field>
          <Field label="Punch out">{(id) => <Input id={id} type="time" value={outTime} onChange={(e) => setOut(e.target.value)} />}</Field>
        </div>
        <Field label="Note">{(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" />}</Field>
      </div>
    </Modal>
  );
}

export function NoteModal({ open, onClose, staffId, staffName, date }: { open: boolean; onClose: () => void; staffId: number; staffName: string; date: string }) {
  const [note, setNote] = useState('');
  const save = useAction(() => adminApi.post('/admin/attendance/note', { staff_id: staffId, date, note }), { invalidate: INVALIDATE, onSuccess: () => { setNote(''); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title={`Add note – ${staffName}`} size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!note.trim()} loading={save.isPending} onClick={() => save.mutate()}>Save note</Button></>}>
      <Field label={`Note for ${date}`}>{(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />}</Field>
    </Modal>
  );
}

export function AddLeaveModal({ open, onClose, staff }: { open: boolean; onClose: () => void; staff: { id: number; name: string }[] }) {
  const [f, setF] = useState({ staff_id: '', leave_type: 'Full Day', shift_type: 'First Half', is_unpaid: 'false', reason: '', start_date: '', end_date: '' });
  const save = useAction(
    () => adminApi.post('/admin/attendance/leaves', { ...f, staff_id: Number(f.staff_id), is_unpaid: f.is_unpaid === 'true', shift_type: f.leave_type === 'Half Day' ? f.shift_type : null, end_date: f.end_date || f.start_date }),
    { invalidate: ['/admin/attendance', '/admin/dashboard'], success: 'Leave added', onSuccess: onClose },
  );
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const valid = f.staff_id && f.reason.trim() && f.start_date;
  return (
    <Modal open={open} onClose={onClose} title="Add leave for staff" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!valid} loading={save.isPending} onClick={() => save.mutate()}>Add leave</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Staff" required className="sm:col-span-2">
          {(id) => (
            <Select id={id} value={f.staff_id} onChange={set('staff_id')}>
              <option value="">Select staff…</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Type">
          {(id) => <Select id={id} value={f.leave_type} onChange={set('leave_type')}><option>Full Day</option><option>Half Day</option></Select>}
        </Field>
        {f.leave_type === 'Half Day' ? (
          <Field label="Half">{(id) => <Select id={id} value={f.shift_type} onChange={set('shift_type')}><option>First Half</option><option>Last Half</option></Select>}</Field>
        ) : <div />}
        <Field label="From" required>{(id) => <Input id={id} type="date" value={f.start_date} onChange={set('start_date')} />}</Field>
        <Field label="To">{(id) => <Input id={id} type="date" value={f.end_date} min={f.start_date} onChange={set('end_date')} />}</Field>
        <Field label="Paid?" className="sm:col-span-2" hint="Paid leave uses the staff member's leave policy balance.">
          {(id) => <Select id={id} value={f.is_unpaid} onChange={set('is_unpaid')}><option value="false">Paid (deduct from balance)</option><option value="true">Unpaid</option></Select>}
        </Field>
        <Field label="Reason" required className="sm:col-span-2">{(id) => <Textarea id={id} value={f.reason} onChange={set('reason')} className="min-h-20" />}</Field>
      </div>
    </Modal>
  );
}
