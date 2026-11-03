'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Holiday Policy" css={["setting.css", "pg/setting-manage-staff-list-new.css"]}>
      <Body />
    </AdminPage>
  );
}
