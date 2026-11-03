'use client';

import { useMemo, useState } from 'react';
import { superApi } from '@/lib/api';
import { useSuper } from '@/lib/query';
import { esc } from '@/lib/bs';
import { MONTHS } from '@/lib/format';
import { toast } from '@/lib/toast';
import { CustomDropdown } from '@/components/widgets/CustomDropdown';
import { DataTable } from '@/components/widgets/DataTable';

interface P { id: number; user: { name: string | null; phoneNumber: string }; plan: string; amount: number; currency: string; status: string | null; order_id: string | null; created_at: string }
const OK = ['success', 'paid', 'successful'];
const dt = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

export default function Body() {
  const now = new Date();
  const [type, setType] = useState('monthly');
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const all = useSuper<P[]>('/super-admin/payments', { size: 1000 }).data?.data ?? [];
  const inPeriod = useMemo(() => all.filter((p) => { const d = new Date(p.created_at); return String(d.getFullYear()) === year && (type === 'yearly' || String(d.getMonth() + 1) === month); }), [all, type, month, year]);
  const cash = inPeriod.filter((p) => p.currency !== 'USD');
  const kel = inPeriod.filter((p) => p.currency === 'USD');
  const total = (xs: P[]) => xs.filter((p) => OK.includes((p.status ?? '').toLowerCase())).reduce((s, p) => s + p.amount, 0);
  const years = Array.from({ length: 6 }, (_, i) => String(now.getFullYear() - i));
  const exportAll = async () => {
    try { await superApi.download('/super-admin/payments/export', undefined, 'payments.xlsx'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Download failed'); }
  };
  const head = <tr><th>#</th><th>User</th><th>Plan</th><th>Amount</th><th>Status</th><th>Order ID</th><th>Date &amp; Time</th></tr>;
  const table = (id: string, rows: P[], sym: string) => (
    <DataTable
      id={id}
      className="tab-table display"
      deps={[rows]}
      head={head}
      options={() => ({
        data: rows, searching: false, lengthChange: false, info: false, responsive: true, order: [],
        columns: [
          { data: 'id' },
          { data: 'user', render: (u: P['user']) => `<strong>${esc(u.name ?? '-')}</strong><p class="owner-sub">${esc(u.phoneNumber)}</p>` },
          { data: 'plan', render: (d: string) => esc(d) },
          { data: 'amount', render: (d: number) => `${sym}${d.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
          { data: 'status', render: (d: string | null) => `<span class="pill ${OK.includes((d ?? '').toLowerCase()) ? 'pill-green' : (d ?? '').toLowerCase() === 'pending' ? 'pill-yellow' : 'pill-red'}">${esc(d ?? '-')}</span>` },
          { data: 'order_id', render: (d: string | null) => esc(d ?? '-') },
          { data: 'created_at', render: (d: string) => dt(d) },
        ],
      })}
    />
  );
  return (
    <main className="flex-1 pb-4 pt-4 overflow-y-auto">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <div className="sa-section-card">
            <div className="sa-section-head" style={{ gap: 12, flexWrap: 'wrap' }}>
              <h4>Revenue Reports</h4>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <CustomDropdown options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} value={type} onChange={setType} />
                {type === 'monthly' && <CustomDropdown className="reports-filter-dropdown" options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} value={month} onChange={setMonth} />}
                <CustomDropdown className="reports-filter-dropdown" options={years.map((y) => ({ value: y, label: y }))} value={year} onChange={setYear} />
                <button className="staff-manage-summary-btn" onClick={() => void exportAll()}>Export</button>
              </div>
            </div>
            <div className="row g-3 p-3">
              <div className="col-md-6"><div className="sa-revenue-card bg-rev-blue"><h6>Cashfree Revenue</h6><div className="amount">₹{total(cash).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div><div className="sub">{cash.length} transactions</div></div></div>
              <div className="col-md-6"><div className="sa-revenue-card bg-rev-pink"><h6>Kelviq Revenue</h6><div className="amount">${total(kel).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div><div className="sub">{kel.length} transactions</div></div></div>
            </div>
          </div>
          <div className="sa-section-card">
            <div className="sa-section-head"><h5>Cashfree Payments</h5></div>
            <div className="approve_staff_data">{table('cashfree_data', cash, '₹')}</div>
          </div>
          <div className="sa-section-card">
            <div className="sa-section-head"><h5>Kelviq Payments</h5></div>
            <div className="approve_staff_data">{table('kelviq_data', kel, '$')}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
