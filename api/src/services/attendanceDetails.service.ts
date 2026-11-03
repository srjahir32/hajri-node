import { DateTime } from 'luxon';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { dateOnly, eachDate } from '../lib/time';
import { businessTz, holidayCalendar } from './context.service';

export const detailsQuery = z.object({ filter: z.enum(['today', 'this_week', 'last_week', 'this_year']).optional(), month: z.string().regex(/^\d{4}-\d{2}$/).optional() });

/**
 * "Attendance Details": per-staff scheduled / worked / break / balance hours for each day of a range
 * (today, this/last week, this year or a month), as in Laravel's attendance cards.
 */
export async function attendanceDetails(businessId: number, q: z.infer<typeof detailsQuery>, onlyStaffId?: number) {
  const tz = await businessTz(businessId);
  const now = DateTime.now().setZone(tz);
  let start = now.startOf('month');
  let end = now.endOf('month');
  let title = now.toFormat('LLLL, yyyy');
  if (q.filter === 'today') { start = now.startOf('day'); end = now.endOf('day'); title = now.toFormat('dd LLLL, yyyy'); }
  else if (q.filter === 'this_week' || q.filter === 'last_week') {
    const base = q.filter === 'last_week' ? now.minus({ weeks: 1 }) : now;
    start = base.startOf('week'); end = base.endOf('week'); title = `${start.toFormat('dd LLL')} - ${end.toFormat('dd LLL, yyyy')}`;
  } else if (q.filter === 'this_year') { start = now.startOf('year'); end = now.endOf('year'); title = start.toFormat('yyyy'); }
  else if (q.month) { start = DateTime.fromFormat(q.month, 'yyyy-MM', { zone: tz }); end = start.endOf('month'); title = start.toFormat('LLLL, yyyy'); }
  const from = start.toISODate()!;
  const to = end.toISODate()!;
  const dates = eachDate(from, to);
  const today = now.toISODate()!;

  const staff = await prisma.staff.findMany({
    where: { businessId, deletedAt: null, isDeactivated: false, ...(onlyStaffId ? { id: onlyStaffId } : {}) },
    include: { department: true, photos: { take: 1, orderBy: { id: 'desc' } }, shiftUser: { include: { shift: { include: { details: { orderBy: { position: 'asc' }, take: 1 } } } } } },
    orderBy: { name: 'asc' },
  });
  const records = await prisma.attendance.findMany({ where: { staffId: { in: staff.map((s) => s.id) }, date: { gte: dateOnly(from), lte: dateOnly(to) }, deletedAt: null, approval: 1 } });
  const byStaff = new Map<number, Map<string, typeof records>>();
  for (const r of records) {
    const d = r.date.toISOString().slice(0, 10);
    const m = byStaff.get(r.staffId) ?? new Map();
    m.set(d, [...(m.get(d) ?? []), r]);
    byStaff.set(r.staffId, m);
  }
  const hm = (sec: number) => `${sec < 0 ? '-' : ''}${Math.floor(Math.abs(sec) / 3600)}:${String(Math.floor((Math.abs(sec) % 3600) / 60)).padStart(2, '0')}`;
  const out = [];
  for (const s of staff) {
    const isOff = await holidayCalendar(businessId, s.id, dates);
    const shiftSeconds = s.shiftUser?.shift.details[0]?.totalPayableSeconds || 8.5 * 3600;
    const totals = { S: 0, W: 0, BT: 0, B: 0 };
    const calendar = dates.map((d) => {
      const recs = byStaff.get(s.id)?.get(d);
      const off = isOff(d).isHoliday;
      const sched = off ? 0 : shiftSeconds;
      const worked = (recs ?? []).reduce((a, r) => a + r.totalSeconds, 0);
      const brk = recs?.[0]?.breakSeconds ?? 0;
      const balance = worked - sched;
      totals.S += sched;
      totals.B += balance;
      if (d <= today || recs || to < today) { totals.W += worked; totals.BT += brk; }
      const hide = off && !recs;
      return {
        full_date: DateTime.fromISO(d).toFormat('LLL d'),
        S: sched > 0 && !hide ? hm(sched).padStart(5, '0') : '',
        W: hide ? '' : worked > 0 || recs ? hm(worked) : '00:00',
        BT: hide ? '' : brk > 0 ? hm(brk) : '00:00',
        B: hide && balance === 0 ? '' : hm(balance),
      };
    });
    out.push({ id: s.id, name: s.name, department: s.department?.name ?? null, photo: s.photos[0]?.url ?? null, calendar, totals: { S: hm(totals.S), W: hm(totals.W), BT: hm(totals.BT), B: hm(totals.B) } });
  }
  return { cards: out, meta: { title, from, to, month: start.toFormat('yyyy-LL') } };
}
