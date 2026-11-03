'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Attendance Settings" css={["setting.css", "pg/setting-automation-rules-new.css"]}>
      <Body />
    </AdminPage>
  );
}
