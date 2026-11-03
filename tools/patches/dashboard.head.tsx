import { count } from '@/lib/blade';
import { useMemo, useState } from 'react';
import { useAdmin } from '@/lib/query';
import { monthStr, todayStr } from '@/lib/format';
import { MonthPicker } from '@/components/widgets/MonthPicker';
import { ApexChart } from '@/components/widgets/ApexChart';
import { LiveMap } from './LiveMap';
import '@/styles/dashboard-new.css';

interface StaffRow { id: number; full_name: string; photo: string | null; department: string | null }
interface DashboardData {
  date: string;
  count: { staff_count: number; present_count: number; absent_count: number; halfday_count: number; late_count: number; pending_count: number };
  total_department: number;
  present_staff: StaffRow[];
  absent_staff: StaffRow[];
  half_day_staff: StaffRow[];
  department_wise_late_count: { id: number; name: string; late_count: number }[];
  pending: { attendance: number; leaves: number };
  upcoming_holidays: { id: number; name: string; date: string }[];
}
interface ChartData { present: { count: number }[]; absent: { count: number }[]; half_day: { count: number }[] }

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Same shape the Blade view loops over: groups with a `Staff` list. */
const toGroups = (rows: StaffRow[] = []) =>
  rows.map((r) => ({ staff_id: r.id, Staff: [{ name: r.full_name, staffPhoto: r.photo ? [{ photo: r.photo }] : [], Department: { name: r.department } }] }));

export default function Body() {
  const [month, setMonth] = useState(monthStr());
  const dash = useAdmin<DashboardData>('/admin/dashboard');
  const chartRes = useAdmin<ChartData>('/admin/dashboard/chart', { month });
  const d = dash.data?.data;
  const today = new Date(`${d?.date ?? todayStr()}T00:00:00`);
  const current_day = `${DAY_NAMES[today.getDay()]}, ${String(today.getDate()).padStart(2, '0')} ${MONTH_NAMES[today.getMonth()].slice(0, 3)} ${today.getFullYear()}`;
  const total_staff = d?.count.staff_count ?? 0;
  const total_department = d?.total_department ?? 0;
  const present_count = d?.count.present_count ?? 0;
  const absent_count = d?.count.absent_count ?? 0;
  const half_day = d?.count.halfday_count ?? 0;
  const late_staff_count = d?.count.late_count ?? 0;
  const pending_approval_count = (d?.pending.attendance ?? 0) + (d?.pending.leaves ?? 0);
  const percentage = total_staff > 0 ? Math.round((present_count / total_staff) * 10000) / 100 : 0;
  const absent_percentage = total_staff > 0 ? Math.round((absent_count / total_staff) * 10000) / 100 : 0;
  const presentstaff = useMemo(() => toGroups(d?.present_staff), [d]);
  const absentstaff = useMemo(() => toGroups(d?.absent_staff), [d]);
  const halfleave = useMemo(() => toGroups(d?.half_day_staff), [d]);
  const presentstaff_count = present_count;
  const absentstaff_count = absent_count;
  const halfleave_count = half_day;
  const department_wise_late_count = (d?.department_wise_late_count ?? []).filter((x) => x.late_count > 0);
  const holiday = (d?.upcoming_holidays ?? []).map((h) => ({ holiday_name: h.name, holiday_date: h.date }));
  const goStatus = (status: string) => {
    try {
      localStorage.setItem('attendanceStatus', status);
    } catch {}
    window.location.href = '/attendance-new';
  };
  const chart = chartRes.data?.data;
  const days = chart?.present.length ?? 0;
  const presentCounts = chart?.present.map((x) => x.count) ?? [];
  const absentCounts = chart?.absent.map((x) => x.count) ?? [];
  const halfdayCounts = chart?.half_day.map((x) => x.count) ?? [];
  const maxCount = Math.max(0, ...presentCounts) + Math.max(0, ...absentCounts) + Math.max(0, ...halfdayCounts);
  const yMax = maxCount !== 0 ? maxCount : 20;
  return (
