'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AttendanceCalendar, DayDetail } from '@/components/attendance/AttendanceCalendar';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, PageHeader, Stat } from '@/components/ui/Card';
import { ErrorState, MonthPicker, PageLoader } from '@/components/ui/Misc';
import { staffApi } from '@/lib/api';
import { fmtDate, monthStr } from '@/lib/format';
import { errMsg, useStaff } from '@/lib/query';
import type { DaySummary } from '@/lib/types';

export default function MyAttendancePage() {
  const [month, setMonth] = useState(monthStr());
  const [sel, setSel] = useState<DaySummary | null>(null);
  const [y, m] = month.split('-').map(Number);
  const q = useStaff<DaySummary[]>('/employee/attendance', { month: m, year: y }, { keepPrevious: true });
  const count = (q.data as unknown as { count?: Record<string, number> } | undefined)?.count;

  if (q.error) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />;
  return (
    <>
      <PageHeader
        title="My attendance"
        actions={
          <>
            <MonthPicker value={month} onChange={(v) => { setMonth(v); setSel(null); }} />
            <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => void staffApi.download('/employee/attendance/export', { month: m, year: y }, 'attendance.xlsx').catch((e) => toast.error(errMsg(e)))}>Excel</Button>
          </>
        }
      />
      {count && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
          <Stat label="Present" value={count.present_count} tone="success" />
          <Stat label="Absent" value={count.absent_count} tone="danger" />
          <Stat label="Half day" value={count.halfday_count} tone="warning" />
          <Stat label="Leave" value={count.leave} tone="info" />
          <Stat label="Overtime days" value={count.overtime} tone="brand" />
          <Stat label="Short days" value={count.fine} tone="warning" />
        </div>
      )}
      {!q.data ? <PageLoader /> : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2"><CardBody><AttendanceCalendar month={month} days={q.data.data} onSelect={setSel} selected={sel?.date} /></CardBody></Card>
          <Card>
            <CardHeader title={sel ? fmtDate(sel.date, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Day details'} />
            <CardBody>{sel ? <DayDetail day={sel} /> : <p className="text-sm text-muted">Tap a day to see your punches, breaks and overtime.</p>}</CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
