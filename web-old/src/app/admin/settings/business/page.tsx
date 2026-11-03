'use client';

import { BackToSettings } from '@/components/settings/BackLink';
import { BusinessForm } from '@/components/settings/BusinessForm';
import { PageHeader } from '@/components/ui/Card';
import { ErrorState, PageLoader } from '@/components/ui/Misc';
import { useAdmin } from '@/lib/query';
import type { BusinessDto } from '@/lib/types';

export default function BusinessProfilePage() {
  const q = useAdmin<BusinessDto>('/admin/business');
  if (q.error) return <ErrorState message={q.error.message} />;
  if (!q.data) return <PageLoader />;
  return (
    <>
      <PageHeader back={<BackToSettings />} title="Business profile" />
      <BusinessForm key={q.data.data.id} initial={q.data.data} />
    </>
  );
}
