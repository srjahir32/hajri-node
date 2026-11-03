'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Deactivated Staff" css={["setting.css", "pg/deactivated-staff-new.css"]}>
      <Body />
    </AdminPage>
  );
}
