'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Payroll" css={["setting.css", "pg/payroll-payroll-approve-summary-new.css"]}>
      <Body />
    </AdminPage>
  );
}
