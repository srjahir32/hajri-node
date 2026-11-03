'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, PageHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Misc';
import { staffApi } from '@/lib/api';
import { useStaffSession } from '@/lib/auth';
import { useAction, useStaff } from '@/lib/query';

interface Tz { timezone: string; display: string }

export default function EmployeeProfilePage() {
  const { staff, refresh } = useStaffSession();
  const tz = useStaff<Tz[]>('/auth/reference/timezones');
  const [f, setF] = useState({ name: staff.name, middle_name: staff.middle_name ?? '', last_name: staff.last_name ?? '', email: staff.email ?? '', timezone: staff.timezone ?? '' });
  const save = useAction(() => staffApi.put('/employee/profile', { ...f, email: f.email || undefined, timezone: f.timezone || undefined }), { onSuccess: refresh });
  return (
    <>
      <PageHeader title="My profile" />
      <Card className="max-w-2xl">
        <CardHeader title={[staff.name, staff.last_name].filter(Boolean).join(' ')} subtitle={`+${staff.country_code} ${staff.phone_number} · ${staff.business?.name}`} />
        <CardBody>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <Avatar name={staff.name} src={staff.photo} size={64} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="First name">{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
              <Field label="Middle name">{(id) => <Input id={id} value={f.middle_name} onChange={(e) => setF({ ...f, middle_name: e.target.value })} />}</Field>
              <Field label="Last name">{(id) => <Input id={id} value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} />}</Field>
            </div>
            <Field label="Email">{(id) => <Input id={id} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
            <Field label="Timezone" hint="Punch times and “today” follow this timezone.">
              {(id) => <Select id={id} value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}><option value="">Business default</option>{tz.data?.data.map((t) => <option key={t.timezone} value={t.timezone}>{t.display}</option>)}</Select>}
            </Field>
            <p className="text-xs text-muted">To change your mobile number, ask your employer to update it.</p>
            <Button type="submit" loading={save.isPending}>Save changes</Button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
