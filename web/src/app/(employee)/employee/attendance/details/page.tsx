'use client';

import StaffPage from '@/components/shell/StaffPage';
import Body from './Body';

export default function Page() {
  return (
    <StaffPage title="Attendance Details" css={["setting.css", "pg/attendance-attendance-details.css", "pg/employee-attendance-details.css"]}>
      <Body />
    </StaffPage>
  );
}
