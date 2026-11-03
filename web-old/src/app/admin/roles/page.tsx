'use client';

import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge, Card, CardBody, PageHeader } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { Checkbox, Field, Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Misc';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { useAction, useAdmin } from '@/lib/query';

interface Role { id: number; name: string; permissions: string[]; user_count: number }
interface Perms { permissions: string[]; groups: Record<string, string[]> }

const label = (p: string) => p.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

function Editor({ initial, perms, onClose }: { initial: Role | null; perms: Perms; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [sel, setSel] = useState<Set<string>>(new Set(initial?.permissions ?? []));
  const save = useAction(
    () => (initial ? adminApi.put(`/admin/roles/${initial.id}`, { name, permissions: [...sel] }) : adminApi.post('/admin/roles', { name, permissions: [...sel] })),
    { invalidate: ['/admin/roles'], onSuccess: onClose },
  );
  const toggle = (p: string, on: boolean) => setSel((s) => { const n = new Set(s); if (on) n.add(p); else n.delete(p); return n; });
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit role' : 'New role'} size="lg" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!name.trim()} loading={save.isPending} onClick={() => save.mutate()}>Save role</Button></>}>
      <div className="space-y-5">
        <Field label="Role name" required>{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. HR manager" />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(perms.groups).map(([group, list]) => (
            <fieldset key={group} className="rounded-xl border border-line p-4">
              <legend className="px-1 text-sm font-semibold">{group}</legend>
              <div className="space-y-2">
                {list.map((p) => <Checkbox key={p} label={label(p)} checked={sel.has(p)} onChange={(e) => toggle(p, e.target.checked)} className="block" />)}
              </div>
            </fieldset>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default function RolesPage() {
  const { can } = useAdminSession();
  const roles = useAdmin<Role[]>('/admin/roles');
  const perms = useAdmin<Perms>('/admin/roles/permissions');
  const [edit, setEdit] = useState<Role | null | undefined>(undefined);
  const [ask, dialog] = useConfirm();
  const remove = useAction((id: number) => adminApi.del(`/admin/roles/${id}`), { invalidate: ['/admin/roles'] });
  return (
    <>
      <PageHeader title="Roles" subtitle="Decide what each admin user can see and do" actions={can('add_role') && <Button icon={<Plus className="size-4" />} onClick={() => setEdit(null)}>New role</Button>} />
      <p className="mb-4 rounded-xl bg-infosoft px-4 py-3 text-sm text-info">The business owner always has full access. Roles apply to admin users you invite.</p>
      {roles.error ? <Card><ErrorState message={roles.error.message} /></Card> : !roles.data ? <Skeleton className="h-40" /> : roles.data.data.length === 0 ? <Card><EmptyState icon={<ShieldCheck className="size-7" />} title="No roles yet" message="Create a role, then assign it when adding an admin user." /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.data.data.map((r) => (
            <Card key={r.id}>
              <CardBody>
                <div className="mb-3 flex items-start justify-between"><div><p className="font-semibold">{r.name}</p><p className="text-sm text-muted">{r.user_count} admin user(s)</p></div><Badge tone="brand">{r.permissions.length} permissions</Badge></div>
                <p className="line-clamp-3 text-xs text-muted">{r.permissions.map(label).join(' · ') || 'No permissions'}</p>
                <div className="mt-4 flex gap-1.5">
                  {can('edit_role') && <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEdit(r)}>Edit</Button>}
                  {can('delete_role') && <Button size="sm" variant="ghost" className="text-danger" icon={<Trash2 className="size-4" />} onClick={() => ask({ title: `Delete ${r.name}?`, message: 'Roles with assigned users cannot be deleted.', confirmLabel: 'Delete', onConfirm: () => remove.mutateAsync(r.id) })}>Delete</Button>}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      {edit !== undefined && perms.data && <Editor initial={edit} perms={perms.data.data} onClose={() => setEdit(undefined)} />}
      {dialog}
    </>
  );
}
