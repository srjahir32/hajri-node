'use client';

import { Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { AssignStaffModal } from '@/components/settings/AssignStaffModal';
import { BackToSettings } from '@/components/settings/BackLink';
import { Button } from '@/components/ui/Button';
import { Badge, Card, PageHeader } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { Field, Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Misc';
import { Table, TableWrap, Td, Th, THead, Tr } from '@/components/ui/Table';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import type { Department } from '@/lib/types';

export default function DepartmentsPage() {
  const list = useAdmin<Department[]>('/admin/departments');
  const [edit, setEdit] = useState<{ id?: number; name: string } | null>(null);
  const [assign, setAssign] = useState<Department | null>(null);
  const [ask, dialog] = useConfirm();
  const save = useAction(() => (edit?.id ? adminApi.put(`/admin/departments/${edit.id}`, { name: edit.name }) : adminApi.post('/admin/departments', { name: edit!.name })), { invalidate: ['/admin/departments', '/admin/staff'], onSuccess: () => setEdit(null) });
  const remove = useAction((id: number) => adminApi.del(`/admin/departments/${id}`), { invalidate: ['/admin/departments', '/admin/staff'] });

  return (
    <>
      <PageHeader back={<BackToSettings />} title="Departments" actions={<Button icon={<Plus className="size-4" />} onClick={() => setEdit({ name: '' })}>Add department</Button>} />
      <Card>
        {list.error ? <ErrorState message={list.error.message} /> : !list.data ? <TableSkeleton cols={3} /> : list.data.data.length === 0 ? (
          <EmptyState title="No departments yet" message="Group your staff by department, e.g. Sales or Operations." action={<Button onClick={() => setEdit({ name: '' })}>Add department</Button>} />
        ) : (
          <TableWrap>
            <Table>
              <THead><tr><Th>Name</Th><Th align="right">Staff</Th><Th /></tr></THead>
              <tbody>
                {list.data.data.map((d) => (
                  <Tr key={d.id}>
                    <Td className="font-medium">{d.name} {d.is_shared && <Badge tone="neutral" className="ml-2">Shared</Badge>}</Td>
                    <Td align="right" className="tnum">{d.staff_count}</Td>
                    <Td align="right">
                      <span className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" icon={<UserPlus className="size-4" />} onClick={() => setAssign(d)}>Assign staff</Button>
                        {!d.is_shared && (
                          <>
                            <Button size="sm" variant="ghost" aria-label={`Rename ${d.name}`} onClick={() => setEdit({ id: d.id, name: d.name })}><Pencil className="size-4" /></Button>
                            <Button size="sm" variant="ghost" aria-label={`Delete ${d.name}`} className="text-danger" onClick={() => ask({ title: `Delete ${d.name}?`, message: 'Staff in this department become unassigned.', confirmLabel: 'Delete', onConfirm: () => remove.mutateAsync(d.id) })}><Trash2 className="size-4" /></Button>
                          </>
                        )}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Rename department' : 'New department'} size="sm" footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button loading={save.isPending} disabled={!edit?.name.trim()} onClick={() => save.mutate()}>Save</Button></>}>
        <form onSubmit={(e) => { e.preventDefault(); if (edit?.name.trim()) save.mutate(); }}>
          <Field label="Department name" required>{(id) => <Input id={id} autoFocus value={edit?.name ?? ''} onChange={(e) => setEdit((p) => p && { ...p, name: e.target.value })} />}</Field>
        </form>
      </Modal>
      {assign && <AssignStaffModal open onClose={() => setAssign(null)} title={`Assign staff to ${assign.name}`} listPath={`/admin/departments/${assign.id}/staff`} savePath={`/admin/departments/${assign.id}/assign`} invalidate={['/admin/departments', '/admin/staff']} />}
      {dialog}
    </>
  );
}
