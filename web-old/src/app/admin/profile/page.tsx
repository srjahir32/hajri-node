'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, PageHeader } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Misc';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { errMsg } from '@/lib/query';

export default function ProfilePage() {
  const { session, refresh } = useAdminSession();
  const [name, setName] = useState(session.user.name ?? '');
  const [email, setEmail] = useState(session.user.email ?? '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('email', email);
      if (photo) fd.append('photo', photo);
      await adminApi.form('PUT', '/admin/account', fd);
      toast.success('Profile updated');
      refresh();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="My profile" />
      <Card className="max-w-2xl">
        <CardHeader title="Account" subtitle={`+${session.user.country_code} ${session.user.phone_number} · ${session.user.is_sub_admin ? 'Admin user' : 'Owner'}`} />
        <CardBody>
          <form onSubmit={save} className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={name} src={session.user.photo} size={64} />
              <Input type="file" accept="image/*" className="h-auto py-2" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </div>
            <Field label="Name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
            <Field label="Email">{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
            <Button type="submit" loading={busy}>Save changes</Button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
