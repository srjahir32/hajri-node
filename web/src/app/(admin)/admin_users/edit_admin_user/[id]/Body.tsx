'use client';

import { useParams } from 'next/navigation';
import { useAdmin } from '@/lib/query';
import { AdminUserForm } from '@/components/settings/AdminUserForm';

export default function Body() {
  const id = Number(useParams<{ id: string }>().id);
  const q = useAdmin<{ id: number; name: string | null; email: string | null; phone_number: string; country_code: string | null; role: { id: number } | null }[]>('/admin/admin-users');
  if (!q.data) return null;
  const user = q.data.data.find((u) => u.id === id);
  if (!user) return <main className="flex-1 p-8"><p>Admin user not found.</p></main>;
  return <AdminUserForm user={user} />;
}
