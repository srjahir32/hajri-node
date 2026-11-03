'use client';

import SuperPage from '@/components/shell/SuperPage';
import Body from './Body';

export default function Page() {
  return (
    <SuperPage title="Dashboard" css={[]}>
      <Body />
    </SuperPage>
  );
}
