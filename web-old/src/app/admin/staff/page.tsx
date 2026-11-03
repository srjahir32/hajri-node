'use client';

import { Download, FileUp, MoreVertical, Plus, UserCheck, UserX } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Dropdown } from '@/components/layout/Menus';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, PageHeader, StatusBadge } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { Select } from '@/components/ui/Field';
import { Avatar, EmptyState, ErrorState, Pagination, SearchInput, TableSkeleton, Tabs } from '@/components/ui/Misc';
import { Table, TableWrap, Td, Th, THead, Tr } from '@/components/ui/Table';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { fmtMoney } from '@/lib/format';
import { errMsg, useAction, useAdmin } from '@/lib/query';
import type { Department, Pagination as Pg } from '@/lib/types';
import { useDebounced } from '@/lib/hooks';

interface Row {
  id: number;
  full_name: string;
  phone_number: string;
  country_code: string | null;
  department: { id: number; name: string } | null;
  designation: string | null;
  shift: string | null;
  salary_amount: number | null;
  photo: string | null;
  is_deactivate: number;
  is_leave: number;
  status: string;
}

export default function StaffListPage() {
  const { can } = useAdminSession();
  const [tab, setTab] = useState<'active' | 'deactivated'>('active');
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const [ask, dialog] = useConfirm();

  const list = useAdmin<Row[]>('/admin/staff', { status: tab, search: q, department_id: dept, page, per_page: 20 }, { keepPrevious: true });
  const departments = useAdmin<Department[]>('/admin/departments');
  const meta = list.data as unknown as (Pg & { active_count: number; deactivated_count: number }) | undefined;

  const toggle = useAction((v: { id: number; deactivate: boolean }) => adminApi.post(`/admin/staff/${v.id}/${v.deactivate ? 'deactivate' : 'activate'}`), { invalidate: ['/admin/staff'] });
  const remove = useAction((id: number) => adminApi.del(`/admin/staff/${id}`), { invalidate: ['/admin/staff'] });

  async function exportXlsx() {
    try {
      await adminApi.download('/admin/staff/export', undefined, 'staff.xlsx');
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Everyone who works at your business"
        actions={
          <>
            <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => void exportXlsx()}>Export</Button>
            {can('add_staff') && (
              <>
                <LinkButton href="/admin/staff/import" variant="secondary" icon={<FileUp className="size-4" />}>Import</LinkButton>
                <LinkButton href="/admin/staff/new" icon={<Plus className="size-4" />}>Add staff</LinkButton>
              </>
            )}
          </>
        }
      />
      <Card>
        <div className="space-y-4 p-4">
          <Tabs
            value={tab}
            onChange={(t) => { setTab(t); setPage(1); }}
            tabs={[
              { id: 'active', label: 'Active', count: meta?.active_count },
              { id: 'deactivated', label: 'Deactivated', count: meta?.deactivated_count },
            ]}
          />
          <div className="flex flex-wrap gap-3">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search name, phone or department" className="w-full sm:w-80" />
            <Select value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }} className="w-full sm:w-56" aria-label="Department">
              <option value="">All departments</option>
              {departments.data?.data.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>
        </div>

        {list.error ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> : !list.data ? <TableSkeleton cols={6} /> : list.data.data.length === 0 ? (
          <EmptyState
            title={tab === 'active' ? 'No staff found' : 'No deactivated staff'}
            message={search || dept ? 'Try changing your filters.' : 'Add your first team member to start tracking attendance.'}
            action={can('add_staff') && !search && tab === 'active' ? <LinkButton href="/admin/staff/new" icon={<Plus className="size-4" />}>Add staff</LinkButton> : undefined}
          />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead><tr><Th>Name</Th><Th>Phone</Th><Th>Department</Th><Th>Shift</Th><Th align="right">Salary</Th><Th>Today</Th><Th /></tr></THead>
                <tbody>
                  {list.data.data.map((s) => (
                    <Tr key={s.id}>
                      <Td>
                        <Link href={`/admin/staff/${s.id}`} className="flex items-center gap-3 hover:text-brand">
                          <Avatar name={s.full_name} src={s.photo} />
                          <span>
                            <span className="block font-medium">{s.full_name}</span>
                            {s.designation && <span className="block text-xs text-muted">{s.designation}</span>}
                          </span>
                        </Link>
                      </Td>
                      <Td className="tnum text-muted">+{s.country_code} {s.phone_number}</Td>
                      <Td>{s.department?.name ?? <span className="text-muted">—</span>}</Td>
                      <Td className="text-muted">{s.shift ?? '—'}</Td>
                      <Td align="right" className="tnum">{s.salary_amount ? fmtMoney(s.salary_amount) : '—'}</Td>
                      <Td>{s.is_deactivate ? <StatusBadge status="Deactivated" /> : s.is_leave ? <StatusBadge status="Leave" /> : <StatusBadge status={s.status} />}</Td>
                      <Td align="right">
                        <Dropdown width="w-48" trigger={() => <span className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface2" aria-label={`Actions for ${s.full_name}`}><MoreVertical className="size-4" /></span>}>
                          {(close) => (
                            <div className="p-1.5 text-sm">
                              <Link href={`/admin/staff/${s.id}`} onClick={close} className="block rounded-lg px-3 py-2 hover:bg-surface2">View profile</Link>
                              {can('add_staff') && <Link href={`/admin/staff/${s.id}/edit`} onClick={close} className="block rounded-lg px-3 py-2 hover:bg-surface2">Edit</Link>}
                              <button
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-surface2"
                                onClick={() => {
                                  close();
                                  ask({
                                    title: s.is_deactivate ? 'Activate staff?' : 'Deactivate staff?',
                                    message: s.is_deactivate ? `${s.full_name} will be able to log in and punch again.` : `${s.full_name} will no longer be able to log in. Their records are kept.`,
                                    confirmLabel: s.is_deactivate ? 'Activate' : 'Deactivate',
                                    tone: s.is_deactivate ? 'primary' : 'danger',
                                    onConfirm: () => toggle.mutateAsync({ id: s.id, deactivate: !s.is_deactivate }),
                                  });
                                }}
                              >
                                {s.is_deactivate ? <><UserCheck className="size-4" /> Activate</> : <><UserX className="size-4" /> Deactivate</>}
                              </button>
                              <button
                                className="block w-full rounded-lg px-3 py-2 text-left text-danger hover:bg-dangersoft"
                                onClick={() => {
                                  close();
                                  ask({ title: 'Delete staff?', message: `${s.full_name} and their access will be removed. This cannot be undone.`, confirmLabel: 'Delete', onConfirm: () => remove.mutateAsync(s.id) });
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </Dropdown>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
            <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} total={meta?.total} onChange={setPage} />
          </>
        )}
      </Card>
      {dialog}
    </>
  );
}
