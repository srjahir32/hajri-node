'use client';

import StaffPage from '@/components/shell/StaffPage';
import Body from './Body';

export default function Page() {
  return (
    <StaffPage title="Notifications" css={["setting.css"]}>
      <Body />
    </StaffPage>
  );
}
