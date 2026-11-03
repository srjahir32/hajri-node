'use client';

import { usePathname } from 'next/navigation';
import { Building2, CreditCard, LayoutDashboard, LineChart, Receipt, UserRound, Users } from 'lucide-react';
import { AppShell, Brand } from '@/components/layout/AppShell';
import { UserMenu } from '@/components/layout/Menus';
import { SuperProvider, useSuperSession } from '@/lib/auth';

function Frame({ children }: { children: React.ReactNode }) {
  const { admin, logout } = useSuperSession();
  return (
    <AppShell
      brand={<Brand sub="Platform admin" />}
      nav={[
        { href: '/super-admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
        { href: '/super-admin/businesses', label: 'Businesses', icon: <Building2 /> },
        { href: '/super-admin/users', label: 'Owners & admins', icon: <Users /> },
        { href: '/super-admin/staff', label: 'Staff', icon: <UserRound /> },
        { href: '/super-admin/subscriptions', label: 'Subscriptions', icon: <CreditCard /> },
        { href: '/super-admin/payments', label: 'Payments', icon: <Receipt /> },
        { href: '/super-admin/reports', label: 'Reports', icon: <LineChart /> },
      ]}
      topRight={<UserMenu name={admin.name ?? admin.email} sub={admin.email} onLogout={logout} />}
    >
      {children}
    </AppShell>
  );
}

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/super-admin/login') return <>{children}</>;
  return (
    <SuperProvider>
      <Frame>{children}</Frame>
    </SuperProvider>
  );
}
