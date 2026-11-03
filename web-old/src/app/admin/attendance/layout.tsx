'use client';

import { SubNav } from '@/components/layout/SubNav';
import { useAdminSession } from '@/lib/auth';
import { useAdmin } from '@/lib/query';

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const { can } = useAdminSession();
  const pending = useAdmin<{ attendance: number; leaves: number }>('/admin/dashboard/pending');
  const items = [
    can('view_attendance') && { href: '/admin/attendance', label: 'Daily', exact: true },
    can('view_punches') && { href: '/admin/attendance/punches', label: 'Punches' },
    can('view_attendance_request') && { href: '/admin/attendance/requests', label: 'Approvals', badge: pending.data?.data.attendance },
    can('view_leave_management') && { href: '/admin/attendance/leaves', label: 'Leaves', badge: pending.data?.data.leaves },
    can('view_attendance') && { href: '/admin/attendance/review', label: 'Overtime & short days' },
  ].filter(Boolean) as { href: string; label: string; exact?: boolean; badge?: number }[];
  return (
    <>
      <SubNav items={items} />
      {children}
    </>
  );
}
