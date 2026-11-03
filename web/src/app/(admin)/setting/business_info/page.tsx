'use client';

import AdminPage from '@/components/shell/AdminPage';
import Body from './Body';

export default function Page() {
  return (
    <AdminPage title="Business Info" css={[]}>
      <Body />
    </AdminPage>
  );
}
