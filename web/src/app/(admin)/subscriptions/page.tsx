'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Subscriptions" css={["setting.css", "pg/subscriptions.css"]}>
      <Body />
    </AdminPage>
  );
}
