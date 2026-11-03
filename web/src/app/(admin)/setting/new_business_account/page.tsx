'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Manage Business" css={["dropzone.css"]}>
      <Body />
    </AdminPage>
  );
}
