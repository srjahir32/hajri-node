'use client';

import { use } from 'react';
import { PageHeader } from '@/components/ui/Card';
import { ErrorState, PageLoader } from '@/components/ui/Misc';
import { StaffForm, type StaffDetail } from '@/components/staff/StaffForm';
import { useAdmin } from '@/lib/query';

export default function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useAdmin<StaffDetail>(`/admin/staff/${id}`);
  if (q.error) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />;
  if (!q.data) return <PageLoader />;
  return (
    <>
      <PageHeader title={`Edit ${q.data.data.name}`} />
      <StaffForm initial={q.data.data} />
    </>
  );
}
