'use client';

import SuperPage from '@/components/shell/SuperPage';
import Body from './Body';

export default function Page() {
  return (
    <SuperPage title="Business Details" css={["pg/super-admin-business-id.css"]}>
      <Body />
    </SuperPage>
  );
}
