'use client';

import { BackToSettings } from '@/components/settings/BackLink';
import { ShiftForm } from '@/components/settings/ShiftForm';
import { PageHeader } from '@/components/ui/Card';

export default function NewShiftPage() {
  return (
    <>
      <PageHeader back={<BackToSettings href="/admin/settings/shifts" label="Shifts" />} title="New shift" />
      <ShiftForm />
    </>
  );
}
