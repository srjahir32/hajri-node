'use client';

import StaffPage from '@/components/shell/StaffPage';
import Body from './Body';

export default function Page() {
  return (
    <StaffPage title="Attendance" css={["setting.css", "pg/employee-attendance.css"]}>
      <Body />
    </StaffPage>
  );
}
