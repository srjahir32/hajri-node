'use client';

import { useState } from 'react';
import { Card, PageHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { Avatar, EmptyState, ErrorState, MonthPicker, TableSkeleton, Tabs } from '@/components/ui/Misc';
import { Table, TableWrap, Td, Th, THead, Tr } from '@/components/ui/Table';
import { fmtDate, fmtDuration, monthStr } from '@/lib/format';
import { useAdmin } from '@/lib/query';
import type { Department } from '@/lib/types';

interface Row { id: number; full_name: string; photo: string | null; department: { name: string } | null; date: string; total_seconds: number; payable_seconds: number; extra_seconds: number }

export default function ReviewPage() {
  const [tab, setTab] = useState<'overtime' | 'fines'>('overtime');
  const [month, setMonth] = useState(monthStr());
  const [dept, setDept] = useState('');
  const [y, m] = month.split('-');
  const list = useAdmin<Row[]>(`/admin/attendance/review/${tab}`, { month: Number(m), year: Number(y), department_id: dept });
  const departments = useAdmin<Department[]>('/admin/departments');
  const rows = list.data?.data ?? [];

  return (
    <>
      <PageHeader title="Overtime & short days" subtitle="Days where staff worked more or less than their shift" actions={<MonthPicker value={month} onChange={setMonth} />} />
      <Card>
        <div className="space-y-4 p-4">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'overtime', label: 'Overtime' }, { id: 'fines', label: 'Short days' }]} />
          <Select value={dept} onChange={(e) => setDept(e.target.value)} className="w-full sm:w-56" aria-label="Department">
            <option value="">All departments</option>
            {departments.data?.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        {list.error ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> : !list.data ? <TableSkeleton cols={5} /> : rows.length === 0 ? <EmptyState title={tab === 'overtime' ? 'No overtime this month' : 'No short days this month'} /> : (
          <TableWrap>
            <Table>
              <THead><tr><Th>Date</Th><Th>Staff</Th><Th>Department</Th><Th align="right">Worked</Th><Th align="right">Shift</Th><Th align="right">{tab === 'overtime' ? 'Extra' : 'Short by'}</Th></tr></THead>
              <tbody>
                {rows.map((r, i) => (
                  <Tr key={`${r.id}-${r.date}-${i}`}>
                    <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
                    <Td><span className="flex items-center gap-2"><Avatar name={r.full_name} src={r.photo} size={28} />{r.full_name}</span></Td>
                    <Td className="text-muted">{r.department?.name ?? '—'}</Td>
                    <Td align="right" className="tnum">{fmtDuration(r.total_seconds)}</Td>
                    <Td align="right" className="tnum text-muted">{fmtDuration(r.payable_seconds)}</Td>
                    <Td align="right" className={`tnum font-medium ${tab === 'overtime' ? 'text-success' : 'text-danger'}`}>{fmtDuration(r.extra_seconds)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
