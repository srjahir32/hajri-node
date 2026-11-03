'use client';

import clsx from 'clsx';
import { Bell, Check, ChevronDown, LogOut, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { adminApi, staffApi, type Role } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { useAction, useApi } from '@/lib/query';
import type { NotificationDto } from '@/lib/types';
import { Avatar } from '@/components/ui/Misc';

/** Click-outside dropdown wrapper. */
export function Dropdown({ trigger, children, align = 'right', width = 'w-72' }: { trigger: (open: boolean) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; width?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{trigger(open)}</button>
      {open && (
        <div role="menu" className={clsx('animate-pop absolute z-40 mt-2 rounded-xl border border-line bg-surface shadow-pop', width, align === 'right' ? 'right-0' : 'left-0')}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function NotificationBell({ role, href }: { role: Exclude<Role, 'super'>; href: string }) {
  const base = role === 'admin' ? '/admin/notifications' : '/employee/notifications';
  const api = role === 'admin' ? adminApi : staffApi;
  const qc = useQueryClient();
  const count = useApi<{ count: number }>(role, `${base}/unread-count`, undefined, { refetchInterval: 60_000 });
  const list = useApi<NotificationDto[]>(role, `${base}`, { per_page: 6 });
  const readAll = useAction(() => api.post(`${base}/read-all`), { success: false, invalidate: [base] });
  const unread = count.data?.data.count ?? 0;
  void qc;
  return (
    <Dropdown
      width="w-80"
      trigger={() => (
        <span className="relative grid size-10 place-items-center rounded-lg text-muted hover:bg-surface2" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
          <Bell className="size-5" />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">{unread > 9 ? '9+' : unread}</span>}
        </span>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {unread > 0 && <button className="text-xs text-brand hover:underline" onClick={() => readAll.mutate()}>Mark all read</button>}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {(list.data?.data ?? []).map((n) => (
              <li key={n.id} className={clsx('border-b border-line px-4 py-3 text-sm last:border-0', !n.read && 'bg-brandsoft/50')}>
                <p className="font-medium">{n.message ?? n.title}</p>
                <p className="mt-0.5 text-xs text-muted">{timeAgo(n.created_at)}</p>
              </li>
            ))}
            {!list.data?.data.length && <li className="px-4 py-8 text-center text-sm text-muted">You&apos;re all caught up.</li>}
          </ul>
          <Link href={href} onClick={close} className="block border-t border-line px-4 py-2.5 text-center text-sm font-medium text-brand hover:bg-surface2">View all</Link>
        </div>
      )}
    </Dropdown>
  );
}

export function UserMenu({ name, sub, photo, onLogout, items }: { name: string; sub?: string; photo?: string | null; onLogout: () => void; items?: { href: string; label: string }[] }) {
  return (
    <Dropdown
      width="w-60"
      trigger={() => (
        <span className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface2">
          <Avatar name={name} src={photo} size={32} />
          <span className="hidden text-left sm:block">
            <span className="block max-w-32 truncate text-sm font-medium leading-tight">{name}</span>
            {sub && <span className="block max-w-32 truncate text-xs text-muted">{sub}</span>}
          </span>
          <ChevronDown className="hidden size-4 text-muted sm:block" />
        </span>
      )}
    >
      {(close) => (
        <div className="p-1.5">
          {items?.map((i) => (
            <Link key={i.href} href={i.href} onClick={close} className="block rounded-lg px-3 py-2 text-sm hover:bg-surface2">{i.label}</Link>
          ))}
          <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-dangersoft">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </Dropdown>
  );
}

export function BusinessSwitcher({ businesses, currentId, onSwitch, canAdd }: { businesses: { id: number; name: string }[]; currentId: number | null; onSwitch: (id: number) => void; canAdd: boolean }) {
  const current = businesses.find((b) => b.id === currentId);
  return (
    <Dropdown
      align="left"
      width="w-64"
      trigger={() => (
        <span className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:bg-surface2">
          <span className="grid size-6 place-items-center rounded-md bg-brandsoft text-xs font-bold text-brand">{current?.name?.[0] ?? 'B'}</span>
          <span className="max-w-40 truncate">{current?.name ?? 'Select business'}</span>
          <ChevronDown className="size-4 text-muted" />
        </span>
      )}
    >
      {(close) => (
        <div className="p-1.5">
          {businesses.map((b) => (
            <button key={b.id} onClick={() => { onSwitch(b.id); close(); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface2">
              <span className="truncate">{b.name}</span>
              {b.id === currentId && <Check className="size-4 text-brand" />}
            </button>
          ))}
          {canAdd && (
            <Link href="/admin/settings/businesses/new" onClick={close} className="mt-1 flex items-center gap-2 rounded-lg border-t border-line px-3 py-2 pt-2.5 text-sm text-brand hover:bg-surface2">
              <Plus className="size-4" /> Add business
            </Link>
          )}
        </div>
      )}
    </Dropdown>
  );
}
