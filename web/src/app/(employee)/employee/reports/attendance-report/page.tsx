'use client';

import StaffPage from '@/components/shell/StaffPage';
import Body from './Body';

export default function Page() {
  return (
    <StaffPage title="Attendance Reports" css={["setting.css"]}>
      <Body />
    </StaffPage>
  );
}
