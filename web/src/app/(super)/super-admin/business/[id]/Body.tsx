'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { superApi } from '@/lib/api';
import { useAction, useSuper } from '@/lib/query';
import { fmtDate } from '@/lib/format';
import { confirmSwal } from '@/lib/swal';
import { BackCrumb } from '@/components/shell/BackCrumb';

interface Sub { id: number; plan_label: string; billing_cycle: string; seats: number; price_per_seat: number; total_amount: number; currency: string; status: string; payment_method: string; starts_at: string | null; expires_at: string | null; is_active: boolean }
interface D {
  id: number; name: string; address: string | null; city: string | null; state: string | null; country: string | null; category: string | null; timezone: string | null; is_active: boolean; created_at: string;
  staff: { active: number; deactivated: number; departments: number; shifts: number };
  owner: { id: number; name: string | null; email: string | null; phone: string; trial_ends_at: string | null; is_active: boolean } | null;
  subscriptions: Sub[];
}
interface Staff { id: number; name: string; phone: string; department: string | null; is_deactivated: boolean; business: { id: number } | null }
const COLORS = ['#2F8CFF', '#00B8D9', '#36B37E', '#FF5630', '#FFAB00', '#6554C0'];
const BTN = 'px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all flex items-center gap-2 shadow-sm hover:opacity-90';
const TABS = [['details', 'Details'], ['plan', 'Plan'], ['transactions', 'Transactions'], ['employees', 'Employee'], ['admin-users', 'Admin Users']] as const;

export default function Body() {
  const id = Number(useParams<{ id: string }>().id);
  const q = useSuper<D>(`/super-admin/businesses/${id}`);
  const staff = useSuper<Staff[]>('/super-admin/staff', { size: 1000 }).data?.data.filter((s) => s.business?.id === id) ?? [];
  const pays = useSuper<{ id: number; user: { name: string | null }; amount: number; currency: string; status: string | null; order_id: string | null; created_at: string; plan: string }[]>('/super-admin/payments', { size: 500 }).data?.data ?? [];
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('details');
  const d = q.data?.data;
  const refresh = ['/super-admin/businesses'];
  const extend = useAction((days: number) => superApi.post(`/super-admin/businesses/${id}/extend-trial`, { days }), { invalidate: refresh });
  const toggle = useAction(() => superApi.post(`/super-admin/businesses/${id}/toggle-status`), { invalidate: refresh });
  const grant = useAction((v: { plan: 'monthly' | 'yearly'; seats: number }) => superApi.post(`/super-admin/businesses/${id}/grant-subscription`, v), { invalidate: refresh });
  if (!d) return null;
  const activeSub = d.subscriptions.find((s) => s.status === 'active');
  const row = (label: string, value: React.ReactNode) => (
    <tr className="hover:bg-gray-50 transition-colors"><th className="py-4 px-6 font-medium text-gray-500 bg-gray-50/30">{label}</th><td className="py-4 px-6 text-gray-900 font-medium">{value || '-'}</td></tr>
  );
  const askDays = async () => {
    const Swal = (await import('sweetalert2')).default;
    const r = await Swal.fire({ title: 'Extend trial', input: 'number', inputLabel: 'Number of days', inputValue: 7, showCancelButton: true, confirmButtonColor: '#2F8CFF' });
    if (r.isConfirmed && Number(r.value) > 0) extend.mutate(Number(r.value));
  };
  const askGrant = async () => {
    const Swal = (await import('sweetalert2')).default;
    const r = await Swal.fire({ title: 'Grant subscription', html: '<select id="g_plan" class="swal2-select"><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select><input id="g_seats" type="number" min="1" value="10" class="swal2-input" placeholder="Seats">', showCancelButton: true, confirmButtonColor: '#2F8CFF', preConfirm: () => ({ plan: (document.getElementById('g_plan') as HTMLSelectElement).value as 'monthly' | 'yearly', seats: Number((document.getElementById('g_seats') as HTMLInputElement).value) }) });
    if (r.isConfirmed) grant.mutate(r.value);
  };
  return (
    <main className="flex-1 pb-4 pt-4 overflow-y-auto">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-6"><BackCrumb title="Business Details" crumbs={['Super Admin', 'Businesses', 'Business Details']} /></div>
        <div className="business-header-card">
          <div className="header-avatar" style={{ backgroundColor: COLORS[d.id % COLORS.length] }}>{d.name.charAt(0).toUpperCase()}</div>
          <div className="header-title-sec">
            <h2>{d.name}{!d.is_active && <span className="text-xs font-semibold px-2 py-1 rounded-md text-white bg-red-500 ml-2 align-middle">Deactivated</span>}</h2>
            <div className="header-meta">
              <div className="meta-item"><i className="fas fa-user"></i><span>Owner: <strong>{d.owner?.name ?? '-'}</strong></span></div>
              <div className="meta-item"><i className="fas fa-users"></i><span>{d.staff.active + d.staff.deactivated} Employees</span></div>
              <div className="meta-item"><i className="fas fa-calendar-alt"></i><span>Registered: {fmtDate(d.created_at)}</span></div>
            </div>
          </div>
          <div className="ms-auto flex items-center gap-3">
            {!activeSub && <button type="button" className={BTN} style={{ background: '#2F8CFF' }} onClick={() => void askDays()}><i className="far fa-calendar-plus"></i> Extend Trial</button>}
            <button type="button" className={BTN} style={{ background: '#36B37E' }} onClick={() => void askGrant()}><i className="fas fa-gift"></i> Grant Plan</button>
            <button type="button" className={BTN} style={{ background: d.is_active ? '#FF5630' : '#36B37E' }} onClick={async () => (await confirmSwal({ title: d.is_active ? 'Deactivate business?' : 'Activate business?', confirmText: 'Yes' })) && toggle.mutate()}>
              {d.is_active ? <><i className="fas fa-ban"></i> Deactivate</> : <><i className="fas fa-check-circle"></i> Activate</>}
            </button>
          </div>
        </div>
        <div className="custom-tabs-container">
          <div className="tabs-header">
            {TABS.map(([k, label]) => <button key={k} className={`tab-btn${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{label}</button>)}
          </div>
          <div className="tabs-content">
            {tab === 'details' && (
              <div className="tab-pane active">
                <h4 className="mb-4 text-gray-800 font-semibold">Business Profile</h4>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
                  <table className="w-full text-sm text-left"><tbody className="divide-y divide-gray-200">
                    {row('Address', d.address)}{row('City', d.city)}{row('State', d.state)}{row('Country', d.country)}{row('Category', d.category)}{row('Time Zone', d.timezone)}
                    {row('Departments', d.staff.departments)}{row('Shifts', d.staff.shifts)}
                  </tbody></table>
                </div>
                <h4 className="mb-4 text-gray-800 font-semibold">Owner</h4>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm text-left"><tbody className="divide-y divide-gray-200">
                    {row('Name', d.owner?.name)}{row('Email', d.owner?.email)}{row('Phone', d.owner?.phone)}{row('Trial Ends', d.owner?.trial_ends_at ? fmtDate(d.owner.trial_ends_at) : null)}
                  </tbody></table>
                </div>
              </div>
            )}
            {tab === 'plan' && (
              <div className="tab-pane active">
                {d.subscriptions.length ? d.subscriptions.map((s) => (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4" key={s.id}>
                    <table className="w-full text-sm text-left"><tbody className="divide-y divide-gray-200">
                      {row('Plan', s.plan_label)}{row('Status', s.status)}{row('Billing Cycle', s.billing_cycle)}{row('Seats', s.seats)}{row('Amount', `${s.currency === 'USD' ? '$' : '₹'}${s.total_amount}`)}{row('Payment Method', s.payment_method)}{row('Starts', s.starts_at ? fmtDate(s.starts_at) : null)}{row('Expires', s.expires_at ? fmtDate(s.expires_at) : null)}
                    </tbody></table>
                  </div>
                )) : <p className="text-gray-500">No subscription yet.</p>}
              </div>
            )}
            {tab === 'transactions' && (
              <div className="tab-pane active">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead><tr><th className="py-3 px-4">Date</th><th className="py-3 px-4">Plan</th><th className="py-3 px-4">Order ID</th><th className="py-3 px-4">Amount</th><th className="py-3 px-4">Status</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">
                      {pays.filter((p) => p.user.name === d.owner?.name).map((p) => <tr key={p.id}><td className="py-3 px-4">{fmtDate(p.created_at)}</td><td className="py-3 px-4">{p.plan}</td><td className="py-3 px-4">{p.order_id ?? '-'}</td><td className="py-3 px-4">{p.currency === 'USD' ? '$' : '₹'}{p.amount}</td><td className="py-3 px-4">{p.status}</td></tr>)}
                      {!pays.some((p) => p.user.name === d.owner?.name) && <tr><td colSpan={5} className="py-4 px-4 text-gray-500">No transactions yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {tab === 'employees' && (
              <div className="tab-pane active">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead><tr><th className="py-3 px-4">Name</th><th className="py-3 px-4">Phone</th><th className="py-3 px-4">Department</th><th className="py-3 px-4">Status</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">
                      {staff.map((s) => <tr key={s.id}><td className="py-3 px-4"><a href={`/super-admin/staff-profile/${s.id}`}>{s.name}</a></td><td className="py-3 px-4">{s.phone}</td><td className="py-3 px-4">{s.department ?? '-'}</td><td className="py-3 px-4">{s.is_deactivated ? 'Deactive' : 'Active'}</td></tr>)}
                      {!staff.length && <tr><td colSpan={4} className="py-4 px-4 text-gray-500">No employees yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {tab === 'admin-users' && <div className="tab-pane active"><p className="text-gray-500">Admin users of this business are managed by the business owner.</p></div>}
          </div>
        </div>
      </div>
    </main>
  );
}
