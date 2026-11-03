'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Edit Role" css={["setting.css", "pg/roles-add-role.css"]}>
      <Body />
    </AdminPage>
  );
}
