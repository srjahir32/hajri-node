'use client';

import clsx from 'clsx';
import { fmtClock, fmtDuration } from '@/lib/format';
import type { DaySummary } from '@/lib/types';

const tone: Record<string, string> = {
  Present: 'bg-successsoft text-success border-success/30',
  Absent: 'bg-dangersoft text-danger border-danger/30',
  'Half Day': 'bg-warningsoft text-warning border-warning/30',
  'Paid Leave': 'bg-infosoft text-info border-info/30',
  Leave: 'bg-infosoft text-info border-info/30',
  Holiday: 'bg-brandsoft text-brand border-brand/30',
  Pending: 'bg-warningsoft text-warning border-warning/40 border-dashed',
  'Not Marked': 'bg-surface text-muted',
};

/** Month grid; weeks start on Sunday. Pass an ISO month ("2026-03") and the day summaries. */
export function AttendanceCalendar({ month, days, onSelect, selected }: { month: string; days: DaySummary[]; onSelect?: (d: DaySummary) => void; selected?: string | null }) {
  const [y, m] = month.split('-').map(Number);
  const lead = new Date(y, m - 1, 1).getDay();
  const today = new Date().toISOString().slice(0, 10);
  const byDate = new Map(days.map((d) => [d.date, d]));
  const cells: (DaySummary | null)[] = [...Array(lead).fill(null), ...days];
  void byDate;

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-xs font-medium uppercase tracking-wide text-muted">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) =>
          d ? (
            <button
              key={d.date}
              type="button"
              onClick={() => onSelect?.(d)}
              aria-label={`${d.date}: ${d.status}`}
              aria-pressed={selected === d.date}
              className={clsx(
                'flex min-h-16 flex-col items-start gap-0.5 rounded-lg border p-1.5 text-left transition hover:brightness-95 sm:min-h-20 sm:p-2',
                tone[d.status] ?? tone['Not Marked'],
                selected === d.date && 'ring-2 ring-brand',
                d.date === today && 'outline-2 outline-offset-1 outline-brand',
              )}
            >
              <span className="text-sm font-semibold">{Number(d.date.slice(8))}</span>
              <span className="hidden text-[11px] leading-tight sm:block">{d.status === 'Not Marked' ? '' : d.status}</span>
              {d.total_seconds > 0 && <span className="tnum hidden text-[11px] leading-tight sm:block">{fmtDuration(d.total_seconds)}</span>}
            </button>
          ) : (
            <div key={`pad-${i}`} />
          ),
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {['Present', 'Half Day', 'Absent', 'Leave', 'Holiday', 'Pending'].map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5"><span className={clsx('size-3 rounded border', tone[s])} />{s}</span>
        ))}
      </div>
    </div>
  );
}

export function DayDetail({ day }: { day: DaySummary }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="Status" value={day.status} />
        <Mini label="First in" value={fmtClock(day.first_in)} />
        <Mini label="Last out" value={fmtClock(day.last_out)} />
        <Mini label="Worked" value={fmtDuration(day.total_seconds)} />
        <Mini label="Break" value={fmtDuration(day.break_seconds)} />
        <Mini label="Overtime" value={fmtDuration(day.overtime_seconds)} />
        <Mini label="Behavior" value={day.behavior ?? '—'} />
        <Mini label="Shift hours" value={day.payable_seconds ? fmtDuration(day.payable_seconds) : '—'} />
      </div>
      {day.holiday && <p className="rounded-lg bg-brandsoft px-3 py-2 text-brand">Holiday: {day.holiday.name}</p>}
      {day.is_leave === 1 && <p className="rounded-lg bg-infosoft px-3 py-2 text-info">On approved {day.leave_type?.toLowerCase()} leave</p>}
      {day.punches.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Punches</p>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {day.punches.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="tnum">{fmtClock(p.in_time)} → {fmtClock(p.out_time)}</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {p.is_manual ? 'Manual' : ''}
                  {p.attendance_status === 0 && <span className="rounded bg-warningsoft px-1.5 py-0.5 text-warning">Pending</span>}
                  {p.attendance_status === 2 && <span className="rounded bg-dangersoft px-1.5 py-0.5 text-danger">Rejected</span>}
                  <span className="tnum">{fmtDuration(p.total_seconds)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {day.note && <p className="rounded-lg bg-surface2 px-3 py-2 text-muted">Note: {day.note}</p>}
    </div>
  );
}

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-surface2 px-3 py-2">
    <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
    <p className="font-medium">{value}</p>
  </div>
);
