'use client';

import StaffPage from '@/components/shell/StaffPage';
import Body from './Body';

export default function Page() {
  return (
    <StaffPage title="Edit Profile" css={["setting.css", "dropzone.css"]}>
      <Body />
    </StaffPage>
  );
}
