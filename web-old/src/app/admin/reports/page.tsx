'use client';

import clsx from 'clsx';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader, StatusBadge } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Field';
import { Avatar, EmptyState, ErrorState, MonthPicker, SearchInput, TableSkeleton, Tabs } from '@/components/ui/Misc';
import { Table, TableWrap, Td, Th, THead, Tr } from '@/components/ui/Table';
import { adminApi } from '@/lib/api';
import { fmtDate, fmtDuration, fmtMoney, monthStr, todayStr } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import { errMsg, useAdmin } from '@/lib/query';
import type { Department, PayrollRow } from '@/lib/types';

interface AttRow {
  staff_id: number;
  name: string;
  department: string | null;
  days: { date: string; status: string; code: string }[];
  present: number;
  absent: number;
  half_day: number;
  leave: number;
  holidays: number;
  late: number;
  worked_seconds: number;
  overtime_seconds: number;
}

const CODE_TONE: Record<string, string> = { P: 'text-success', A: 'text-danger', HD: 'text-warning', PL: 'text-info', L: 'text-info', H: 'text-brand', PN: 'text-warning' };

function AttendanceReport() {
  const first = `${todayStr().slice(0, 8)}01`;
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(todayStr());
  const [dept, setDept] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const params = { from, to, department_id: dept, search: q };
  const list = useAdmin<AttRow[]>('/admin/reports/attendance', params, { keepPrevious: true });
  const departments = useAdmin<Department[]>('/admin/departments');
  const dates = (list.data as unknown as { dates?: string[] } | undefined)?.dates ?? [];

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm">From<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-40" /></label>
        <label className="text-sm">To<Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="mt-1 w-40" /></label>
        <Select value={dept} onChange={(e) => setDept(e.target.value)} className="w-48" aria-label="Department">
          <option value="">All departments</option>
          {departments.data?.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <SearchInput value={search} onChange={setSearch} placeholder="Search staff" className="w-full sm:w-56" />
        <Button variant="secondary" icon={<Download className="size-4" />} className="sm:ml-auto" onClick={() => void adminApi.download('/admin/reports/attendance/export', params, 'attendance.xlsx').catch((e) => toast.error(errMsg(e)))}>
          Export Excel
        </Button>
      </div>
      {list.error ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> : !list.data ? <TableSkeleton cols={8} /> : list.data.data.length === 0 ? <EmptyState title="No staff" /> : (
        <TableWrap>
          <Table className="text-xs">
            <THead>
              <tr>
                <Th className="sticky left-0 bg-surface2">Staff</Th>
                {dates.map((d) => <Th key={d} align="center" className="px-1.5">{d.slice(8)}</Th>)}
                <Th align="right">P</Th><Th align="right">A</Th><Th align="right">HD</Th><Th align="right">L</Th><Th align="right">Late</Th><Th align="right">Hours</Th><Th align="right">OT</Th>
              </tr>
            </THead>
            <tbody>
              {list.data.data.map((r) => (
                <Tr key={r.staff_id}>
                  <Td className="sticky left-0 whitespace-nowrap bg-surface text-sm font-medium">{r.name}</Td>
                  {r.days.map((d) => (
                    <Td key={d.date} align="center" className={clsx('px-1.5 py-2 font-semibold', CODE_TONE[d.code] ?? 'text-muted')} title={`${fmtDate(d.date)}: ${d.status}`}>{d.code}</Td>
                  ))}
                  <Td align="right" className="tnum">{r.present}</Td>
                  <Td align="right" className="tnum">{r.absent}</Td>
                  <Td align="right" className="tnum">{r.half_day}</Td>
                  <Td align="right" className="tnum">{r.leave}</Td>
                  <Td align="right" className="tnum">{r.late}</Td>
                  <Td align="right" className="tnum whitespace-nowrap">{fmtDuration(r.worked_seconds)}</Td>
                  <Td align="right" className="tnum whitespace-nowrap">{r.overtime_seconds ? fmtDuration(r.overtime_seconds) : '—'}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Card>
  );
}

function SalaryReport() {
  const [month, setMonth] = useState(monthStr());
  const [dept, setDept] = useState('');
  const [y, m] = month.split('-').map(Number);
  const list = useAdmin<PayrollRow[]>('/admin/reports/salary', { month: m, year: y, department_id: dept });
  const departments = useAdmin<Department[]>('/admin/departments');
  const rows = list.data?.data ?? [];
  const total = rows.reduce((s, r) => s + r.net_salary, 0);
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <MonthPicker value={month} onChange={setMonth} />
        <Select value={dept} onChange={(e) => setDept(e.target.value)} className="w-48" aria-label="Department">
          <option value="">All departments</option>
          {departments.data?.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => void adminApi.download('/admin/reports/salary/export', { month: m, year: y, department_id: dept }, 'salary.xlsx').catch((e) => toast.error(errMsg(e)))}>Excel</Button>
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => void adminApi.download('/admin/reports/salary-slips', { month: m, year: y }, 'salary-slips.pdf').catch((e) => toast.error(errMsg(e)))}>Salary slips (PDF)</Button>
        </div>
      </div>
      {list.error ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> : !list.data ? <TableSkeleton cols={6} /> : rows.length === 0 ? <EmptyState title="No staff" /> : (
        <TableWrap>
          <Table>
            <THead><tr><Th>Staff</Th><Th>Department</Th><Th align="right">Salary</Th><Th align="right">Worked</Th><Th align="right">Net salary</Th><Th>Status</Th></tr></THead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td><span className="flex items-center gap-2"><Avatar name={r.name} src={r.photo} size={28} />{r.name}</span></Td>
                  <Td className="text-muted">{r.department ?? '—'}</Td>
                  <Td align="right" className="tnum">{fmtMoney(r.salary_amount)}</Td>
                  <Td align="right" className="tnum">{fmtDuration(r.worked_seconds)}</Td>
                  <Td align="right" className="tnum font-semibold">{fmtMoney(r.net_salary)}</Td>
                  <Td><StatusBadge status={r.processed ? 'Processed' : 'Pending'} /></Td>
                </Tr>
              ))}
              <Tr className="bg-surface2 font-semibold"><Td colSpan={4} align="right">Total</Td><Td align="right" className="tnum">{fmtMoney(total)}</Td><Td /></Tr>
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Card>
  );
}

interface StaffRow { id: number; full_name: string; phone_number: string; department: { name: string } | null; designation: string | null; salary_amount: number | null; is_deactivate: number }

function StaffReport() {
  const list = useAdmin<StaffRow[]>('/admin/reports/staff', { status: 'all' });
  return (
    <Card>
      <div className="flex justify-end p-4">
        <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => void adminApi.download('/admin/reports/staff/export', undefined, 'staff.xlsx').catch((e) => toast.error(errMsg(e)))}>Export Excel</Button>
      </div>
      {list.error ? <ErrorState message={list.error.message} /> : !list.data ? <TableSkeleton cols={5} /> : (
        <TableWrap>
          <Table>
            <THead><tr><Th>Name</Th><Th>Phone</Th><Th>Department</Th><Th>Designation</Th><Th align="right">Salary</Th><Th>Status</Th></tr></THead>
            <tbody>
              {list.data.data.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-medium">{s.full_name}</Td>
                  <Td className="tnum text-muted">{s.phone_number}</Td>
                  <Td>{s.department?.name ?? '—'}</Td>
                  <Td>{s.designation ?? '—'}</Td>
                  <Td align="right" className="tnum">{s.salary_amount ? fmtMoney(s.salary_amount) : '—'}</Td>
                  <Td><StatusBadge status={s.is_deactivate ? 'Deactivated' : 'Active'} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Card>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState<'attendance' | 'salary' | 'staff'>('attendance');
  return (
    <>
      <PageHeader title="Reports" subtitle="Attendance, salary and staff reports — view here or export to Excel" />
      <div className="mb-4">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'attendance', label: 'Attendance' }, { id: 'salary', label: 'Salary' }, { id: 'staff', label: 'Staff list' }]} />
      </div>
      {tab === 'attendance' && <AttendanceReport />}
      {tab === 'salary' && <SalaryReport />}
      {tab === 'staff' && <StaffReport />}
    </>
  );
}
