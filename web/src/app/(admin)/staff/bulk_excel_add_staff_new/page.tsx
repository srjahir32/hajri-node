'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Add Staff" css={["setting.css", "pg/staff-bulk-excel-add-staff-new.css"]}>
      <Body />
    </AdminPage>
  );
}
