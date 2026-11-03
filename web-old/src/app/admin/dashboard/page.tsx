'use client';

import { CalendarOff, Clock, Hourglass, UserCheck, UserMinus, Users, UserX } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { MonthChart } from '@/components/charts/MonthChart';
import { Badge, Card, CardBody, CardHeader, PageHeader, Stat } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { Avatar, EmptyState, ErrorState, MonthPicker, Skeleton } from '@/components/ui/Misc';
import { fmtClock, fmtDate, monthStr, todayStr } from '@/lib/format';
import { useAdmin } from '@/lib/query';
import { useAdminSession } from '@/lib/auth';
import type { DayCounts } from '@/lib/types';

interface MiniStaff { id: number; full_name: string; photo: string | null; department: string | null; in_time: string | null; out_time: string | null; behavior: string | null; status: string }
interface Dashboard {
  date: string;
  count: DayCounts;
  holiday: { name: string | null } | null;
  present_staff: MiniStaff[];
  absent_staff: MiniStaff[];
  half_day_staff: MiniStaff[];
  leave_staff: MiniStaff[];
  late_staff: MiniStaff[];
  department_wise_late_count: { id: number; name: string; late_count: number }[];
  pending: { attendance: number; leaves: number };
  upcoming_holidays: { id: number; name: string; date: string }[];
}

function StaffList({ title, rows, empty, href, time }: { title: string; rows: MiniStaff[]; empty: string; href?: string; time?: (r: MiniStaff) => string }) {
  return (
    <Card>
      <CardHeader title={title} actions={href ? <Link href={href} className="text-sm text-brand hover:underline">View all</Link> : undefined} />
      {rows.length ? (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={r.full_name} src={r.photo} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.full_name}</p>
                <p className="truncate text-xs text-muted">{r.department ?? 'No department'}</p>
              </div>
              <span className="tnum text-sm text-muted">{time?.(r)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-muted">{empty}</p>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const { business } = useAdminSession();
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(monthStr());
  const dash = useAdmin<Dashboard>('/admin/dashboard', { date }, { keepPrevious: true });
  const chart = useAdmin<{ present: never[]; absent: never[]; half_day: never[] }>('/admin/dashboard/chart', { month });
  const d = dash.data?.data;

  return (
    <>
      <PageHeader
        title={`Welcome back${business ? `, ${business.name}` : ''}`}
        subtitle={d?.holiday ? `Today is a holiday: ${d.holiday.name}` : `Attendance snapshot for ${fmtDate(date)}`}
        actions={<Input type="date" value={date} max={todayStr()} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-44" aria-label="Date" />}
      />

      {dash.error ? (
        <Card><ErrorState message={dash.error.message} onRetry={() => void dash.refetch()} /></Card>
      ) : !d ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total staff" value={d.count.staff_count} icon={<Users className="size-5" />} href="/admin/staff" />
            <Stat label="Present" value={d.count.present_count} icon={<UserCheck className="size-5" />} tone="success" />
            <Stat label="Absent" value={d.count.absent_count} icon={<UserX className="size-5" />} tone="danger" />
            <Stat label="Half day" value={d.count.halfday_count} icon={<UserMinus className="size-5" />} tone="warning" />
            <Stat label="On leave" value={d.count.leave_count} icon={<CalendarOff className="size-5" />} tone="info" />
            <Stat label="Late arrivals" value={d.count.late_count} icon={<Clock className="size-5" />} tone="warning" />
            <Stat label="Not marked" value={d.count.not_marked_count} icon={<Hourglass className="size-5" />} tone="info" />
            <Stat label="Awaiting approval" value={d.pending.attendance + d.pending.leaves} icon={<Hourglass className="size-5" />} tone="brand" hint={`${d.pending.attendance} punches · ${d.pending.leaves} leaves`} href="/admin/attendance/requests" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Attendance this month" subtitle="Distinct staff per day" actions={<MonthPicker value={month} onChange={setMonth} />} />
              <CardBody>{chart.data ? <MonthChart data={chart.data.data} /> : <Skeleton className="h-72" />}</CardBody>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader title="Late arrivals by department" />
                <CardBody className="space-y-3">
                  {d.department_wise_late_count.length ? d.department_wise_late_count.map((x) => (
                    <div key={x.id}>
                      <div className="mb-1 flex justify-between text-sm"><span>{x.name}</span><span className="tnum text-muted">{x.late_count}</span></div>
                      <div className="h-1.5 rounded-full bg-surface2"><div className="h-1.5 rounded-full bg-warning" style={{ width: `${Math.min(100, x.late_count * 20)}%` }} /></div>
                    </div>
                  )) : <p className="text-sm text-muted">No departments yet.</p>}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Upcoming holidays" />
                {d.upcoming_holidays.length ? (
                  <ul className="divide-y divide-line">
                    {d.upcoming_holidays.map((h) => (
                      <li key={h.id} className="flex items-center justify-between px-5 py-3 text-sm"><span>{h.name}</span><Badge tone="brand">{fmtDate(h.date, { day: '2-digit', month: 'short' })}</Badge></li>
                    ))}
                  </ul>
                ) : <EmptyState title="No upcoming holidays" message="Add a holiday template under Settings → Holidays." />}
              </Card>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <StaffList title="Present" rows={d.present_staff} empty="Nobody has punched in yet." href="/admin/attendance" time={(r) => fmtClock(r.in_time)} />
            <StaffList title="Late" rows={d.late_staff} empty="No late arrivals." href="/admin/attendance?status=Late" time={(r) => fmtClock(r.in_time)} />
            <StaffList title="Absent" rows={d.absent_staff} empty="No absentees marked." href="/admin/attendance?status=Absent" />
            <StaffList title="Half day" rows={d.half_day_staff} empty="Nobody on half day." />
            <StaffList title="On leave" rows={d.leave_staff} empty="Nobody on leave today." href="/admin/attendance/leaves" />
          </div>
        </>
      )}
    </>
  );
}
