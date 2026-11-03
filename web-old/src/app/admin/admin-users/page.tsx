'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader, StatusBadge } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { Field, Input, Select, ToggleRow } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Avatar, EmptyState, ErrorState, TableSkeleton } from '@/components/ui/Misc';
import { Table, TableWrap, Td, Th, THead, Tr } from '@/components/ui/Table';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { fmtDateTime } from '@/lib/format';
import { useAction, useAdmin } from '@/lib/query';

interface AdminUser { id: number; name: string | null; email: string | null; country_code: string | null; phone_number: string; is_active: boolean; role: { id: number; name: string } | null; last_login_at: string | null }
interface Role { id: number; name: string }

function Editor({ initial, roles, onClose }: { initial: AdminUser | null; roles: Role[]; onClose: () => void }) {
  const [f, setF] = useState({ name: initial?.name ?? '', email: initial?.email ?? '', country_code: initial?.country_code ?? '91', phone_number: initial?.phone_number ?? '', role_id: String(initial?.role?.id ?? roles[0]?.id ?? ''), is_active: initial?.is_active ?? true });
  const save = useAction(
    () => { const body = { ...f, role_id: Number(f.role_id), email: f.email || undefined }; return initial ? adminApi.put(`/admin/admin-users/${initial.id}`, body) : adminApi.post('/admin/admin-users', body); },
    { invalidate: ['/admin/admin-users', '/admin/roles'], onSuccess: onClose },
  );
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit admin user' : 'Invite admin user'} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} disabled={!f.name.trim() || f.phone_number.length < 6 || !f.role_id} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required className="sm:col-span-2">{(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />}</Field>
        <Field label="Country code" required>{(id) => <Input id={id} value={f.country_code} onChange={(e) => setF({ ...f, country_code: e.target.value })} />}</Field>
        <Field label="Mobile number" required hint="They sign in with this number.">{(id) => <Input id={id} value={f.phone_number} onChange={(e) => setF({ ...f, phone_number: e.target.value })} inputMode="numeric" />}</Field>
        <Field label="Email" className="sm:col-span-2">{(id) => <Input id={id} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
        <Field label="Role" required className="sm:col-span-2">{(id) => <Select id={id} value={f.role_id} onChange={(e) => setF({ ...f, role_id: e.target.value })}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>}</Field>
        {initial && <div className="sm:col-span-2"><ToggleRow title="Active" description="Inactive users cannot sign in." checked={f.is_active} onChange={(v) => setF({ ...f, is_active: v })} /></div>}
      </div>
    </Modal>
  );
}

export default function AdminUsersPage() {
  const { can } = useAdminSession();
  const list = useAdmin<AdminUser[]>('/admin/admin-users');
  const roles = useAdmin<Role[]>('/admin/roles');
  const [edit, setEdit] = useState<AdminUser | null | undefined>(undefined);
  const [ask, dialog] = useConfirm();
  const remove = useAction((id: number) => adminApi.del(`/admin/admin-users/${id}`), { invalidate: ['/admin/admin-users'] });
  return (
    <>
      <PageHeader title="Admin users" subtitle="People who help you run the business" actions={can('add_admin_user') && <Button icon={<Plus className="size-4" />} disabled={!roles.data?.data.length} onClick={() => setEdit(null)}>Invite admin user</Button>} />
      {roles.data && !roles.data.data.length && <p className="mb-4 rounded-xl bg-warningsoft px-4 py-3 text-sm text-warning">Create a role first so you can give admin users the right access.</p>}
      <Card>
        {list.error ? <ErrorState message={list.error.message} /> : !list.data ? <TableSkeleton cols={5} /> : list.data.data.length === 0 ? <EmptyState title="No admin users yet" /> : (
          <TableWrap>
            <Table>
              <THead><tr><Th>Name</Th><Th>Phone</Th><Th>Role</Th><Th>Status</Th><Th>Last login</Th><Th /></tr></THead>
              <tbody>
                {list.data.data.map((u) => (
                  <Tr key={u.id}>
                    <Td><span className="flex items-center gap-3"><Avatar name={u.name} size={32} /><span><span className="block font-medium">{u.name}</span><span className="block text-xs text-muted">{u.email}</span></span></span></Td>
                    <Td className="tnum text-muted">+{u.country_code} {u.phone_number}</Td>
                    <Td>{u.role?.name ?? '—'}</Td>
                    <Td><StatusBadge status={u.is_active ? 'Active' : 'Deactivated'} /></Td>
                    <Td className="text-muted">{u.last_login_at ? fmtDateTime(u.last_login_at) : 'Never'}</Td>
                    <Td align="right">
                      <span className="inline-flex gap-1">
                        {can('edit_admin_user') && <Button size="sm" variant="ghost" aria-label={`Edit ${u.name}`} onClick={() => setEdit(u)}><Pencil className="size-4" /></Button>}
                        {can('delete_admin_user') && <Button size="sm" variant="ghost" className="text-danger" aria-label={`Delete ${u.name}`} onClick={() => ask({ title: `Remove ${u.name}?`, message: 'They will no longer be able to sign in.', confirmLabel: 'Remove', onConfirm: () => remove.mutateAsync(u.id) })}><Trash2 className="size-4" /></Button>}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
      {edit !== undefined && roles.data && <Editor initial={edit} roles={roles.data.data} onClose={() => setEdit(undefined)} />}
      {dialog}
    </>
  );
}
