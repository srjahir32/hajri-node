'use client';

import { useState } from 'react';
import * as I from '@/components/icons';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { PRIMARY_BTN } from '@/components/settings/SettingsCard';
import { navigate } from '@/lib/navigate';

interface Role { id: number; name: string; permissions: string[] }
interface Perms { permissions: string[]; groups: Record<string, string[]> }

function Box() {
  return <span className="custom-box"><I.Ib6610f /></span>;
}

/** Role name + permission matrix (shared by add-role and edit-role/[id]). */
export function RoleForm({ role }: { role?: Role }) {
  const perms = useAdmin<Perms>('/admin/roles/permissions').data?.data;
  const [name, setName] = useState(role?.name ?? '');
  const [sel, setSel] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const [err, setErr] = useState('');
  const title = role ? 'Edit Role' : 'Add Role';
  const all = perms ? Object.values(perms.groups).flat() : [];
  const toggle = (keys: string[], on: boolean) => setSel((s) => { const n = new Set(s); keys.forEach((k) => (on ? n.add(k) : n.delete(k))); return n; });
  const save = useAction(
    () => (role ? adminApi.put(`/admin/roles/${role.id}`, { name: name.trim(), permissions: [...sel] }) : adminApi.post('/admin/roles', { name: name.trim(), permissions: [...sel] })),
    { invalidate: ['/admin/roles'], onSuccess: () => window.setTimeout(() => (navigate('/roles')), 800) },
  );
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title={title} crumbs={['Role Management', title]} />
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="mb-10 shift-inner-sub-label-edit">
                <label className="shift-type-label" htmlFor="role_name">Role Name <span className="text-destructive">*</span></label>
                <input type="text" id="role_name" className="form-control shift-edit-input" placeholder="Enter role name" value={name} onChange={(e) => setName(e.target.value)} />
                {err && <span className="error error_message proxima_nova_semibold">{err}</span>}
              </div>
              <div className="select-all-header">
                <div>
                  <h3>Permissions</h3>
                  <p>Assign permissions to this role</p>
                </div>
                <label className="custom-checkbox-wrapper">
                  <span className="text-sm font-semibold text-gray-700">Select All Permissions</span>
                  <input type="checkbox" id="selectAllGlobal" checked={all.length > 0 && all.every((k) => sel.has(k))} onChange={(e) => toggle(all, e.target.checked)} />
                  <Box />
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {perms && Object.entries(perms.groups).map(([category, keys]) => (
                  <div className="permission-card" key={category}>
                    <div className="permission-group-title">
                      <h4>{category}</h4>
                      <label className="custom-checkbox-wrapper">
                        <span className="text-xs font-bold text-gray-400 uppercase">All</span>
                        <input type="checkbox" className="category-select-all" checked={keys.every((k) => sel.has(k))} onChange={(e) => toggle(keys, e.target.checked)} />
                        <Box />
                      </label>
                    </div>
                    <div className="permission-list">
                      {keys.map((k) => (
                        <div className="permission-item" key={k}>
                          <label className="custom-checkbox-wrapper w-full">
                            <input type="checkbox" className="permission-checkbox" checked={sel.has(k)} onChange={(e) => toggle([k], e.target.checked)} />
                            <Box />
                            <span>{k.replaceAll('_', ' ')}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-4">
                <button type="button" id="save_role_btn" className={PRIMARY_BTN} disabled={save.isPending} onClick={() => (name.trim() ? (setErr(''), save.mutate()) : setErr('Role name is required'))}>
                  {role ? 'Update' : 'Save'} Role
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
