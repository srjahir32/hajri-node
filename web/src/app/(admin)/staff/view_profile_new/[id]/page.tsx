'use client';

import { useParams } from 'next/navigation';
import AdminPage from '@/components/shell/AdminPage';
import { useAdmin } from '@/lib/query';
import Body, { type EditStaff } from '../../add-staff-new/Body';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const staff = useAdmin<EditStaff>(`/admin/staff/${id}`).data?.data;
  return (
    <AdminPage title="Staff Management" css={["setting.css", "pg/staff-add-staff-new.css"]}>
      {/* the form's inputs are uncontrolled, so mount it once the staff has loaded */}
      {staff && <Body key={staff.id} staff={staff} />}
    </AdminPage>
  );
}
