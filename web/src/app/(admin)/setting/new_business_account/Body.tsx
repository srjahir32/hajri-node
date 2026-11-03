'use client';

import { useState } from 'react';
import { adminApi, business } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { PRIMARY_BTN } from '@/components/settings/SettingsCard';
import { navigate } from '@/lib/navigate';

const Star = () => <i className="fa-solid fa-star-of-life text-danger fa-2xs"></i>;

export default function Body() {
  const categories = useAdmin<{ id: number; name: string }[]>('/auth/reference/categories').data?.data ?? [];
  const [f, setF] = useState<Record<string, string>>({ name: '', bank_account: '', business_address: '', salary_duration: '', shift_hour: '08', category_id: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = (k: string) => (e: { target: { value: string } }) => setF((c) => ({ ...c, [k]: e.target.value }));
  const add = useAction(
    () => adminApi.post<{ current_business_id?: number; businesses?: { id: number }[] }>('/admin/businesses', { name: f.name.trim(), bank_account: f.bank_account, business_address: f.business_address, salary_duration: f.salary_duration || undefined, shift_hour: Number(f.shift_hour) || 8, category_id: f.category_id || undefined }),
    {
      success: 'Business added successfully',
      onSuccess: (res) => {
        const id = res.data?.current_business_id ?? res.data?.businesses?.at(-1)?.id;
        if (id) business.set(id);
        window.setTimeout(() => (navigate('/dashboard-new')), 900);
      },
    },
  );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.name.trim()) er.name = 'Business name is required';
    if (!f.business_address.trim()) er.business_address = 'Business address is required';
    if (!f.salary_duration) er.salary_duration = 'Salary structure is required';
    if (!(Number(f.shift_hour) > 0)) er.shift_hour = 'Work hours are required';
    setErrs(er);
    if (!Object.keys(er).length) add.mutate();
  };
  const Err = ({ k }: { k: string }) => (errs[k] ? <span className="error error_message proxima_nova_semibold">{errs[k]}</span> : null);
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title="Add New Business" crumbs={['Settings', 'Business Info', 'Add New Business']} />
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
            <div className="col-sm-12 shift-setting-main account_add_new_business">
              <form onSubmit={submit}>
                <div className="hajri-salary-pays-main">
                  <div className="account-detail-main-sub-edit">
                    <div className="shift-main-inner-edit">
                      <div className="shift-inner-sub-label-edit">
                        <label className="shift-type-label">Business Name <Star /></label>
                        <input type="text" className="form-control shift-edit-input" placeholder="Enter Business Name" value={f.name} onChange={set('name')} />
                        <Err k="name" />
                      </div>
                      <div className="shift-inner-sub-label-edit">
                        <label className="shift-type-label">Business Category</label>
                        <select className="form-select create-select section_sub_title" value={f.category_id} onChange={set('category_id')}>
                          <option value="">Select category</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="shift-main-inner-edit">
                      <div className="shift-inner-sub-label-edit">
                        <label className="shift-type-label">Business Bank Account</label>
                        <input type="text" className="form-control shift-edit-input" placeholder="Enter bank account" value={f.bank_account} onChange={set('bank_account')} />
                      </div>
                      <div className="shift-inner-sub-label-edit">
                        <label className="shift-type-label">Business Address <Star /></label>
                        <input type="text" className="form-control shift-edit-input" placeholder="Enter business address" value={f.business_address} onChange={set('business_address')} />
                        <Err k="business_address" />
                      </div>
                    </div>
                    <div className="shift-main-inner-edit">
                      <div className="shift-inner-sub-label-edit">
                        <label className="shift-type-label">Select Salary Structure <Star /></label>
                        <select className="form-select create-select section_sub_title add_new_business" value={f.salary_duration} onChange={set('salary_duration')}>
                          <option value="">Select salary structure</option>
                          <option value="hourly">Hourly</option>
                          <option value="daily">Daily</option>
                        </select>
                        <Err k="salary_duration" />
                      </div>
                      <div className="shift-inner-sub-label-edit">
                        <label className="shift-type-label">Work Hours <Star /></label>
                        <input type="number" min="1" max="24" step="0.5" className="form-control shift-edit-input hours_time" placeholder="Enter hours" value={f.shift_hour} onChange={set('shift_hour')} />
                        <Err k="shift_hour" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button type="submit" className={PRIMARY_BTN} disabled={add.isPending}>Add Business</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
