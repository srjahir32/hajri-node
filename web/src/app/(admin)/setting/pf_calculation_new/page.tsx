'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="PF Calculation" css={["setting.css", "pg/setting-pf-calculation-new.css"]}>
      <Body />
    </AdminPage>
  );
}
