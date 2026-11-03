'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { clearErrors, itiOf } from '@/lib/formkit';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { PRIMARY_BTN } from '@/components/settings/SettingsCard';
import { IntlPhoneInput } from '@/components/ui/IntlPhoneInput';
import { SelectClub } from '@/components/ui/SelectClub';
import { navigate } from '@/lib/navigate';

interface User { id: number; name: string | null; email: string | null; phone_number: string; country_code: string | null; role: { id: number } | null }
const Star = () => <i className="fa-solid fa-star-of-life text-danger fa-2xs"></i>;

/** Create / edit sub-admin (shared by add_admin_user and edit_admin_user/[id]). */
export function AdminUserForm({ user }: { user?: User }) {
  const roles = useAdmin<{ id: number; name: string }[]>('/admin/roles').data?.data ?? [];
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState(user?.role ? String(user.role.id) : '');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const title = user ? 'Edit Admin User' : 'Add Admin User';
  const save = useAction(
    () => {
      const iti = itiOf('phone_number');
      const body = { name: name.trim(), email: email.trim() || undefined, country_code: String(iti?.getSelectedCountryData()?.dialCode ?? user?.country_code ?? '91'), phone_number: (document.getElementById('phone_number') as HTMLInputElement).value.replace(/\D/g, ''), role_id: Number(role) };
      return user ? adminApi.put(`/admin/admin-users/${user.id}`, body) : adminApi.post('/admin/admin-users', body);
    },
    { invalidate: ['/admin/admin-users'], onSuccess: () => window.setTimeout(() => (navigate('/admin_users')), 800) },
  );
  const submit = () => {
    clearErrors();
    const e: Record<string, string> = {};
    const phone = (document.getElementById('phone_number') as HTMLInputElement)?.value ?? '';
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email';
    if (!phone) e.phone = 'Phone number is required';
    else if (itiOf('phone_number') && !itiOf('phone_number').isValidNumber()) e.phone = 'Enter a valid phone number';
    if (!role) e.role = 'Role is required';
    setErrs(e);
    if (!Object.keys(e).length) save.mutate();
  };
  const Err = ({ k }: { k: string }) => (errs[k] ? <span className="error error_message proxima_nova_semibold">{errs[k]}</span> : null);
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title={title} crumbs={['Admin User Management', title]} />
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="shift-main-inner-edit">
                <div className="shift-inner-sub-label-edit">
                  <label className="shift-type-label">Name <Star /></label>
                  <input type="text" className="form-control shift-edit-input" placeholder="Enter Name" value={name} onChange={(e) => setName(e.target.value)} />
                  <Err k="name" />
                </div>
                <div className="shift-inner-sub-label-edit">
                  <label className="shift-type-label">Email <Star /></label>
                  <input type="email" className="form-control shift-edit-input" placeholder="Enter Your Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Err k="email" />
                </div>
              </div>
              <div className="shift-main-inner-edit">
                <div className="shift-inner-sub-label-edit">
                  <div className="form-group" id="error">
                    <label className="form-label shift-type-label">Phone Number <Star /></label>
                    <IntlPhoneInput id="phone_number" className="form-control phone_input" placeholder="Phone Number" defaultValue={user?.phone_number} defaultDial={user?.country_code ?? undefined} />
                    <Err k="phone" />
                  </div>
                </div>
                <div className="shift-inner-sub-label-edit">
                  <label className="shift-type-label">Role <Star /></label>
                  <div className="filters staff_attendance" id="role_id_error">
                    <SelectClub className="form-select create-select section_sub_title select-club-services" id="role_id" name="role_id" value={role} onChange={(_e, v) => setRole(v)}>
                      <option value="">Select Role</option>
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </SelectClub>
                    <Err k="role" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button type="button" id="save_and_update_admin_user_btn" className={PRIMARY_BTN} disabled={save.isPending} onClick={submit}>{user ? 'Update' : 'Save'} Admin User</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
