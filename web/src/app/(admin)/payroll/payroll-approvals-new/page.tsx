'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Payroll Approvals" css={["dropzone.css", "setting.css", "pg/payroll-payroll-approvals-new.css"]}>
      <Body />
    </AdminPage>
  );
}
