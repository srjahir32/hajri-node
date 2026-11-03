'use client';

import { useParams } from 'next/navigation';
import { useAdmin } from '@/lib/query';
import { RoleForm } from '@/components/settings/RoleForm';

export default function Body() {
  const id = Number(useParams<{ id: string }>().id);
  const roles = useAdmin<{ id: number; name: string; permissions: string[] }[]>('/admin/roles');
  if (!roles.data) return null;
  const role = roles.data.data.find((r) => r.id === id);
  if (!role) return <main className="flex-1 p-8"><p>Role not found.</p></main>;
  return <RoleForm role={role} />;
}
