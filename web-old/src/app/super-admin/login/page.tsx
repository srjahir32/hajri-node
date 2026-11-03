'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { ApiError, publicApi, tokens } from '@/lib/api';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await publicApi.post<{ token: string }>('/auth/super-admin/login', { email, password });
      tokens.set('super', res.data.token);
      router.replace('/super-admin/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed');
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Platform admin" subtitle="Restricted area for the Hajri team.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Password" error={error}>{(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <Button type="submit" loading={busy} className="w-full" size="lg">Sign in</Button>
      </form>
    </AuthShell>
  );
}
