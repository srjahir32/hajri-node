'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Dashboard" css={["setting.css"]}>
      <Body />
    </AdminPage>
  );
}
