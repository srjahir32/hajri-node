import clsx from 'clsx';
import type { ReactNode } from 'react';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={clsx('rounded-xl border border-line bg-surface shadow-card', className)}>{children}</section>;
}

export function CardHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export const CardBody = ({ className, children }: { className?: string; children: ReactNode }) => <div className={clsx('p-5', className)}>{children}</div>;

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {back}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

const tones = {
  brand: 'bg-brandsoft text-brand',
  success: 'bg-successsoft text-success',
  warning: 'bg-warningsoft text-warning',
  danger: 'bg-dangersoft text-danger',
  info: 'bg-infosoft text-info',
  neutral: 'bg-surface2 text-muted',
} as const;
export type Tone = keyof typeof tones;

export function Stat({ label, value, icon, tone = 'brand', hint, href }: { label: string; value: ReactNode; icon?: ReactNode; tone?: Tone; hint?: ReactNode; href?: string }) {
  const body = (
    <div className="flex items-center gap-4 p-4">
      {icon && <div className={clsx('grid size-11 shrink-0 place-items-center rounded-xl', tones[tone])}>{icon}</div>}
      <div className="min-w-0">
        <p className="truncate text-sm text-muted">{label}</p>
        <p className="tnum text-2xl font-semibold leading-tight">{value}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
  return <Card className={href ? 'transition hover:border-brand/50' : undefined}>{href ? <a href={href}>{body}</a> : body}</Card>;
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>;
}

/** Maps attendance/leave/subscription statuses to badge tones. */
export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = (status ?? '').toLowerCase();
  const tone: Tone =
    s === 'present' || s === 'approved' || s === 'active' || s === 'processed' || s === 'success' ? 'success'
    : s === 'absent' || s === 'rejected' || s === 'failed' || s === 'cancelled' || s === 'expired' || s === 'deactivated' ? 'danger'
    : s === 'half day' || s === 'pending' || s === 'late' || s === 'payment_failed' ? 'warning'
    : s === 'leave' || s === 'paid leave' ? 'info'
    : s === 'holiday' ? 'brand'
    : 'neutral';
  return <Badge tone={tone}>{status || '—'}</Badge>;
}
