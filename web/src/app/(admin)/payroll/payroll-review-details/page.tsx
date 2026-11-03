'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Review Details" css={["dropzone.css", "setting.css", "pg/payroll-payroll-review-details.css"]}>
      <Body />
    </AdminPage>
  );
}
