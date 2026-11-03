'use client';

import { useEffect } from 'react';
import { navigate } from '@/lib/navigate';

/** Legacy/mock Laravel view; the live payroll flow is the approvals wizard. */
export default function Body() {
  useEffect(() => {
    navigate('/payroll/payroll-approvals-new', { replace: true });
  }, []);
  return null;
}
