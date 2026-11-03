'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Shift Settings" css={["setting.css", "pg/setting-add-shift-new.css"]}>
      <Body />
    </AdminPage>
  );
}
