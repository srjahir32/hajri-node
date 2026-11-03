'use client';

import { useEffect } from 'react';
import { navigate } from '@/lib/navigate';

/** Legacy Laravel view; the live page is Settings → Attendance Settings. */
export default function Body() {
  useEffect(() => {
    navigate('/setting/attendance_setting', { replace: true });
  }, []);
  return null;
}
