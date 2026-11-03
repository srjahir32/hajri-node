'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Attendance" css={["setting.css", "pg/attendance-attendance-leave-new.css"]}>
      <Body />
    </AdminPage>
  );
}
