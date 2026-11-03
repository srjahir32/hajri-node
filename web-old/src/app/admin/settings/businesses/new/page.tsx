'use client';

import { BackToSettings } from '@/components/settings/BackLink';
import { BusinessForm } from '@/components/settings/BusinessForm';
import { PageHeader } from '@/components/ui/Card';

export default function NewBusinessPage() {
  return (
    <>
      <PageHeader back={<BackToSettings />} title="Add a business" subtitle="Staff, shifts and payroll are kept separate for each business." />
      <BusinessForm />
    </>
  );
}
