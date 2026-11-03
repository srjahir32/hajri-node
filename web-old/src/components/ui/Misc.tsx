'use client';

import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Inbox, Loader2, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { initials, monthLabel, shiftMonth } from '@/lib/format';
import { Button } from './Button';
import { Input } from './Field';

export const Spinner = ({ className }: { className?: string }) => <Loader2 className={clsx('size-5 animate-spin text-brand', className)} aria-label="Loading" />;

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center text-muted">
      <div className="flex items-center gap-3"><Spinner /> <span className="text-sm">{label}</span></div>
    </div>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={clsx('skeleton rounded-lg', className)} aria-hidden />;

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4" aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }, (_, j) => <Skeleton key={j} className="h-9" />)}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, message, action, icon }: { title: string; message?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-surface2 text-muted">{icon ?? <Inbox className="size-7" />}</div>
      <p className="font-medium">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="grid place-items-center px-6 py-12 text-center">
      <p className="font-medium text-danger">Something went wrong</p>
      <p className="mt-1 max-w-md text-sm text-muted">{message}</p>
      {onRetry && <Button className="mt-4" variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Avatar({ name, src, size = 36 }: { name?: string | null; src?: string | null; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-brandsoft font-semibold text-brand" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition',
            value === t.id ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 rounded-full bg-surface2 px-1.5 py-0.5 text-xs">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page, lastPage, total, onChange }: { page: number; lastPage: number; total?: number; onChange: (p: number) => void }) {
  if (lastPage <= 1 && !total) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
      <span>{total !== undefined ? `${total} total` : ''}</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)} icon={<ChevronLeft className="size-4" />}>Prev</Button>
        <span className="tnum">Page {page} of {lastPage}</span>
        <Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => onChange(page + 1)}>
          Next <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={clsx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <Input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" aria-label={placeholder} />
    </div>
  );
}

export function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-line bg-surface">
      <button className="grid size-10 place-items-center text-muted hover:text-ink" onClick={() => onChange(shiftMonth(value, -1))} aria-label="Previous month"><ChevronLeft className="size-4" /></button>
      <span className="min-w-36 text-center text-sm font-medium">{monthLabel(value)}</span>
      <button className="grid size-10 place-items-center text-muted hover:text-ink" onClick={() => onChange(shiftMonth(value, 1))} aria-label="Next month"><ChevronRight className="size-4" /></button>
    </div>
  );
}

export function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </div>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children || '—'}</dd>
    </div>
  );
}
