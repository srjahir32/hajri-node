'use client';

import { useSuper } from '@/lib/query';
import { fmtDate } from '@/lib/format';
import { number_format, ucfirst } from '@/lib/blade';
import { navigate } from '@/lib/navigate';
import { ApexChart } from '@/components/widgets/ApexChart';

interface Biz { id: number; name: string; owner: string | null; phone: string | null; staff_count: number; created_at: string }
interface Pay { id: number; amount: number; status: string | null; currency: string; user_name: string | null; plan: string | null; payment_method: string | null }
interface D {
  total_businesses: number; today_businesses: number; this_month_businesses: number; total_staff: number; active_staff: number; deactive_staff: number;
  total_users: number; fully_registered_users: number; not_fully_registered_users: number; total_subscriptions: number; active_subscriptions: number; pending_subscriptions: number;
  total_revenue_cashfree: number; total_revenue_kelviq: number; month_revenue_cashfree: number; month_revenue_kelviq: number; today_revenue_cashfree: number; today_revenue_kelviq: number;
  recent_businesses: Biz[]; recent_payments: Pay[]; monthly_growth: { month: string; businesses: number; staff: number }[];
}
const fmtLong = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function Body() {
  const d = useSuper<D>('/super-admin/dashboard/overview').data?.data;
  if (!d) return null;
  const { total_businesses, today_businesses, this_month_businesses, total_staff, active_staff, deactive_staff, total_users, fully_registered_users, not_fully_registered_users, total_subscriptions, active_subscriptions, pending_subscriptions, total_revenue_cashfree, total_revenue_kelviq, month_revenue_cashfree, month_revenue_kelviq, today_revenue_cashfree, today_revenue_kelviq } = d;
  const today = new Date();
  const monthLabel = today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const growth = d.monthly_growth;
  return (
    <>

    <main className="flex-1 pb-4 pt-4 overflow-y-auto">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="sa-dashboard-wrap" style={{ padding: "0", minHeight: "auto" }}>
                
                <div className="sa-page-header">
                    <div>
                        <h1>Super Admin Dashboard</h1>
                        <p>Welcome back! Here's what's happening across all businesses.</p>
                    </div>
                    <div className="sa-date-badge">
                        <i className="fas fa-calendar-alt" style={{ marginRight: "6px", color: "#6366f1" }}></i>
                        
                        {(fmtLong(today))}
                    </div>
                </div>
                
                <div className="sa-stat-grid">
                    
                    <div className="sa-card" onClick={() => navigate('/super-admin/business')} style={{ cursor: "pointer" }}>
                        <div className="sa-card-icon icon-blue"><i className="fas fa-building"></i></div>
                        <div className="sa-card-label">Total Businesses</div>
                        <div className="sa-card-value">{(total_businesses)}</div>
                        <div className="sa-card-sub">
                            <span className="badge-up">+{(today_businesses)}</span> today  | 
                            <span className="badge-up">+{(this_month_businesses)}</span> this month
                        </div>
                        <div className="sa-card-glow glow-blue"></div>
                    </div>
                    
                    <div className="sa-card" onClick={() => navigate('/super-admin/staff-list')} style={{ cursor: "pointer" }}>
                        <div className="sa-card-icon icon-green"><i className="fas fa-users"></i></div>
                        <div className="sa-card-label">Total Staff</div>
                        <div className="sa-card-value">{(total_staff)}</div>
                        <div className="sa-card-sub">
                            <span className="badge-up">{(active_staff)} active</span>  | 
                            <span className="badge-down">{(deactive_staff)} deactivated</span>
                        </div>
                        <div className="sa-card-glow glow-green"></div>
                    </div>
                    
                    <div className="sa-card" onClick={() => navigate('/super-admin/users')} style={{ cursor: "pointer" }}>
                        <div className="sa-card-icon icon-indigo"><i className="fas fa-user-tie"></i></div>
                        <div className="sa-card-label">Business Owners</div>
                        <div className="sa-card-value">{(total_users)}</div>
                        <div className="sa-card-sub">
                            <span className="badge-up">{(fully_registered_users)} registered</span>  | 
                            <span className="badge-down">{(not_fully_registered_users)} incomplete</span>
                        </div>
                        <div className="sa-card-glow glow-indigo"></div>
                    </div>
                    
                    <div className="sa-card" onClick={() => navigate('/super-admin/subscription/plans')} style={{ cursor: "pointer" }}>
                        <div className="sa-card-icon icon-purple"><i className="fas fa-star"></i></div>
                        <div className="sa-card-label">Subscriptions</div>
                        <div className="sa-card-value">{(total_subscriptions)}</div>
                        <div className="sa-card-sub">
                            <span className="badge-up">{(active_subscriptions)} active</span>  | 
                            <span className="badge-down">{(pending_subscriptions)} pending</span>
                        </div>
                        <div className="sa-card-glow glow-purple"></div>
                    </div>
                </div>
                
                
                    
                        
                        
                        
                        
                        
                        
                    
                        
                        
                        
                        
                        
                        
                    
                        
                        
                        
                        
                        
                        
                    
                        
                        
                        
                            
                            
                            
                            
                            
                            
                        
                        
                        
                    
                
                
                <div className="sa-revenue-row" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "24px" }}>
                    <div className="sa-revenue-card bg-rev-blue">
                        <div className="rev-icon"><i className="fas fa-sun"></i></div>
                        <h6>Today Cashfree</h6>
                        <div className="amount">₹{(number_format(today_revenue_cashfree, 2))}</div>
                        <div className="sub">Collected on {(fmtLong(today))}</div>
                        <div className="rev-glow"></div>
                    </div>
                    <div className="sa-revenue-card bg-rev-today">
                        <div className="rev-icon"><i className="fas fa-calendar-check"></i></div>
                        <h6>This Month Cashfree</h6>
                        <div className="amount">₹{(number_format(month_revenue_cashfree, 2))}</div>
                        <div className="sub">{(monthLabel)}</div>
                        <div className="rev-glow"></div>
                    </div>
                    <div className="sa-revenue-card bg-rev-total">
                        <div className="rev-icon"><i className="fas fa-wallet"></i></div>
                        <h6>Total Cashfree</h6>
                        <div className="amount">₹{(number_format(total_revenue_cashfree, 2))}</div>
                        <div className="sub">All-time paid collections</div>
                        <div className="rev-glow"></div>
                    </div>
                </div>
                
                <div className="sa-revenue-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    <div className="sa-revenue-card bg-rev-pink">
                        <div className="rev-icon"><i className="fas fa-sun"></i></div>
                        <h6>Today Kelviq</h6>
                        <div className="amount">${(number_format(today_revenue_kelviq, 2))}</div>
                        <div className="sub">Collected on {(fmtLong(today))}</div>
                        <div className="rev-glow"></div>
                    </div>
                    <div className="sa-revenue-card bg-rev-month">
                        <div className="rev-icon"><i className="fas fa-calendar-check"></i></div>
                        <h6>This Month Kelviq</h6>
                        <div className="amount">${(number_format(month_revenue_kelviq, 2))}</div>
                        <div className="sub">{(monthLabel)}</div>
                        <div className="rev-glow"></div>
                    </div>
                    <div className="sa-revenue-card bg-rev-kelviq">
                        <div className="rev-icon"><i className="fas fa-wallet"></i></div>
                        <h6>Total Kelviq</h6>
                        <div className="amount">${(number_format(total_revenue_kelviq, 2))}</div>
                        <div className="sub">All-time paid collections</div>
                        <div className="rev-glow"></div>
                    </div>
                </div>
                
                <div className="sa-bottom-grid">
                    
                    <div className="sa-section-card">
                        <div className="sa-section-head">
                            <h5><i className="fas fa-chart-bar" style={{ color: "#6366f1", marginRight: "8px" }}></i>Growth Overview (Last 6 Months)</h5>
                        </div>
                        <div style={{ padding: "16px" }}>
                            <ApexChart height={280} options={{ chart: { toolbar: { show: false }, fontFamily: "inherit" }, xaxis: { categories: growth.map((g) => g.month), labels: { style: { fontSize: "12px", colors: "#9ca3af" } }, axisBorder: { show: false }, axisTicks: { show: false } }, yaxis: { labels: { style: { colors: "#9ca3af", fontSize: "12px" } } }, colors: ["#6366f1", "#10b981"], plotOptions: { bar: { columnWidth: "55%", borderRadius: 5, borderRadiusApplication: "end" } }, dataLabels: { enabled: false }, legend: { position: "top", horizontalAlign: "right", labels: { colors: "#6b7280" }, markers: { size: 6 } }, grid: { borderColor: "#f3f4f6", strokeDashArray: 4 }, tooltip: { theme: "light", y: { formatter: (v: number) => `${v} records` } } }} series={[{ name: "Businesses", data: growth.map((g) => g.businesses) }, { name: "Staff", data: growth.map((g) => g.staff) }]} />
                        </div>
                    </div>
                    
                    <div className="sa-section-card">
                        <div className="sa-section-head">
                            <h5><i className="fas fa-credit-card" style={{ color: "#10b981", marginRight: "8px" }}></i>Recent Payments</h5>
                            <a href={"/super-admin/subscription/payments"}>View All →</a>
                        </div>
                        <table id="payment_datas" className="sa-inner-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Plan</th>
                                    <th>Payment Method</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {d.recent_payments.length ? d.recent_payments.map((pay) => {
                        const st = (pay.status ?? 'unknown').toLowerCase();
                        return (
                            <tr key={pay.id}>
                                <td>{pay.user_name ?? '-'}</td>
                                <td>{pay.plan ? ucfirst(pay.plan) : '-'}</td>
                                <td>{pay.payment_method ?? '-'}</td>
                                <td>{pay.currency === 'USD' ? '$' : '₹'}{pay.amount ? number_format(pay.amount, 2) : '0.00'}</td>
                                <td><span className={'pill ' + (st === 'success' ? 'pill-green' : st === 'pending' ? 'pill-yellow' : 'pill-red')}>{ucfirst(st)}</span></td>
                            </tr>
                        );
                    }) : <tr><td colSpan={5}>No payment records yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div className="sa-section-card" style={{ marginBottom: "24px" }}>
                    <div className="sa-section-head">
                        <h5><i className="fas fa-store" style={{ color: "#3b82f6", marginRight: "8px" }}></i>Recently Registered Businesses</h5>
                        <a href={"/super-admin/business"}>View All →</a>
                    </div>
                    <table id="business_datas" className="sa-inner-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Business Name</th>
                                <th>Owner</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Registered</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {d.recent_businesses.length ? d.recent_businesses.map((biz, idx) => (
                            <tr key={biz.id}>
                                <td>{idx + 1}</td>
                                <td><strong>{biz.name}</strong></td>
                                <td>{biz.owner ?? '-'}</td>
                                <td>-</td>
                                <td>{biz.phone ?? '-'}</td>
                                <td>{fmtDate(biz.created_at)}</td>
                                <td><a href={`/super-admin/business/${biz.id}`}><i className="fas fa-eye"></i></a></td>
                            </tr>
                        )) : <tr><td colSpan={7}>No businesses registered yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </main>

    </>
  );
}
