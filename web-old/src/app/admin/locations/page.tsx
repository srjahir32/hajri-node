'use client';

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { Avatar, EmptyState, ErrorState, Skeleton } from '@/components/ui/Misc';
import { fmtDate, todayStr } from '@/lib/format';
import { useAdmin } from '@/lib/query';

const StaffMap = dynamic(() => import('@/components/maps/StaffMap'), { ssr: false, loading: () => <Skeleton className="h-[560px]" /> });

interface Live {
  staff_id: number;
  staff_name: string;
  staff_image: string | null;
  department: string | null;
  last_location: { latitude: number; longitude: number; formatted_time: string | null; type: string };
  point_count: number;
}
interface Pt { latitude: number; longitude: number; formatted_time: string | null; type: string }

export default function LocationsPage() {
  const [date, setDate] = useState(todayStr());
  const [sel, setSel] = useState<Live | null>(null);
  const live = useAdmin<Live[]>('/admin/locations/live', { date }, { refetchInterval: 60_000, keepPrevious: true });
  const trail = useAdmin<Pt[]>(sel ? `/admin/locations/staff/${sel.staff_id}` : null, { date });
  const rows = live.data?.data ?? [];
  const trailPts = trail.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Live locations"
        subtitle="Where your field staff were last seen (refreshes every minute)"
        actions={<Input type="date" value={date} max={todayStr()} onChange={(e) => { setDate(e.target.value); setSel(null); }} className="w-44" aria-label="Date" />}
      />
      {live.error ? (
        <Card><ErrorState message={live.error.message} onRetry={() => void live.refetch()} /></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <StaffMap
            height={560}
            points={
              sel && trailPts.length
                ? trailPts.map((p, i) => ({ latitude: p.latitude, longitude: p.longitude, label: `${p.type.replace('_', ' ')} · ${p.formatted_time ?? ''}`, highlight: i === trailPts.length - 1 }))
                : rows.map((r) => ({ latitude: r.last_location.latitude, longitude: r.last_location.longitude, label: r.staff_name, sub: `${r.last_location.formatted_time ?? ''} · ${r.department ?? ''}` }))
            }
            trail={sel ? trailPts.map((p) => [p.latitude, p.longitude] as [number, number]) : undefined}
          />
          <Card className="max-h-[560px] overflow-hidden">
            <CardHeader title={`${rows.length} on map`} subtitle={fmtDate(date)} />
            <div className="max-h-[480px] overflow-y-auto">
              {rows.length === 0 ? (
                <EmptyState title="No location data" message="Staff appear here once their app shares a location for this day." />
              ) : (
                <ul className="divide-y divide-line">
                  {rows.map((r) => (
                    <li key={r.staff_id}>
                      <button onClick={() => setSel(sel?.staff_id === r.staff_id ? null : r)} className={clsx('flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface2', sel?.staff_id === r.staff_id && 'bg-brandsoft')}>
                        <Avatar name={r.staff_name} src={r.staff_image} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.staff_name}</span>
                          <span className="block text-xs text-muted">{r.last_location.formatted_time} · {r.point_count} points</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
