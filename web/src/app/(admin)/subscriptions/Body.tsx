'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { useAction, useAdmin } from '@/lib/query';
import { fmtDate } from '@/lib/format';
import { number_format, ucfirst } from '@/lib/blade';
import { confirmSwal } from '@/lib/swal';
import { navigate } from '@/lib/navigate';

interface Sub { id: number; plan: string; plan_label: string; billing_cycle: string; seats: number; price_per_seat: number; total_amount: number; status: string; payment_method: string; starts_at: string | null; expires_at: string | null }
interface Tx { id: number; event_type: string; order_id: string | null; payment_id: string | null; amount: number | null; currency: string | null; status: string | null; created_at: string }
interface Plan { key: 'monthly' | 'yearly'; label: string; price_per_seat: number; currency: string; min_seats: number; max_seats: number }
interface Overview { subscription: Sub | null; active_staff_count: number; plans: Plan[]; kelviq: { enabled: boolean; prices: Record<string, number> }; cashfree: { enabled: boolean }; transactions: Tx[] }

const META = {
  monthly: { color: '#6366f1', desc: 'Flexible month-to-month billing. Cancel anytime.', period: 'per staff / month', savings: null as string | null, popular: false },
  yearly: { color: '#10b981', desc: 'Pay once a year and save compared to monthly billing.', period: 'per staff / year', savings: 'Save 17%', popular: true },
};

export default function Body() {
  const { session } = useAdminSession();
  const params = useSearchParams();
  const q = useAdmin<Overview>('/admin/subscriptions');
  const ov = q.data?.data;
  const india = (session.user as { country_code?: string }).country_code === '91' || !(session.user as { country_code?: string }).country_code;
  const [planKey, setPlanKey] = useState<'monthly' | 'yearly'>('monthly');
  const [seats, setSeats] = useState(1);
  const [more, setMore] = useState(1);
  const [openMore, setOpenMore] = useState(false);
  const sub = ov?.subscription && ['active', 'pending'].includes(ov.subscription.status) ? ov.subscription : null;
  const staff = ov?.active_staff_count ?? 0;

  const checkout = useAction((method: 'cashfree' | 'kelviq') => adminApi.post<{ redirect_url: string }>('/admin/subscriptions/checkout', { plan: planKey, seats, payment_method: method }), {
    success: false,
    onSuccess: (r) => (navigate(r.data.redirect_url)),
  });
  const addSeats = useAction(() => adminApi.post('/admin/subscriptions/seats', { seats: (sub?.seats ?? 0) + more }), { invalidate: ['/admin/subscriptions'], success: 'Subscription seats updated successfully.', onSuccess: () => setOpenMore(false) });
  const cancel = useAction(() => adminApi.post('/admin/subscriptions/cancel'), { invalidate: ['/admin/subscriptions'], success: 'Subscription cancelled successfully.' });

  const alerts = (['success', 'error', 'info', 'warning'] as const).map((k) => [k, params.get(k)] as const).filter(([, v]) => v);
  const plan = ov?.plans.find((p) => p.key === planKey);
  const price = plan?.price_per_seat ?? 0;
  const needDeactivate = Math.max(0, staff - seats);
  const method: 'cashfree' | 'kelviq' = india ? 'cashfree' : 'kelviq';
  const usage = sub ? Math.min(100, Math.round((staff / Math.max(1, sub.seats)) * 100)) : 0;
  const avail = sub ? Math.max(0, sub.seats - staff) : 0;
  const money = (n: number) => `₹${number_format(n, 2)}`;

  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          {alerts.map(([k, v]) => (
            <div key={k} className={`alert alert-${k === 'error' ? 'danger' : k} shadow-sm`}>{v}</div>
          ))}
          {sub ? (
            <div className="card p-4 shadow-sm border-0 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 m-0">Subscription Details</h2>
                  <p className="text-sm text-gray-500 m-0 mt-1">Manage your company staff seats and subscription details</p>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge bg-${sub.status === 'active' ? 'success' : 'warning'} px-3 py-2 fs-6`}>{ucfirst(sub.status)}</span>
                  {!session.user.is_sub_admin && sub.status === 'active' && (
                    <button className="btn btn-outline-danger btn-sm" onClick={async () => (await confirmSwal({ title: 'Cancel subscription?', text: 'Your plan stays active until it expires.', confirmText: 'Yes, cancel' })) && cancel.mutate()}>Cancel</button>
                  )}
                </div>
              </div>
              <div className="p-4 bg-light rounded-3 mb-4 border">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="fw-bold mb-0 text-gray-800"><i className="fa fa-users text-primary me-2"></i>Staff Seats</h5>
                  <span className="fw-bold fs-6 text-gray-700">{staff} / {sub.seats} seats used</span>
                </div>
                <div className="progress mb-2">
                  <div className={`progress-bar progress-bar-striped ${usage >= 100 ? 'bg-danger' : usage >= 80 ? 'bg-warning' : 'bg-primary'}`} role="progressbar" style={{ width: `${usage}%` }}>{usage}%</div>
                </div>
                <div className="d-flex justify-content-between align-items-center text-sm">
                  <div>
                    {avail > 0 ? (
                      <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i className="fa fa-check-circle me-1"></i>{avail} seat(s) available</span>
                    ) : (
                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1"><i className="fa fa-exclamation-triangle me-1"></i>No seats available</span>
                    )}
                  </div>
                  {!session.user.is_sub_admin && <button type="button" className="btn btn-primary btn-sm fw-bold px-3" onClick={() => setOpenMore((o) => !o)}><i className="fa fa-plus-circle me-1"></i>Increase Seats</button>}
                </div>
              </div>
              {openMore && (
                <div className="mb-4">
                  <div className="card card-body border-primary border-2 shadow-sm">
                    <h5 className="fw-bold text-primary mb-3">🛒 Increase Subscription Seats</h5>
                    <div className="row align-items-center">
                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-semibold">Select Additional Seats to Add</label>
                        <div className="input-group">
                          <button className="btn btn-outline-secondary" type="button" onClick={() => setMore((m) => Math.max(1, m - 1))}>-</button>
                          <input type="number" className="form-control text-center fw-bold" value={more} min={1} max={500} onChange={(e) => setMore(Math.max(1, Number(e.target.value) || 1))} />
                          <button className="btn btn-outline-secondary" type="button" onClick={() => setMore((m) => Math.min(500, m + 1))}>+</button>
                        </div>
                      </div>
                      <div className="col-md-6 mb-3">
                        <div className="p-3 bg-light rounded border text-sm">
                          <div className="d-flex justify-content-between mb-1"><span>Current Seats:</span><span className="fw-bold">{sub.seats}</span></div>
                          <div className="d-flex justify-content-between mb-1"><span>Additional Seats:</span><span className="fw-bold text-primary">{more}</span></div>
                          <div className="d-flex justify-content-between mb-1"><span>New Total Seats:</span><span className="fw-bold text-success">{sub.seats + more}</span></div>
                          <div className="d-flex justify-content-between mb-1"><span>Price Per Seat:</span><span className="fw-bold">₹{number_format(sub.price_per_seat, 0)} / {sub.billing_cycle === 'yearly' ? 'yr' : 'mo'}</span></div>
                          <div className="d-flex justify-content-between border-top pt-2 mt-2 fw-bold text-base"><span>Additional Amount:</span><span className="text-primary">₹{number_format(sub.price_per_seat * more, 0)}</span></div>
                        </div>
                      </div>
                    </div>
                    <div className="text-end">
                      <button type="button" className="btn btn-secondary me-2" onClick={() => setOpenMore(false)}>Cancel</button>
                      <button type="button" className="btn btn-success fw-bold px-4" disabled={addSeats.isPending} onClick={() => addSeats.mutate()}><i className="fa fa-credit-card me-1"></i>Update Seats</button>
                    </div>
                  </div>
                </div>
              )}
              <div className="row g-3 mb-4">
                {([
                  ['Plan Name', `${sub.plan_label}`, ''],
                  ['Billing Cycle', ucfirst(sub.billing_cycle), ''],
                  ['Total Seats', `${sub.seats} Staff Seats`, ''],
                  ['Price Per Seat', money(sub.price_per_seat), ''],
                  ['Total Subscription Amount', money(sub.total_amount), 'text-primary'],
                  ['Payment Method', ucfirst(sub.payment_method || 'Cashfree'), ''],
                  ['Started On', sub.starts_at ? fmtDate(sub.starts_at) : 'N/A', ''],
                  ['Expires On', sub.expires_at ? fmtDate(sub.expires_at) : 'N/A', ''],
                  ['Next Payment Date', sub.expires_at ? fmtDate(sub.expires_at) : 'N/A', ''],
                ] as const).map(([label, value, cls]) => (
                  <div className="col-md-4" key={label}>
                    <div className="p-3 border rounded bg-white">
                      <div className="text-muted text-xs uppercase font-bold mb-1">{label}</div>
                      <div className={`fw-bold fs-6 ${cls || 'text-dark'}`}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <h5 className="fw-bold text-gray-900 mb-3"><i className="fa fa-history text-secondary me-2"></i>Transaction History</h5>
                {ov && ov.transactions.length > 0 ? (
                  <div className="table-responsive border rounded">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr><th className="py-3 px-3">Date</th><th className="py-3 px-3">Transaction ID</th><th className="py-3 px-3">Type</th><th className="py-3 px-3">Amount</th><th className="py-3 px-3">Currency</th><th className="py-3 px-3">Status</th></tr>
                      </thead>
                      <tbody>
                        {ov.transactions.map((t) => (
                          <tr key={t.id}>
                            <td className="px-3 text-sm">{fmtDate(t.created_at)}</td>
                            <td className="px-3 text-sm font-mono">{t.payment_id ?? t.order_id ?? `payment_${t.id}`}</td>
                            <td className="px-3 text-sm fw-semibold">{ucfirst(t.event_type.replaceAll('_', ' ').toLowerCase())}</td>
                            <td className="px-3 text-sm fw-bold">₹{number_format(t.amount ?? 0, 2)}</td>
                            <td className="px-3 text-sm">{t.currency ?? 'INR'}</td>
                            <td className="px-3 text-sm">
                              {['success', 'paid', 'active', 'subscription_activated'].includes((t.status ?? '').toLowerCase()) ? <span className="badge bg-success-subtle text-success px-2 py-1">Success</span> : <span className="badge bg-secondary-subtle text-secondary px-2 py-1">{ucfirst(t.status ?? 'Completed')}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-light rounded text-muted">No transaction records found.</div>
                )}
              </div>
            </div>
          ) : (
            <>
              {needDeactivate > 0 && (
                <div id="seatLimitAlert" className="alert alert-warning border-warning shadow-sm mb-4">
                  <div className="d-flex align-items-start gap-3">
                    <i className="fa fa-exclamation-triangle fa-2x text-warning mt-1"></i>
                    <div>
                      <h5 className="fw-bold mb-1">Action Required: Deactivate Staff Members</h5>
                      <p className="mb-2 text-dark">You currently have <strong>{staff}</strong> active staff members but are subscribing for only <strong>{seats}</strong> seat(s). Please deactivate at least <strong>{needDeactivate}</strong> staff member(s) before continuing.</p>
                      <a href="/staff-new" className="btn btn-sm btn-outline-dark fw-bold"><i className="fa fa-user-minus me-1"></i>Go to Staff Management &amp; Deactivate Staff</a>
                    </div>
                  </div>
                </div>
              )}
              <div className="d-flex align-items-start gap-3">
                <div className="card m-0 p-0 w-25">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center p-3 gap-2">Subscription</h2>
                  <div className="nav flex-column nav-pills pb-2" role="tablist">
                    <button className="nav-link active" type="button" role="tab"><div className="flex items-center gap-2.5 first:mt-0"><h2 className="text-sm flex items-center mb-0">{india ? 'Cashfree' : 'Kelviq'} Payment Method</h2></div></button>
                  </div>
                </div>
                <div className="card m-0 p-0 w-75">
                  <div className="tab-content">
                    <div className="tab-pane fade show active">
                      <section className="p-3">
                        <div className="flex items-center gap-2.5 mb-4 mt-8 first:mt-0"><h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">Choose Your Plan</h2></div>
                        <div className="plans-grid">
                          {(ov?.plans ?? []).map((p) => {
                            const m = META[p.key];
                            const sym = india ? '₹' : '$';
                            const pr = india ? p.price_per_seat : ov?.kelviq.prices[p.key] ?? 0;
                            return (
                              <label key={p.key} className={`plan-card ${planKey === p.key ? 'selected' : ''}`} id={`card-${p.key}`} style={{ '--plan-color': m.color } as React.CSSProperties} onClick={() => setPlanKey(p.key)}>
                                {m.popular && <div className="plan-best-badge">⭐ Best Value</div>}
                                <div className="d-flex justify-content-start align-items-center mb-1">
                                  <div>
                                    <div className="plan-name">{p.label}</div>
                                    <div className="plan-desc">{m.desc}</div>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <div className="plan-price"><span className="currency">{sym}</span>{number_format(pr)}<span className="period"> {m.period}</span>{m.savings && <span className="plan-savings">{m.savings}</span>}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        <div className="checkout-section mt-4">
                          <div className="checkout-card">
                            <div className="checkout-title">🛒 Configure Your Subscription</div>
                            <div className="seat-slider-wrap">
                              <div className="seat-slider-label">
                                <label className="form-label text-gray-700">Number of Staffs</label>
                                <div className="seat-count-display"><span>{seats}</span> <span>staffs</span></div>
                              </div>
                              <input type="range" id="seatSlider" min={plan?.min_seats ?? 1} max={plan?.max_seats ?? 500} value={seats} step={1} onChange={(e) => setSeats(Number(e.target.value))} />
                              <div className="d-flex justify-content-between text-muted" style={{ fontSize: 12 }}><span>{plan?.min_seats ?? 1}</span><span>{plan?.max_seats ?? 500}</span></div>
                            </div>
                            <div className="price-breakdown">
                              <div className="price-row"><span>Plan</span><span>{plan?.label}</span></div>
                              <div className="price-row"><span>Staffs</span><span>{seats}</span></div>
                              <div className="price-row"><span>Price per staff</span><span>{india ? '₹' : '$'}{number_format(india ? price : ov?.kelviq.prices[planKey] ?? 0)} / {planKey === 'yearly' ? 'yr' : 'mo'}</span></div>
                              <div className="price-row total"><span className="total-label">Total</span><span>{india ? '₹' : '$'}{number_format((india ? price : ov?.kelviq.prices[planKey] ?? 0) * seats)}</span></div>
                            </div>
                            <button type="button" className="btn btn-primary w-100" id="payBtn" disabled={checkout.isPending || needDeactivate > 0 || session.user.is_sub_admin} onClick={() => checkout.mutate(method)}>
                              {checkout.isPending ? 'Redirecting…' : `Pay with ${method === 'cashfree' ? 'Cashfree' : 'Kelviq'}`}
                            </button>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
