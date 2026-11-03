'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { adminApi, business, staffApi, superApi, tokens, type Role } from './api';
import { PageLoader } from '@/components/ui/Misc';
import { useAdmin, useStaff, useSuper } from './query';
import type { AdminSession, StaffSession } from './types';

const subscribe = (cb: () => void) => {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
};

/**
 * Token state without hydration mismatches: the server snapshot is always 'pending', so the first client
 * render matches the server HTML; right after hydration it becomes 'present' or 'missing'.
 */
function useTokenState(role: Role): 'pending' | 'present' | 'missing' {
  const client = useSyncExternalStore(subscribe, () => true, () => false);
  const has = useSyncExternalStore(subscribe, () => !!tokens.get(role), () => false);
  return !client ? 'pending' : has ? 'present' : 'missing';
}

// ───────────── Admin ─────────────

interface AdminCtx {
  session: AdminSession;
  can: (...perms: string[]) => boolean;
  businessId: number | null;
  business: AdminSession['businesses'][number] | undefined;
  switchBusiness: (id: number) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => void;
}
const AdminContext = createContext<AdminCtx | null>(null);
export const useAdminSession = () => {
  const c = useContext(AdminContext);
  if (!c) throw new Error('AdminProvider missing');
  return c;
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const tokenState = useTokenState('admin');
  const hasToken = tokenState === 'present';
  const { data, error, refetch } = useAdmin<AdminSession>(hasToken ? '/auth/admin/me' : null);

  useEffect(() => {
    if (tokenState === 'missing') router.replace('/login');
  }, [tokenState, router]);

  const session = data?.data;
  useEffect(() => {
    if (!session) return;
    if (!session.is_register) router.replace('/register');
    else if (!business.get() || !session.businesses.some((b) => b.id === business.get())) business.set(session.current_business_id ?? session.businesses[0].id);
  }, [session, router]);

  useEffect(() => {
    // trial over and nothing paid → the only usable page is Subscriptions
    if (session?.subscription.trial_expired && !pathname.startsWith('/admin/subscriptions')) router.replace('/admin/subscriptions');
  }, [session, pathname, router]);

  const can = useCallback(
    (...perms: string[]) => !!session && (session.permissions.includes('*') || perms.length === 0 || perms.some((p) => session.permissions.includes(p))),
    [session],
  );

  const switchBusiness = useCallback(
    async (id: number) => {
      business.set(id);
      await qc.invalidateQueries();
    },
    [qc],
  );

  const logout = useCallback(async () => {
    try {
      await adminApi.post('/auth/admin/logout');
    } catch {
      /* token may already be invalid */
    }
    tokens.clear('admin');
    business.clear();
    qc.clear();
    router.replace('/login');
  }, [router, qc]);

  const value = useMemo<AdminCtx | null>(
    () =>
      session
        ? {
            session,
            can,
            businessId: business.get() ?? session.current_business_id,
            business: session.businesses.find((b) => b.id === (business.get() ?? session.current_business_id)),
            switchBusiness,
            logout,
            refresh: () => void refetch(),
          }
        : null,
    [session, can, switchBusiness, logout, refetch],
  );

  if (!hasToken) return <PageLoader label={tokenState === 'pending' ? 'Loading…' : 'Redirecting to sign in…'} />;
  if (error && error.status === 401) return <PageLoader label="Session expired…" />;
  if (error) return <div className="grid min-h-screen place-items-center p-6 text-center text-sm text-danger">{error.message}</div>;
  if (!value || !session?.is_register) return <PageLoader label="Loading your workspace…" />;
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

// ───────────── Staff ─────────────

interface StaffCtx {
  staff: StaffSession['staff'];
  subscription: StaffSession['subscription'];
  logout: () => Promise<void>;
  refresh: () => void;
}
const StaffContext = createContext<StaffCtx | null>(null);
export const useStaffSession = () => {
  const c = useContext(StaffContext);
  if (!c) throw new Error('StaffProvider missing');
  return c;
};

export function StaffProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const tokenState = useTokenState('staff');
  const hasToken = tokenState === 'present';
  const { data, error, refetch } = useStaff<StaffSession>(hasToken ? '/auth/staff/me' : null);

  useEffect(() => {
    if (tokenState === 'missing') router.replace('/employee/login');
  }, [tokenState, router]);

  const logout = useCallback(async () => {
    try {
      await staffApi.post('/auth/staff/logout');
    } catch {
      /* ignore */
    }
    tokens.clear('staff');
    qc.clear();
    router.replace('/employee/login');
  }, [router, qc]);

  if (!hasToken) return <PageLoader label={tokenState === 'pending' ? 'Loading…' : 'Redirecting to sign in…'} />;
  if (error) return <div className="grid min-h-screen place-items-center p-6 text-center text-sm text-danger">{error.message}</div>;
  if (!data) return <PageLoader />;
  return (
    <StaffContext.Provider value={{ staff: data.data.staff, subscription: data.data.subscription, logout, refresh: () => void refetch() }}>
      {children}
    </StaffContext.Provider>
  );
}

// ───────────── Super admin ─────────────

interface SuperCtx {
  admin: { id: number; name: string | null; email: string };
  logout: () => void;
}
const SuperContext = createContext<SuperCtx | null>(null);
export const useSuperSession = () => {
  const c = useContext(SuperContext);
  if (!c) throw new Error('SuperProvider missing');
  return c;
};

export function SuperProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const tokenState = useTokenState('super');
  const hasToken = tokenState === 'present';
  const { data, error } = useSuper<{ id: number; name: string | null; email: string }>(hasToken ? '/auth/super-admin/me' : null);

  useEffect(() => {
    if (tokenState === 'missing') router.replace('/super-admin/login');
  }, [tokenState, router]);

  if (!hasToken) return <PageLoader label={tokenState === 'pending' ? 'Loading…' : 'Redirecting to sign in…'} />;
  if (error) return <div className="grid min-h-screen place-items-center p-6 text-center text-sm text-danger">{error.message}</div>;
  if (!data) return <PageLoader />;
  const logout = () => {
    tokens.clear('super');
    qc.clear();
    router.replace('/super-admin/login');
  };
  return <SuperContext.Provider value={{ admin: data.data, logout }}>{children}</SuperContext.Provider>;
}

export const _s = superApi;
