'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Time Zone Settings" css={["setting.css", "pg/setting-time-zone.css"]}>
      <Body />
    </AdminPage>
  );
}
