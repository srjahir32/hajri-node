'use client';

import { useEffect } from 'react';
import { navigate } from '@/lib/navigate';

/** Legacy Laravel view; the live flow is Manage Business. */
export default function Body() {
  useEffect(() => {
    navigate('/setting/manage_business_new', { replace: true });
  }, []);
  return null;
}
