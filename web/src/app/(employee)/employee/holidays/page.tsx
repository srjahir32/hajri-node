'use client';

import StaffPage from '@/components/shell/StaffPage';
import Body from './Body';

export default function Page() {
  return (
    <StaffPage title="Holidays" css={["setting.css", "pg/employee-holidays.css"]}>
      <Body />
    </StaffPage>
  );
}
