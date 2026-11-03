'use client';

import { useParams } from 'next/navigation';
import { useAdmin } from '@/lib/query';
import { ShiftForm, type ShiftData } from '@/components/settings/ShiftForm';

export default function Body() {
  const id = Number(useParams<{ id: string }>().id);
  const q = useAdmin<ShiftData>(`/admin/shifts/${id}`);
  if (!q.data) return null;
  return <ShiftForm shift={q.data.data} />;
}
