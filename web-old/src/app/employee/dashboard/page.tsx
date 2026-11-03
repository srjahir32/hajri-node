'use client';

import clsx from 'clsx';
import { Clock, Fingerprint, LogIn, LogOut, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardBody, CardHeader, PageHeader, Stat, StatusBadge } from '@/components/ui/Card';
import { ErrorState, PageLoader } from '@/components/ui/Misc';
import { ApiError, staffApi } from '@/lib/api';
import { useStaffSession } from '@/lib/auth';
import { fmtClock, fmtDate, fmtDuration } from '@/lib/format';
import { useAction, useStaff } from '@/lib/query';
import type { DaySummary, LeaveCard, Punch } from '@/lib/types';

interface Dash {
  date: string;
  timezone: string;
  summary: DaySummary;
  is_punched_in: boolean;
  last_attendance: Punch | null;
  shift: { name: string | null; type_id: number; start_time: string | null; end_time: string | null; break_minutes: number; payable_hours: number };
  holiday: { name: string | null } | null;
  leave: { leave_type: string; shift_type: string | null } | null;
  leave_cards: LeaveCard[];
  unread_notifications: number;
}

function Clock12({ tz }: { tz: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <p className="tnum text-5xl font-semibold">--:--</p>;
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, ...o }).format(now);
  return (
    <div>
      <p className="tnum text-5xl font-semibold tracking-tight">{f({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</p>
      <p className="mt-1 text-sm text-muted">{f({ weekday: 'long', day: 'numeric', month: 'long' })}</p>
    </div>
  );
}

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 });
  });
}

export default function EmployeeDashboard() {
  const { staff } = useStaffSession();
  const q = useStaff<Dash>('/employee/dashboard', undefined, { refetchInterval: 60_000 });
  const [locating, setLocating] = useState(false);
  const punch = useAction(
    async (pos: GeolocationPosition | null) =>
      staffApi.post('/employee/punch', pos ? { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy } : {}),
    { success: false, invalidate: ['/employee'] , onSuccess: (res) => {
      const r = res as unknown as { action: string; data: { needs_approval: boolean } };
      toast.success(r.action === 'punch_in' ? (r.data.needs_approval ? 'Punched in — waiting for approval' : 'Punched in') : 'Punched out');
    } },
  );

  async function onPunch() {
    setLocating(true);
    const pos = await getPosition();
    setLocating(false);
    if (!pos && staff.is_geo_fencing) {
      toast.error('Location is required for your account. Allow location access in the browser and try again.');
      return;
    }
    if (!pos) toast.message('Punching without location', { description: 'Allow location access to record where you punched.' });
    punch.mutate(pos);
  }

  if (q.error) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />;
  if (!q.data) return <PageLoader />;
  const d = q.data.data;
  const busy = locating || punch.isPending;
  const err = punch.error instanceof ApiError ? punch.error : null;

  return (
    <>
      <PageHeader title={`Hello, ${staff.name}`} subtitle={`${staff.business?.name}${staff.department ? ` · ${staff.department.name}` : ''}`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody className="flex flex-col items-center gap-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="space-y-4">
              <Clock12 tz={d.timezone} />
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <StatusBadge status={d.summary.status} />
                {d.summary.behavior === 'Late' && <Badge tone="warning">Late</Badge>}
                {d.holiday && <Badge tone="brand">Holiday: {d.holiday.name}</Badge>}
                {d.leave && <Badge tone="info">On {d.leave.leave_type.toLowerCase()} leave</Badge>}
              </div>
              <p className="flex items-center justify-center gap-1.5 text-sm text-muted sm:justify-start"><Clock className="size-4" /> {d.shift.name ?? 'No shift'}{d.shift.start_time ? ` · ${d.shift.start_time.slice(0, 5)}–${d.shift.end_time?.slice(0, 5)}` : ` · ${d.shift.payable_hours}h flexible`}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => void onPunch()}
                disabled={busy}
                aria-label={d.is_punched_in ? 'Punch out' : 'Punch in'}
                className={clsx('grid size-40 place-items-center rounded-full text-white shadow-pop transition active:scale-95 disabled:opacity-60', d.is_punched_in ? 'bg-danger' : 'bg-success')}
              >
                <span className="flex flex-col items-center gap-1.5">
                  {busy ? <Fingerprint className="size-10 animate-pulse" /> : d.is_punched_in ? <LogOut className="size-10" /> : <LogIn className="size-10" />}
                  <span className="text-lg font-semibold">{busy ? 'Please wait…' : d.is_punched_in ? 'Punch out' : 'Punch in'}</span>
                </span>
              </button>
              <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="size-3.5" /> Your location is recorded with each punch</p>
              {err && <p className="max-w-60 text-center text-sm text-danger" role="alert">{err.message}</p>}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Today" />
          <CardBody className="space-y-3 text-sm">
            <p className="flex justify-between"><span className="text-muted">First in</span><b className="tnum">{fmtClock(d.summary.first_in)}</b></p>
            <p className="flex justify-between"><span className="text-muted">Last out</span><b className="tnum">{fmtClock(d.summary.last_out)}</b></p>
            <p className="flex justify-between"><span className="text-muted">Worked</span><b className="tnum">{fmtDuration(d.summary.total_seconds)}</b></p>
            <p className="flex justify-between"><span className="text-muted">Break</span><b className="tnum">{fmtDuration(d.summary.break_seconds)}</b></p>
            {d.summary.overtime_seconds > 0 && <p className="flex justify-between"><span className="text-muted">Overtime</span><b className="tnum text-success">{fmtDuration(d.summary.overtime_seconds)}</b></p>}
            {d.summary.punches.length > 0 && (
              <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
                {d.summary.punches.map((p) => <li key={p.id} className="tnum flex justify-between px-3 py-2"><span>{fmtClock(p.in_time)} → {fmtClock(p.out_time)}</span>{p.attendance_status === 0 && <Badge tone="warning">Pending</Badge>}</li>)}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {d.leave_cards.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Leave balance</h2><Link href="/employee/leaves" className="text-sm text-brand hover:underline">Apply for leave</Link></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {d.leave_cards.map((c) => (
              <Stat key={c.policy_id} label={c.template_name} value={`${c.remaining_balance} day(s)`} tone="info" hint={`${c.remaining_label} · ${c.total_used} used of ${c.total_period_balance}`} />
            ))}
          </div>
        </section>
      )}
      <p className="mt-6 text-xs text-muted">Today in your timezone ({d.timezone}): {fmtDate(d.date)}</p>
    </>
  );
}
