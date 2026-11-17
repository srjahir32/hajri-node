'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Add Role" css={["setting.css", "pg/roles-add-role.css"]}>
      <Body />
    </AdminPage>
  );
}
