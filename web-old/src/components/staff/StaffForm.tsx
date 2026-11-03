'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input, Select, ToggleRow } from '@/components/ui/Field';
import { adminApi, ApiError } from '@/lib/api';
import { useAdmin } from '@/lib/query';
import type { Department, Shift } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';

export interface StaffDetail {
  id: number;
  name: string;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  country_code: string | null;
  phone_number: string;
  timezone: string | null;
  salary_amount: number | null;
  salary_cycle: number | null;
  department_id: number | null;
  is_remote: number;
  auto_approve_attendance: number;
  is_geo_fencing: number;
  photos: { id: number; url: string }[];
  documents: { id: number; url: string; name: string | null }[];
  profile: { date_of_birth: string | null; gender: string | null; address1: string | null; address2: string | null; city: string | null; state: string | null; country_id: number | null; pincode: string | null; latitude: number | null; longitude: number | null } | null;
  info: { date_of_joining: string | null; designation: string | null; UAN_number: string | null; ESI_number: string | null; PAN_number: string | null } | null;
  bank: { bank_name: string | null; account_holder_name: string | null; account_number: string | null; IFSC_code: string | null; UPI_id: string | null } | null;
  shift: { working_shift_id: number } | null;
}

const empty = {
  name: '', middle_name: '', last_name: '', email: '', country_code: '91', phone_number: '', department_id: '', working_shift_id: '',
  salary_amount: '', salary_cycle: '1', date_of_joining: '', designation: '', UAN_number: '', ESI_number: '', PAN_number: '',
  bank_name: '', account_holder_name: '', account_number: '', IFSC_code: '', UPI_id: '',
  date_of_birth: '', gender: '', address1: '', address2: '', city: '', state: '', country_id: '', pincode: '', latitude: '', longitude: '',
};
type Form = typeof empty;

const s = (v: string | number | null | undefined) => (v === null || v === undefined ? '' : String(v));

function fromDetail(d: StaffDetail): Form & { is_remote: boolean; auto_approve_attendance: boolean; is_geo_fencing: boolean } {
  return {
    name: s(d.name), middle_name: s(d.middle_name), last_name: s(d.last_name), email: s(d.email), country_code: s(d.country_code) || '91', phone_number: s(d.phone_number),
    department_id: s(d.department_id), working_shift_id: s(d.shift?.working_shift_id), salary_amount: s(d.salary_amount), salary_cycle: s(d.salary_cycle) || '1',
    date_of_joining: s(d.info?.date_of_joining), designation: s(d.info?.designation), UAN_number: s(d.info?.UAN_number), ESI_number: s(d.info?.ESI_number), PAN_number: s(d.info?.PAN_number),
    bank_name: s(d.bank?.bank_name), account_holder_name: s(d.bank?.account_holder_name), account_number: s(d.bank?.account_number), IFSC_code: s(d.bank?.IFSC_code), UPI_id: s(d.bank?.UPI_id),
    date_of_birth: s(d.profile?.date_of_birth), gender: s(d.profile?.gender), address1: s(d.profile?.address1), address2: s(d.profile?.address2), city: s(d.profile?.city), state: s(d.profile?.state),
    country_id: s(d.profile?.country_id), pincode: s(d.profile?.pincode), latitude: s(d.profile?.latitude), longitude: s(d.profile?.longitude),
    is_remote: !!d.is_remote, auto_approve_attendance: !!d.auto_approve_attendance, is_geo_fencing: !!d.is_geo_fencing,
  };
}

export function StaffForm({ initial }: { initial?: StaffDetail }) {
  const router = useRouter();
  const qc = useQueryClient();
  const editing = !!initial;
  const departments = useAdmin<Department[]>('/admin/departments');
  const shifts = useAdmin<Shift[]>('/admin/shifts');
  const countries = useAdmin<{ id: number; name: string }[]>('/auth/reference/countries');

  const [f, setF] = useState(() => (initial ? fromDetail(initial) : { ...empty, is_remote: false, auto_approve_attendance: false, is_geo_fencing: false }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [docs, setDocs] = useState<File[]>([]);
  const [removePhotos, setRemovePhotos] = useState<number[]>([]);
  const [removeDocs, setRemoveDocs] = useState<number[]>([]);

  // default shift = first shift for new staff
  useEffect(() => {
    if (!editing && !f.working_shift_id && shifts.data?.data[0]) setF((p) => ({ ...p, working_shift_id: String(shifts.data!.data[0].id) }));
  }, [editing, f.working_shift_id, shifts.data]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const previews = useMemo(() => photos.map((p) => URL.createObjectURL(p)), [photos]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.name.trim()) errs.name = 'Name is required';
    if (f.phone_number.replace(/\D/g, '').length < 6) errs.phone_number = 'Enter a valid phone number';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) errs.email = 'Enter a valid email';
    setErrors(errs);
    if (Object.keys(errs).length) return toast.error('Please fix the highlighted fields');

    const fd = new FormData();
    (Object.keys(f) as (keyof typeof f)[]).forEach((k) => {
      const v = f[k];
      if (typeof v === 'boolean') fd.append(k, v ? '1' : '0');
      else if (v !== '' || editing) fd.append(k, v);
    });
    photos.forEach((p) => fd.append('photos', p));
    docs.forEach((p) => fd.append('documents', p));
    if (removePhotos.length) fd.append('remove_photo_ids', removePhotos.join(','));
    if (removeDocs.length) fd.append('remove_document_ids', removeDocs.join(','));

    setBusy(true);
    try {
      const res = editing ? await adminApi.form<StaffDetail>('PUT', `/admin/staff/${initial!.id}`, fd) : await adminApi.form<StaffDetail>('POST', '/admin/staff', fd);
      toast.success(editing ? 'Staff updated' : 'Staff added');
      await qc.invalidateQueries();
      router.replace(`/admin/staff/${res.data.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save staff');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader title="Basic details" />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="First name" required error={errors.name}>{(id) => <Input id={id} value={f.name} onChange={set('name')} autoFocus />}</Field>
          <Field label="Middle name">{(id) => <Input id={id} value={f.middle_name} onChange={set('middle_name')} />}</Field>
          <Field label="Last name">{(id) => <Input id={id} value={f.last_name} onChange={set('last_name')} />}</Field>
          <Field label="Country code" required>{(id) => <Input id={id} value={f.country_code} onChange={set('country_code')} inputMode="numeric" />}</Field>
          <Field label="Mobile number" required error={errors.phone_number} hint="Used for OTP login">{(id) => <Input id={id} value={f.phone_number} onChange={set('phone_number')} inputMode="numeric" />}</Field>
          <Field label="Email" error={errors.email}>{(id) => <Input id={id} type="email" value={f.email} onChange={set('email')} />}</Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Work & salary" />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Department">
            {(id) => (
              <Select id={id} value={f.department_id} onChange={set('department_id')}>
                <option value="">No department</option>
                {departments.data?.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Shift">
            {(id) => (
              <Select id={id} value={f.working_shift_id} onChange={set('working_shift_id')}>
                {shifts.data?.data.map((sh) => <option key={sh.id} value={sh.id}>{sh.name} ({sh.shift_type})</option>)}
              </Select>
            )}
          </Field>
          <Field label="Designation">{(id) => <Input id={id} value={f.designation} onChange={set('designation')} />}</Field>
          <Field label="Salary amount">{(id) => <Input id={id} type="number" min="0" step="0.01" value={f.salary_amount} onChange={set('salary_amount')} />}</Field>
          <Field label="Salary cycle">
            {(id) => (
              <Select id={id} value={f.salary_cycle} onChange={set('salary_cycle')}>
                <option value="1">Monthly</option>
                <option value="2">Weekly</option>
                <option value="3">Daily</option>
              </Select>
            )}
          </Field>
          <Field label="Date of joining">{(id) => <Input id={id} type="date" value={f.date_of_joining} onChange={set('date_of_joining')} />}</Field>
          <Field label="UAN number">{(id) => <Input id={id} value={f.UAN_number} onChange={set('UAN_number')} />}</Field>
          <Field label="ESI number">{(id) => <Input id={id} value={f.ESI_number} onChange={set('ESI_number')} />}</Field>
          <Field label="PAN number">{(id) => <Input id={id} value={f.PAN_number} onChange={set('PAN_number')} />}</Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Attendance rules" subtitle="How this person marks attendance" />
        <CardBody className="grid gap-3 md:grid-cols-3">
          <ToggleRow title="Remote staff" description="Punches need approval" checked={f.is_remote} onChange={(v) => setF((p) => ({ ...p, is_remote: v }))} />
          <ToggleRow title="Auto-approve punches" description="Skip approval for remote punches" checked={f.auto_approve_attendance} onChange={(v) => setF((p) => ({ ...p, auto_approve_attendance: v }))} />
          <ToggleRow title="Geo-fencing" description="Alert when punching outside the allowed radius" checked={f.is_geo_fencing} onChange={(v) => setF((p) => ({ ...p, is_geo_fencing: v }))} />
        </CardBody>
        {f.is_geo_fencing && (
          <CardBody className="grid gap-4 border-t border-line sm:grid-cols-2">
            <Field label="Allowed location – latitude" hint="Leave empty to use the business location"><Input type="number" step="any" value={f.latitude} onChange={set('latitude')} /></Field>
            <Field label="Allowed location – longitude"><Input type="number" step="any" value={f.longitude} onChange={set('longitude')} /></Field>
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader title="Bank details" />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Bank name">{(id) => <Input id={id} value={f.bank_name} onChange={set('bank_name')} />}</Field>
          <Field label="Account holder">{(id) => <Input id={id} value={f.account_holder_name} onChange={set('account_holder_name')} />}</Field>
          <Field label="Account number">{(id) => <Input id={id} value={f.account_number} onChange={set('account_number')} inputMode="numeric" />}</Field>
          <Field label="IFSC code">{(id) => <Input id={id} value={f.IFSC_code} onChange={set('IFSC_code')} />}</Field>
          <Field label="UPI ID">{(id) => <Input id={id} value={f.UPI_id} onChange={set('UPI_id')} />}</Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Personal details" />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Date of birth">{(id) => <Input id={id} type="date" value={f.date_of_birth} onChange={set('date_of_birth')} />}</Field>
          <Field label="Gender">
            {(id) => (
              <Select id={id} value={f.gender} onChange={set('gender')}>
                <option value="">Select…</option><option>Male</option><option>Female</option><option>Other</option>
              </Select>
            )}
          </Field>
          <Field label="Pincode">{(id) => <Input id={id} value={f.pincode} onChange={set('pincode')} inputMode="numeric" />}</Field>
          <Field label="Address line 1" className="sm:col-span-3">{(id) => <Input id={id} value={f.address1} onChange={set('address1')} />}</Field>
          <Field label="Address line 2" className="sm:col-span-3">{(id) => <Input id={id} value={f.address2} onChange={set('address2')} />}</Field>
          <Field label="City">{(id) => <Input id={id} value={f.city} onChange={set('city')} />}</Field>
          <Field label="State">{(id) => <Input id={id} value={f.state} onChange={set('state')} />}</Field>
          <Field label="Country">
            {(id) => (
              <Select id={id} value={f.country_id} onChange={set('country_id')}>
                <option value="">Select…</option>
                {countries.data?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Photos & documents" subtitle="Images up to 10 MB. PDFs are accepted for documents." />
        <CardBody className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Field label="Profile photos">
              {(id) => <Input id={id} type="file" accept="image/*" multiple onChange={(e) => setPhotos(Array.from(e.target.files ?? []))} className="h-auto py-2" />}
            </Field>
            <div className="flex flex-wrap gap-2">
              {initial?.photos.filter((p) => !removePhotos.includes(p.id)).map((p) => (
                <div key={p.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="size-16 rounded-lg object-cover" />
                  <button type="button" aria-label="Remove photo" onClick={() => setRemovePhotos((r) => [...r, p.id])} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-danger text-xs text-white">×</button>
                </div>
              ))}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {previews.map((u) => <img key={u} src={u} alt="" className="size-16 rounded-lg object-cover ring-2 ring-brand" />)}
            </div>
          </div>
          <div className="space-y-3">
            <Field label="ID documents">
              {(id) => <Input id={id} type="file" accept="image/*,application/pdf" multiple onChange={(e) => setDocs(Array.from(e.target.files ?? []))} className="h-auto py-2" />}
            </Field>
            <ul className="space-y-1 text-sm">
              {initial?.documents.filter((d) => !removeDocs.includes(d.id)).map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-1.5">
                  <a href={d.url} target="_blank" rel="noreferrer" className="truncate text-brand hover:underline">{d.name ?? 'Document'}</a>
                  <button type="button" className="text-xs text-danger" onClick={() => setRemoveDocs((r) => [...r, d.id])}>Remove</button>
                </li>
              ))}
              {docs.map((d) => <li key={d.name} className="rounded-lg bg-brandsoft px-3 py-1.5 text-brand">{d.name}</li>)}
            </ul>
          </div>
        </CardBody>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <LinkButton href={editing ? `/admin/staff/${initial!.id}` : '/admin/staff'} variant="secondary">Cancel</LinkButton>
        <Button type="submit" loading={busy}>{editing ? 'Save changes' : 'Add staff'}</Button>
      </div>
    </form>
  );
}
