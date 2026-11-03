'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Attendance Details" css={["setting.css", "pg/attendance-attendance-details.css"]}>
      <Body />
    </AdminPage>
  );
}
