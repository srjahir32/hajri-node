'use client';

import {
  BarChart3, Banknote, CalendarCheck, CreditCard, LayoutDashboard, MapPin, Settings, ShieldCheck, UserCog, Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell, Brand, type NavItem } from '@/components/layout/AppShell';
import { BusinessSwitcher, NotificationBell, UserMenu } from '@/components/layout/Menus';
import { AdminProvider, useAdminSession } from '@/lib/auth';
import { useAdmin } from '@/lib/query';
import { Info } from 'lucide-react';

function AdminFrame({ children }: { children: React.ReactNode }) {
  const { session, can, switchBusiness, businessId, logout } = useAdminSession();
  const router = useRouter();
  const pending = useAdmin<{ attendance: number; leaves: number }>(session.subscription.trial_expired ? null : '/admin/dashboard/pending', undefined, { refetchInterval: 120_000 });
  const approvals = pending.data?.data;

  const all: (NavItem & { perm?: string[] })[] = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
    { href: '/admin/staff', label: 'Staff', icon: <Users />, perm: ['view_staff_management'] },
    { href: '/admin/attendance', label: 'Attendance', icon: <CalendarCheck />, perm: ['view_attendance', 'view_punches', 'view_attendance_request', 'view_leave_management'], badge: (approvals?.attendance ?? 0) + (approvals?.leaves ?? 0) },
    { href: '/admin/payroll', label: 'Payroll', icon: <Banknote />, perm: ['view_payroll'] },
    { href: '/admin/reports', label: 'Reports', icon: <BarChart3 />, perm: ['view_report'] },
    { href: '/admin/locations', label: 'Live locations', icon: <MapPin />, perm: ['view_locations'] },
    { href: '/admin/settings', label: 'Settings', icon: <Settings />, perm: ['view_setting'] },
    { href: '/admin/roles', label: 'Roles', icon: <ShieldCheck />, perm: ['view_roles'] },
    { href: '/admin/admin-users', label: 'Admin users', icon: <UserCog />, perm: ['view_admin_user'] },
    { href: '/admin/subscriptions', label: 'Subscription', icon: <CreditCard />, perm: ['view_subscription'] },
  ];
  const expired = session.subscription.trial_expired;
  const nav = all.filter((n) => (expired ? n.href === '/admin/subscriptions' : !n.perm || can(...n.perm)));

  return (
    <AppShell
      brand={<Brand sub="Business" />}
      nav={nav}
      topRight={
        <>
          <BusinessSwitcher
            businesses={session.businesses}
            currentId={businessId}
            onSwitch={(id) => void switchBusiness(id).then(() => router.refresh())}
            canAdd={!session.user.is_sub_admin}
          />
          <NotificationBell role="admin" href="/admin/notifications" />
          <UserMenu
            name={session.user.name ?? session.user.phone_number}
            sub={session.user.is_sub_admin ? 'Admin user' : 'Owner'}
            photo={session.user.photo}
            onLogout={() => void logout()}
            items={[{ href: '/admin/profile', label: 'My profile' }]}
          />
        </>
      }
    >
      {expired && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warningsoft p-4 text-sm">
          <Info className="size-5 shrink-0 text-warning" />
          <p className="flex-1">Your free trial has ended. Subscribe to a plan to keep using Hajri.</p>
          <Link href="/admin/subscriptions" className="font-medium text-brand hover:underline">Choose a plan</Link>
        </div>
      )}
      {children}
    </AppShell>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminFrame>{children}</AdminFrame>
    </AdminProvider>
  );
}

