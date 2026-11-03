'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Staff Management" css={["setting.css", "pg/staff-new.css"]}>
      <Body />
    </AdminPage>
  );
}
