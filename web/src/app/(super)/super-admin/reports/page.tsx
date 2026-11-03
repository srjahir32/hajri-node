'use client';

import SuperPage from '@/components/shell/SuperPage';
import Body from './Body';

export default function Page() {
  return (
    <SuperPage title="Revenue Reports" css={["subscription.css", "pg/super-admin-reports.css"]}>
      <Body />
    </SuperPage>
  );
}
