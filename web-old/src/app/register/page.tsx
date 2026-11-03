'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { ApiError, adminApi, business, publicApi, tokens } from '@/lib/api';
import type { AdminSession } from '@/lib/types';
import { useApi } from '@/lib/query';

interface Ref { id: number; name: string }
interface Tz { timezone: string; display: string }

export default function RegisterPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const countries = useApi<Ref[]>('admin', '/auth/reference/countries');
  const categories = useApi<Ref[]>('admin', '/auth/reference/categories');
  const timezones = useApi<Tz[]>('admin', '/auth/reference/timezones');
  const [f, setF] = useState({ name: '', email: '', business_name: '', category_id: '', country_id: '', city: '', business_address: '', shift_hour: '8', salary_duration: 'monthly', timezone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokens.get('admin')) router.replace('/login');
    else setReady(true);
    setF((p) => ({ ...p, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata' }));
  }, [router]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.name.trim()) errs.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = 'Enter a valid email';
    if (!f.business_name.trim()) errs.business_name = 'Enter your business name';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminApi.post<AdminSession>('/auth/admin/register-business', {
        ...f,
        category_id: f.category_id || undefined,
        country_id: f.country_id || undefined,
        shift_hour: Number(f.shift_hour) || 8,
      });
      tokens.set('admin', res.data.token);
      if (res.data.current_business_id) business.set(res.data.current_business_id);
      router.replace('/admin/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the business');
      setBusy(false);
    }
  }

  if (!ready) return null;
  return (
    <AuthShell title="Set up your business" subtitle="This takes a minute. Your free trial starts now.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" required error={errors.name}>{(id) => <Input id={id} value={f.name} onChange={set('name')} autoFocus />}</Field>
          <Field label="Email" required error={errors.email}>{(id) => <Input id={id} type="email" value={f.email} onChange={set('email')} />}</Field>
        </div>
        <Field label="Business name" required error={errors.business_name}>{(id) => <Input id={id} value={f.business_name} onChange={set('business_name')} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            {(id) => (
              <Select id={id} value={f.category_id} onChange={set('category_id')}>
                <option value="">Select…</option>
                {categories.data?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Country">
            {(id) => (
              <Select id={id} value={f.country_id} onChange={set('country_id')}>
                <option value="">Select…</option>
                {countries.data?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City">{(id) => <Input id={id} value={f.city} onChange={set('city')} />}</Field>
          <Field label="Address">{(id) => <Input id={id} value={f.business_address} onChange={set('business_address')} />}</Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Working hours per day" hint="Used for the default flexible shift.">
            {(id) => <Input id={id} type="number" min="1" max="24" step="0.5" value={f.shift_hour} onChange={set('shift_hour')} />}
          </Field>
          <Field label="Salary is paid">
            {(id) => (
              <Select id={id} value={f.salary_duration} onChange={set('salary_duration')}>
                <option value="monthly">By hours worked (monthly)</option>
                <option value="daily">By days present (daily)</option>
              </Select>
            )}
          </Field>
        </div>
        <Field label="Timezone">
          {(id) => (
            <Select id={id} value={f.timezone} onChange={set('timezone')}>
              {timezones.data?.data.map((t) => <option key={t.timezone} value={t.timezone}>{t.display}</option>)}
              {!timezones.data && <option value={f.timezone}>{f.timezone}</option>}
            </Select>
          )}
        </Field>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <Button type="submit" loading={busy} size="lg" className="w-full">Create my business</Button>
      </form>
    </AuthShell>
  );
}
