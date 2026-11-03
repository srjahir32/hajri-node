'use client';

import StaffPage from '@/components/shell/StaffPage';
import Body from './Body';

export default function Page() {
  return (
    <StaffPage title="Dashboard" css={["setting.css", "dashboard-new.css", "pg/employee-dashboard.css"]}>
      <Body />
    </StaffPage>
  );
}
