'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Staff Profile" css={["setting.css", "pg/staff-staff-profile-new-id.css"]}>
      <Body />
    </AdminPage>
  );
}
