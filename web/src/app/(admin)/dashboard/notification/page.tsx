'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Notifications" css={["setting.css"]}>
      <Body />
    </AdminPage>
  );
}
