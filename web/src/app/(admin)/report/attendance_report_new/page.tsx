'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Report" css={["setting.css", "pg/report-attendance-report-new.css"]}>
      <Body />
    </AdminPage>
  );
}
