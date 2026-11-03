'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Leave Policy" css={["setting.css", "pg/setting-leave-manage-staff-list-new.css"]}>
      <Body />
    </AdminPage>
  );
}
