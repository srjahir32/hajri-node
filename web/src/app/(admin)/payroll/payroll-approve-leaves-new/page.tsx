'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Approve" css={["dropzone.css", "setting.css", "pg/payroll-payroll-approve-leaves-new.css"]}>
      <Body />
    </AdminPage>
  );
}
