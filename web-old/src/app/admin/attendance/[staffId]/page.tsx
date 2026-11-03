'use client';

import { ArrowLeft, CalendarPlus, ClipboardEdit, MessageSquarePlus } from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';
import { AttendanceCalendar, DayDetail } from '@/components/attendance/AttendanceCalendar';
import { ManualPunchModal, MarkStatusModal, NoteModal } from '@/components/attendance/Modals';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, PageHeader, Stat } from '@/components/ui/Card';
import { Avatar, ErrorState, MonthPicker, PageLoader } from '@/components/ui/Misc';
import { useAdminSession } from '@/lib/auth';
import { fmtDate, monthStr } from '@/lib/format';
import { useAdmin } from '@/lib/query';
import type { DaySummary, StaffCard } from '@/lib/types';

interface Detail {
  staff: StaffCard;
  days: DaySummary[];
  count: Record<string, number>;
}

export default function StaffMonthPage({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = use(params);
  const { can } = useAdminSession();
  const [month, setMonth] = useState(monthStr());
  const [sel, setSel] = useState<string | null>(null);
  const [modal, setModal] = useState<'status' | 'punch' | 'note' | null>(null);
  const [y, m] = month.split('-');
  const q = useAdmin<Detail>(`/admin/staff/${staffId}/attendance`, { month: Number(m), year: Number(y) }, { keepPrevious: true });
  const day = q.data?.data.days.find((d) => d.date === sel) ?? null;
  const logs = useAdmin<{ summary: DaySummary; logs: { id: number; detail: string; created_at: string }[] }>(sel ? `/admin/staff/${staffId}/day` : null, { date: sel });

  if (q.error) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />;
  if (!q.data) return <PageLoader />;
  const { staff, days, count } = q.data.data;
  const canEdit = can('approve_punches', 'view_attendance');

  return (
    <>
      <PageHeader
        back={<Link href="/admin/attendance" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Daily attendance</Link>}
        title={<span className="flex items-center gap-3"><Avatar name={staff.full_name} src={staff.photo} size={44} />{staff.full_name}</span>}
        subtitle={staff.department?.name}
        actions={<MonthPicker value={month} onChange={(v) => { setMonth(v); setSel(null); }} />}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Present" value={count.present_count} tone="success" />
        <Stat label="Absent" value={count.absent_count} tone="danger" />
        <Stat label="Half day" value={count.halfday_count} tone="warning" />
        <Stat label="Leave" value={count.leave} tone="info" />
        <Stat label="Overtime days" value={count.overtime} tone="brand" />
        <Stat label="Short days" value={count.fine} tone="warning" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardBody><AttendanceCalendar month={month} days={days} onSelect={(d) => setSel(d.date)} selected={sel} /></CardBody></Card>
        <Card>
          <CardHeader title={sel ? fmtDate(sel, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Day details'} />
          <CardBody className="space-y-4">
            {day ? (
              <>
                <DayDetail day={day} />
                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" icon={<ClipboardEdit className="size-4" />} onClick={() => setModal('status')}>Mark status</Button>
                    <Button size="sm" variant="secondary" icon={<CalendarPlus className="size-4" />} onClick={() => setModal('punch')}>Add punch</Button>
                    <Button size="sm" variant="secondary" icon={<MessageSquarePlus className="size-4" />} onClick={() => setModal('note')}>Note</Button>
                  </div>
                )}
                {!!logs.data?.data.logs.length && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Activity</p>
                    <ul className="space-y-1.5 text-sm text-muted">{logs.data.data.logs.map((l) => <li key={l.id}>• {l.detail}</li>)}</ul>
                  </div>
                )}
              </>
            ) : <p className="text-sm text-muted">Select a day to see punches, edit the status or add a note.</p>}
          </CardBody>
        </Card>
      </div>
      {sel && modal === 'status' && <MarkStatusModal open onClose={() => setModal(null)} staffId={staff.id} staffName={staff.full_name} date={sel} />}
      {sel && modal === 'punch' && <ManualPunchModal open onClose={() => setModal(null)} staffId={staff.id} staffName={staff.full_name} date={sel} />}
      {sel && modal === 'note' && <NoteModal open onClose={() => setModal(null)} staffId={staff.id} staffName={staff.full_name} date={sel} />}
    </>
  );
}
