'use client';

import { useEffect } from 'react';
import { tokens } from '@/lib/api';
import Body from './landing/Body';
import { navigate } from '@/lib/navigate';

export default function Page() {
  useEffect(() => {
    // Laravel: logged-in users are sent straight to the dashboard
    if (tokens.get('admin')) navigate('/dashboard-new', { replace: true });
  }, []);
  return <Body />;
}
