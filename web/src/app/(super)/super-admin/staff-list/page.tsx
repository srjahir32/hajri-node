'use client';

import SuperPage from '@/components/shell/SuperPage';
import Body from './Body';

export default function Page() {
  return (
    <SuperPage title="Staff List" css={[]}>
      <Body />
    </SuperPage>
  );
}
