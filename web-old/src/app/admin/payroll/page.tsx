'use client';

import { AlertTriangle, Download, FileText, Play } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader, Stat, StatusBadge } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { Select } from '@/components/ui/Field';
import { Avatar, EmptyState, ErrorState, MonthPicker, SearchInput, TableSkeleton } from '@/components/ui/Misc';
import { Table, TableWrap, Td, Th, THead, Tr } from '@/components/ui/Table';
import { adminApi } from '@/lib/api';
import { fmtDuration, fmtMoney, monthLabel, monthStr } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import { errMsg, useAction, useAdmin } from '@/lib/query';
import type { Department, PayrollRow } from '@/lib/types';
import { Banknote, CheckCircle2, Users } from 'lucide-react';

interface Summary { staff_count: number; processed_count: number; total_net_salary: number; total_processed: number }

export default function PayrollPage() {
  const [month, setMonth] = useState(monthStr());
  const [dept, setDept] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [ask, dialog] = useConfirm();
  const [y, m] = month.split('-').map(Number);

  const list = useAdmin<PayrollRow[]>('/admin/payroll', { month: m, year: y, department_id: dept, search: q }, { keepPrevious: true });
  const approvals = useAdmin<{ pending_punches: number; pending_leaves: number; overtime_days: number; can_process: boolean }>('/admin/payroll/approvals', { month: m, year: y });
  const departments = useAdmin<Department[]>('/admin/departments');
  const summary = (list.data as unknown as { summary?: Summary } | undefined)?.summary;
  const rows = list.data?.data ?? [];

  const process = useAction(() => adminApi.post('/admin/payroll/process', { month: m, year: y }), { invalidate: ['/admin/payroll', '/admin/reports'] });
  const ap = approvals.data?.data;
  const unprocessed = rows.filter((r) => !r.processed).length;

  return (
    <>
      <PageHeader
        title="Payroll"
        subtitle={`Salary for ${monthLabel(month)}`}
        actions={
          <>
            <MonthPicker value={month} onChange={setMonth} />
            <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => void adminApi.download('/admin/payroll/export', { month: m, year: y }, 'payroll.xlsx').catch((e) => toast.error(errMsg(e)))}>Excel</Button>
            <Button variant="secondary" icon={<FileText className="size-4" />} disabled={!summary?.processed_count} onClick={() => void adminApi.download('/admin/payroll/slips', { month: m, year: y }, 'salary-slips.pdf').catch((e) => toast.error(errMsg(e)))}>Salary slips</Button>
          </>
        }
      />

      {ap && !ap.can_process && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/40 bg-warningsoft p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="flex-1">
            <p className="font-medium">Resolve pending approvals before processing payroll</p>
            <p className="text-muted">{ap.pending_punches} punch approvals and {ap.pending_leaves} leave requests are still open for this month.</p>
          </div>
          <Link href="/admin/attendance/requests" className="font-medium text-brand hover:underline">Review</Link>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Staff" value={summary?.staff_count ?? '–'} icon={<Users className="size-5" />} />
        <Stat label="Processed" value={summary ? `${summary.processed_count}/${summary.staff_count}` : '–'} icon={<CheckCircle2 className="size-5" />} tone="success" />
        <Stat label="Total net salary" value={summary ? fmtMoney(summary.total_net_salary) : '–'} icon={<Banknote className="size-5" />} tone="brand" hint={summary ? `${fmtMoney(summary.total_processed)} processed` : undefined} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-wrap gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search staff" className="w-full sm:w-64" />
            <Select value={dept} onChange={(e) => setDept(e.target.value)} className="w-full sm:w-52" aria-label="Department">
              <option value="">All departments</option>
              {departments.data?.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>
          <Button
            icon={<Play className="size-4" />}
            disabled={!unprocessed}
            loading={process.isPending}
            onClick={() => ask({
              title: `Process payroll for ${monthLabel(month)}?`,
              message: `This calculates and saves salary for ${unprocessed} staff member(s). You can reopen an individual payroll later to recalculate it.${ap && !ap.can_process ? ' Some approvals are still pending.' : ''}`,
              confirmLabel: 'Process payroll',
              tone: 'primary',
              onConfirm: () => process.mutateAsync(),
            })}
          >
            Process {unprocessed || ''} pending
          </Button>
        </div>
        {list.error ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> : !list.data ? <TableSkeleton cols={7} /> : rows.length === 0 ? <EmptyState title="No staff" message="Add staff to calculate payroll." /> : (
          <TableWrap>
            <Table>
              <THead><tr><Th>Staff</Th><Th align="right">Monthly salary</Th><Th align="right">Worked</Th><Th align="right">Overtime</Th><Th align="right">Net salary</Th><Th>Status</Th><Th /></tr></THead>
              <tbody>
                {rows.map((r) => (
                  <Tr key={r.id}>
                    <Td>
                      <Link href={`/admin/payroll/${r.id}?month=${month}`} className="flex items-center gap-3 hover:text-brand">
                        <Avatar name={r.name} src={r.photo} size={32} />
                        <span><span className="block font-medium">{r.name}</span><span className="block text-xs text-muted">{r.staff_code} · {r.department ?? 'No department'}</span></span>
                      </Link>
                    </Td>
                    <Td align="right" className="tnum">{fmtMoney(r.salary_amount)}</Td>
                    <Td align="right" className="tnum">{fmtDuration(r.worked_seconds)}</Td>
                    <Td align="right" className="tnum">{r.overtime_seconds ? fmtDuration(r.overtime_seconds) : '—'}</Td>
                    <Td align="right" className="tnum font-semibold">{fmtMoney(r.net_salary)}</Td>
                    <Td><StatusBadge status={r.processed ? 'Processed' : 'Pending'} /></Td>
                    <Td align="right"><Link href={`/admin/payroll/${r.id}?month=${month}`} className="text-sm text-brand hover:underline">Details</Link></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
      {dialog}
    </>
  );
}
