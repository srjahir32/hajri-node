'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Edit Admin User" css={["setting.css", "pg/admin-users-add-admin-user.css"]}>
      <Body />
    </AdminPage>
  );
}
