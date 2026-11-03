'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Automation Rules" css={["setting.css", "pg/setting-break-rule-new.css"]}>
      <Body />
    </AdminPage>
  );
}
