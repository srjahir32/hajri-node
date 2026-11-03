'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { PRIMARY_BTN } from '@/components/settings/SettingsCard';
import { F_INPUT, F_LABEL, F_SELECT, F_TEXTAREA } from '@/components/settings/formClasses';
import { navigate } from '@/lib/navigate';

interface Biz { name: string; business_address: string | null; bank_account: string | null; street: string | null; city: string | null; state: string | null; country_id: number | null; category_id: number | null; salary_duration: string | null }
const empty = { name: '', business_address: '', bank_account: '', street: '', city: '', state: '', country_id: '', category_id: '', salary_duration: 'hourly' };

export default function Body() {
  const biz = useAdmin<Biz>('/admin/business');
  const countries = useAdmin<{ id: number; name: string }[]>('/auth/reference/countries').data?.data ?? [];
  const categories = useAdmin<{ id: number; name: string }[]>('/auth/reference/categories').data?.data ?? [];
  const [f, setF] = useState<Record<string, string>>(empty);
  const [errs, setErrs] = useState<Record<string, string>>({});
  useEffect(() => {
    const b = biz.data?.data;
    if (b) setF({ name: b.name ?? '', business_address: b.business_address ?? '', bank_account: b.bank_account ?? '', street: b.street ?? '', city: b.city ?? '', state: b.state ?? '', country_id: String(b.country_id ?? ''), category_id: String(b.category_id ?? ''), salary_duration: b.salary_duration ?? 'hourly' });
  }, [biz.data]);
  const set = (k: string) => (e: { target: { value: string } }) => setF((c) => ({ ...c, [k]: e.target.value }));
  const save = useAction(
    () => adminApi.put('/admin/business', { name: f.name.trim(), business_address: f.business_address, bank_account: f.bank_account, street: f.street, city: f.city, state: f.state, country_id: f.country_id || undefined, category_id: f.category_id || undefined, salary_duration: f.salary_duration }),
    { invalidate: ['/admin/business', '/admin/settings', '/auth/admin/me'], onSuccess: () => window.setTimeout(() => (navigate('/setting-new')), 900) },
  );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.name.trim()) er.name = 'Business name is required';
    if (!f.business_address.trim()) er.business_address = 'Business address is required';
    if (!f.category_id) er.category_id = 'Business category is required';
    setErrs(er);
    if (!Object.keys(er).length) save.mutate();
  };
  const Err = ({ k }: { k: string }) => (errs[k] ? <span className="error error_message proxima_nova_semibold">{errs[k]}</span> : null);
  const req = <span className="text-destructive">*</span>;
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title="Business Details" crumbs={['Settings', 'Business Info', 'Business details']} />
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
            <form id="edit_business_form" className="space-y-8" onSubmit={submit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className={F_LABEL} htmlFor="businessName">Business Name {req}</label>
                  <input className={F_INPUT} id="businessName" placeholder="Enter business name" value={f.name} onChange={set('name')} />
                  <Err k="name" />
                </div>
                <div className="space-y-2 md:row-span-2">
                  <label className={F_LABEL} htmlFor="businessAddress">Business Address {req}</label>
                  <textarea className={F_TEXTAREA} id="businessAddress" placeholder="Enter business address" value={f.business_address} onChange={set('business_address')} />
                  <Err k="business_address" />
                </div>
                <div className="space-y-2">
                  <label className={F_LABEL} htmlFor="bankAccount">Business Bank Account</label>
                  <input className={F_INPUT} id="bankAccount" placeholder="Enter bank account" value={f.bank_account} onChange={set('bank_account')} />
                </div>
                <div className="space-y-2">
                  <label className={F_LABEL} htmlFor="street">Street</label>
                  <input className={F_INPUT} id="street" placeholder="Enter street" value={f.street} onChange={set('street')} />
                </div>
                <div className="space-y-2">
                  <label className={F_LABEL} htmlFor="city">City</label>
                  <input className={F_INPUT} id="city" placeholder="Enter city" value={f.city} onChange={set('city')} />
                </div>
                <div className="space-y-2">
                  <label className={F_LABEL} htmlFor="state">State</label>
                  <input className={F_INPUT} id="state" placeholder="Enter state" value={f.state} onChange={set('state')} />
                </div>
                <div className="space-y-2">
                  <label className={F_LABEL} htmlFor="country_id">Country</label>
                  <select className={F_SELECT} id="country_id" value={f.country_id} onChange={set('country_id')}>
                    <option value="">Select Country</option>
                    {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2 relative">
                  <label className={F_LABEL} htmlFor="category">Business Category {req}</label>
                  <select className={F_SELECT} id="category" value={f.category_id} onChange={set('category_id')}>
                    <option value="">Select Category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Err k="category_id" />
                </div>
                <div className="space-y-2 relative">
                  <label className={F_LABEL} htmlFor="salaryDuration">Salary Duration</label>
                  <select className={F_SELECT} id="salaryDuration" value={f.salary_duration} onChange={set('salary_duration')}>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className={PRIMARY_BTN} disabled={save.isPending}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
