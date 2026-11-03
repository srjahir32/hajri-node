'use client';

import { usePathname } from 'next/navigation';
import { Bell, CalendarCheck, CalendarDays, ClipboardList, Home, Palmtree, UserRound } from 'lucide-react';
import { AppShell, Brand } from '@/components/layout/AppShell';
import { NotificationBell, UserMenu } from '@/components/layout/Menus';
import { StaffProvider, useStaffSession } from '@/lib/auth';

function Frame({ children }: { children: React.ReactNode }) {
  const { staff, logout } = useStaffSession();
  return (
    <AppShell
      brand={<Brand sub={staff.business?.name} />}
      nav={[
        { href: '/employee/dashboard', label: 'Home', icon: <Home /> },
        { href: '/employee/attendance', label: 'My attendance', icon: <CalendarCheck /> },
        { href: '/employee/leaves', label: 'Leaves', icon: <Palmtree /> },
        { href: '/employee/requests', label: 'Punch requests', icon: <ClipboardList /> },
        { href: '/employee/holidays', label: 'Holidays', icon: <CalendarDays /> },
        { href: '/employee/notifications', label: 'Notifications', icon: <Bell /> },
        { href: '/employee/profile', label: 'Profile', icon: <UserRound /> },
      ]}
      topRight={
        <>
          <NotificationBell role="staff" href="/employee/notifications" />
          <UserMenu name={[staff.name, staff.last_name].filter(Boolean).join(' ')} sub={staff.department?.name ?? staff.business?.name} photo={staff.photo} onLogout={() => void logout()} items={[{ href: '/employee/profile', label: 'My profile' }]} />
        </>
      }
    >
      {children}
    </AppShell>
  );
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // the login page lives under /employee but must not be wrapped in the authenticated shell
  if (pathname === '/employee/login') return <>{children}</>;
  return (
    <StaffProvider>
      <Frame>{children}</Frame>
    </StaffProvider>
  );
}
