'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Attendance Settings" tabTitle="Shift Settings" css={["setting.css", "pg/setting-shift-setting-new.css"]}>
      <Body />
    </AdminPage>
  );
}
