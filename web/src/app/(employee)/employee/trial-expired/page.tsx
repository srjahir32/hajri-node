'use client';

import StaffPage from '@/components/shell/StaffPage';
import Body from './Body';

export default function Page() {
  return (
    <StaffPage title="Trial Expired" css={["pg/employee-trial-expired.css"]}>
      <Body />
    </StaffPage>
  );
}
