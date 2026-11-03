'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Reports" css={["setting.css", "pg/report-report-payroll-new.css"]}>
      <Body />
    </AdminPage>
  );
}
