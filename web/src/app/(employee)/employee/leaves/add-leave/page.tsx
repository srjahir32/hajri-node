'use client';

import StaffPage from '@/components/shell/StaffPage';
import Body from './Body';

export default function Page() {
  return (
    <StaffPage title="Add Leave" css={["setting.css", "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css"]}>
      <Body />
    </StaffPage>
  );
}
