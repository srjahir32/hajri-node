'use client';

import { useEffect, useState } from 'react';
import { BackToSettings } from '@/components/settings/BackLink';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, PageHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { ErrorState, PageLoader } from '@/components/ui/Misc';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';

interface SettingsDto { punch_in_time_tolerance: number; location_update_interval: number; location_api_call_interval: number; staff_allowed_radius: number; timezone: string }
interface Tz { timezone: string; display: string }

export default function AttendanceSettingsPage() {
  const q = useAdmin<SettingsDto>('/admin/settings');
  const tz = useAdmin<Tz[]>('/auth/reference/timezones');
  const [f, setF] = useState<Record<keyof SettingsDto, string> | null>(null);
  useEffect(() => {
    if (q.data) setF(Object.fromEntries(Object.entries(q.data.data).map(([k, v]) => [k, String(v)])) as Record<keyof SettingsDto, string>);
  }, [q.data]);
  const save = useAction(() => adminApi.put('/admin/settings', { ...f, punch_in_time_tolerance: Number(f!.punch_in_time_tolerance), location_update_interval: Number(f!.location_update_interval), location_api_call_interval: Number(f!.location_api_call_interval), staff_allowed_radius: Number(f!.staff_allowed_radius) }), { invalidate: ['/admin/settings', '/admin/attendance'] });

  if (q.error) return <ErrorState message={q.error.message} />;
  if (!f) return <PageLoader />;
  const set = (k: keyof SettingsDto) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <PageHeader back={<BackToSettings />} title="Attendance & location" />
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader title="Punch rules" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Late tolerance (minutes)" hint="Punching in within this time after shift start is still counted as on time.">{(id) => <Input id={id} type="number" min="0" max="240" value={f.punch_in_time_tolerance} onChange={set('punch_in_time_tolerance')} />}</Field>
            <Field label="Allowed radius (meters)" hint="Geo-fenced staff punching further than this from their location trigger an alert.">{(id) => <Input id={id} type="number" min="10" max="5000" value={f.staff_allowed_radius} onChange={set('staff_allowed_radius')} />}</Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Live location tracking" subtitle="How often the staff app records and uploads GPS points." />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Record a point every (seconds)">{(id) => <Input id={id} type="number" min="30" value={f.location_update_interval} onChange={set('location_update_interval')} />}</Field>
            <Field label="Upload to server every (seconds)">{(id) => <Input id={id} type="number" min="30" value={f.location_api_call_interval} onChange={set('location_api_call_interval')} />}</Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Timezone" subtitle="Used for “today”, shift times and reports. Staff can override their own timezone." />
          <CardBody>
            <Field label="Business timezone">{(id) => <Select id={id} value={f.timezone} onChange={set('timezone')}>{tz.data?.data.map((t) => <option key={t.timezone} value={t.timezone}>{t.display}</option>)}{!tz.data && <option>{f.timezone}</option>}</Select>}</Field>
          </CardBody>
        </Card>
        <Button type="submit" loading={save.isPending}>Save settings</Button>
      </form>
    </>
  );
}
