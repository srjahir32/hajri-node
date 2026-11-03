'use client';

import { Badge, Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Misc';
import { fmtDate, WEEKDAYS } from '@/lib/format';
import { useStaff } from '@/lib/query';

interface Policy { id: number; name: string; year: number; holidays: { id: number; name: string; date: string }[] }

export default function HolidaysPage() {
  const q = useStaff<Policy[]>('/employee/holidays');
  if (q.error) return <ErrorState message={q.error.message} />;
  if (!q.data) return <PageLoader />;
  const weekly = (q.data as unknown as { weekly_holiday_days?: number[] }).weekly_holiday_days ?? [];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Holidays" subtitle={weekly.length ? `Weekly off: ${weekly.map((d) => WEEKDAYS[d]).join(', ')}` : undefined} />
      {q.data.data.length === 0 ? <Card><EmptyState title="No holidays published" /></Card> : (
        <div className="grid gap-6 lg:grid-cols-2">
          {q.data.data.map((p) => (
            <Card key={p.id}>
              <CardHeader title={p.name} subtitle={`${p.holidays.length} holidays in ${p.year}`} />
              <ul className="divide-y divide-line">
                {p.holidays.map((h) => (
                  <li key={h.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className={h.date < today ? 'text-muted line-through' : 'font-medium'}>{h.name}</span>
                    <Badge tone={h.date < today ? 'neutral' : 'brand'}>{fmtDate(h.date, { weekday: 'short', day: '2-digit', month: 'short' })}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
