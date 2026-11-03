'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Misc';
import { adminApi, business as businessStore } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { errMsg, useAdmin } from '@/lib/query';
import type { AdminSession, BusinessDto } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';

interface Ref { id: number; name: string }
interface Tz { timezone: string; display: string }

/** Create a new business or edit the current one. */
export function BusinessForm({ initial }: { initial?: BusinessDto }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { refresh } = useAdminSession();
  const countries = useAdmin<Ref[]>('/auth/reference/countries');
  const categories = useAdmin<Ref[]>('/auth/reference/categories');
  const timezones = useAdmin<Tz[]>(initial ? null : '/auth/reference/timezones');
  const [f, setF] = useState({
    name: initial?.name ?? '',
    business_address: initial?.business_address ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    country_id: String(initial?.country_id ?? ''),
    category_id: String(initial?.category_id ?? ''),
    latitude: String(initial?.latitude ?? ''),
    longitude: String(initial?.longitude ?? ''),
    bank_account: initial?.bank_account ?? '',
    salary_duration: initial?.salary_duration ?? 'monthly',
    shift_hour: String(initial?.shift_hour ?? 8),
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return toast.error('Business name is required');
    setBusy(true);
    try {
      const body = { ...f, country_id: f.country_id || undefined, category_id: f.category_id || undefined, latitude: f.latitude === '' ? undefined : Number(f.latitude), longitude: f.longitude === '' ? undefined : Number(f.longitude), shift_hour: Number(f.shift_hour) || 8 };
      if (initial) {
        await adminApi.put('/admin/business', body);
        if (logo) {
          const fd = new FormData();
          fd.append('logo', logo);
          await adminApi.form('POST', '/admin/business/logo', fd);
        }
        toast.success('Business updated');
        await qc.invalidateQueries();
        refresh();
      } else {
        const res = await adminApi.post<AdminSession>('/admin/businesses', body);
        businessStore.set(res.data.current_business_id!);
        toast.success('Business added');
        await qc.invalidateQueries();
        refresh();
        router.replace('/admin/dashboard');
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <Card>
        <CardHeader title="Business" />
        <CardBody className="space-y-4">
          {initial && (
            <div className="flex items-center gap-4">
              <Avatar name={initial.name} src={initial.logo} size={64} />
              <Field label="Logo"><Input type="file" accept="image/*" className="h-auto py-2" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} /></Field>
            </div>
          )}
          <Field label="Business name" required>{(id) => <Input id={id} value={f.name} onChange={set('name')} autoFocus />}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">{(id) => <Select id={id} value={f.category_id} onChange={set('category_id')}><option value="">Select…</option>{categories.data?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}</Field>
            <Field label="Country">{(id) => <Select id={id} value={f.country_id} onChange={set('country_id')}><option value="">Select…</option>{countries.data?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}</Field>
            <Field label="City">{(id) => <Input id={id} value={f.city} onChange={set('city')} />}</Field>
            <Field label="State">{(id) => <Input id={id} value={f.state} onChange={set('state')} />}</Field>
          </div>
          <Field label="Address">{(id) => <Input id={id} value={f.business_address} onChange={set('business_address')} />}</Field>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Work & pay" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Working hours per day" hint="Default for flexible shifts."><Input type="number" min="1" max="24" step="0.5" value={f.shift_hour} onChange={set('shift_hour')} /></Field>
          <Field label="Salary is paid">{(id) => <Select id={id} value={f.salary_duration} onChange={set('salary_duration')}><option value="monthly">By hours worked (monthly)</option><option value="daily">By days present (daily)</option></Select>}</Field>
          {!initial && <Field label="Timezone" className="sm:col-span-2">{(id) => <Select id={id} value={f.timezone} onChange={set('timezone')}>{timezones.data?.data.map((t) => <option key={t.timezone} value={t.timezone}>{t.display}</option>)}{!timezones.data && <option>{f.timezone}</option>}</Select>}</Field>}
          <Field label="Office latitude" hint="Used as the geo-fence centre for staff without their own location.">{(id) => <Input id={id} type="number" step="any" value={f.latitude} onChange={set('latitude')} />}</Field>
          <Field label="Office longitude">{(id) => <Input id={id} type="number" step="any" value={f.longitude} onChange={set('longitude')} />}</Field>
          <Field label="Bank account" className="sm:col-span-2">{(id) => <Input id={id} value={f.bank_account} onChange={set('bank_account')} />}</Field>
        </CardBody>
      </Card>
      <div className="flex justify-end gap-3">
        <LinkButton href="/admin/settings" variant="secondary">Cancel</LinkButton>
        <Button type="submit" loading={busy}>{initial ? 'Save changes' : 'Add business'}</Button>
      </div>
    </form>
  );
}
