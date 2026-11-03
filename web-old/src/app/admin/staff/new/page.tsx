'use client';

import { PageHeader } from '@/components/ui/Card';
import { StaffForm } from '@/components/staff/StaffForm';

export default function NewStaffPage() {
  return (
    <>
      <PageHeader title="Add staff" subtitle="They'll log in with their mobile number and a one-time password." />
      <StaffForm />
    </>
  );
}
