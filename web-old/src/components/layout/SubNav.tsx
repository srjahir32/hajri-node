'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SubNav({ items }: { items: { href: string; label: string; exact?: boolean; badge?: number }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Section" className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1">
      {items.map((i) => {
        const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? 'page' : undefined}
            className={clsx('flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition', active ? 'bg-brand text-white' : 'text-muted hover:bg-surface2 hover:text-ink')}
          >
            {i.label}
            {!!i.badge && <span className={clsx('rounded-full px-1.5 text-xs font-semibold', active ? 'bg-white/25' : 'bg-danger text-white')}>{i.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
