'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Payroll" css={["setting.css", "pg/payroll-new.css"]}>
      <Body />
    </AdminPage>
  );
}
