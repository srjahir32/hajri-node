'use client';

import clsx from 'clsx';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** exact match only (for "/admin/attendance" vs its children) */
  exact?: boolean;
  badge?: number;
}

export function AppShell({ brand, nav, topRight, children, footer }: { brand: ReactNode; nav: NavItem[]; topRight: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (n: NavItem) => (n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(`${n.href}/`));

  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 px-5">{brand}</div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {nav.map((n) => (
          <li key={n.href}>
            <Link
              href={n.href}
              aria-current={isActive(n) ? 'page' : undefined}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive(n) ? 'bg-brandsoft text-brand' : 'text-muted hover:bg-surface2 hover:text-ink',
              )}
            >
              <span className="size-5 shrink-0 [&>svg]:size-5">{n.icon}</span>
              <span className="flex-1">{n.label}</span>
              {!!n.badge && <span className="rounded-full bg-danger px-1.5 text-xs font-semibold text-white">{n.badge}</span>}
            </Link>
          </li>
        ))}
      </ul>
      {footer && <div className="border-t border-line p-3">{footer}</div>}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-surface lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} />
          <aside className="animate-pop absolute inset-y-0 left-0 w-72 max-w-[85%] bg-surface shadow-pop">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-muted hover:bg-surface2" aria-label="Close menu"><X className="size-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-muted hover:bg-surface2 lg:hidden" aria-label="Open menu"><Menu className="size-5" /></button>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">{topRight}</div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export function Brand({ sub }: { sub?: string }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid size-9 place-items-center rounded-xl bg-brand font-bold text-white">H</span>
      <span className="leading-tight">
        <span className="block text-base font-semibold">Hajri</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
    </Link>
  );
}
