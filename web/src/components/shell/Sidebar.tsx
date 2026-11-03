'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import * as I from '@/components/icons';
import { useAdminSession } from '@/lib/auth';
import { pathIs } from '@/lib/nav';

const DASH_PATHS = ['dashboard*', 'approve-punches*', 'approve-overtime*', 'review-fine*', 'manage-leave*', 'detailed-attendance-view*', 'attendance-upcoming-leaves*', 'attendance-daily-work-entries*', 'on_time*', 'late*', 'absent*', 'leave*', 'notification*'];

export function Sidebar() {
  const pathname = usePathname();
  const { can, session } = useAdminSession();
  const [attOpen, setAttOpen] = useState<boolean | null>(null);
  const attSubs = [
    { perm: 'view_attendance', href: '/attendance-new', label: 'Attendance', on: ['attendance-new'] },
    { perm: 'view_attendance_details', href: '/attendance/attendance-details', label: 'Attendance Details', on: ['attendance/attendance-details', 'attendance-details'] },
    { perm: 'view_punches', href: '/attendance/attendance_punches_new', label: 'View Punches', on: ['attendance/attendance_punches_new', 'attendance_punches_new'] },
    { perm: 'view_locations', href: '/attendance/location', label: 'Locations', on: ['attendance/location', 'location'] },
    { perm: 'view_attendance_request', href: '/attendance/attendance_requests_new', label: 'Attendance Requests', on: ['attendance/attendance_requests_new', 'attendance_requests_new'] },
    { perm: 'view_leave_management', href: '/attendance/attendance_leave_new', label: 'Leave Management', on: ['attendance/attendance_leave_new', 'attendance_leave_new'] },
  ].filter((s) => can(s.perm));
  const attActive = attSubs.some((s) => pathIs(pathname, ...s.on)) || pathIs(pathname, 'attendance*');
  const open = attOpen ?? attActive;

  const sub = session.subscription;
  const now = Date.now();
  const exp = sub.expires_at ? new Date(sub.expires_at).getTime() : null;
  const start = sub.starts_at ? new Date(sub.starts_at).getTime() : exp ? exp - 30 * 864e5 : now;
  const total = exp ? Math.max(1, Math.round((exp - start) / 864e5)) : 1;
  const left = exp ? Math.max(0, Math.floor((exp - now) / 864e5)) : 0;
  const passed = Math.min(total, Math.max(0, Math.round((now - start) / 864e5)));
  const progress = (passed / total) * 100;
  const hasPlan = session.subscription.has_active_subscription && !!exp;
  const fmtExp = exp ? new Date(exp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/(\w{3}) (\d{4})/, '$1, $2') : 'N/A';
  const cap = (s?: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : '');

  return (
    <nav id="sidebar" className="sidebar-wrapper">
      <div className="sidebar-content">
        <div className="sidebar-brand">
          <div id="close-sidebar" onClick={() => document.querySelectorAll('.page-wrapper, body').forEach((el) => el.classList.remove('nav_responsive'))}>
            <img src="/assets/admin/images/sidebar/ic_close.svg" alt="" />
          </div>
        </div>
        <div className="header_top">
          <div className="logo">
            <a href="/dashboard-new" style={{ display: 'flex' }}>
              <img className="img-responsive logo_img " src="/assets/admin/images/sidebar/logo.svg" alt="User picture" />
              <span className="logo_txt">Hajri</span>
            </a>
          </div>
        </div>
        <div className="sidebar-menu pt-0">
          <ul>
            <li className="nav_menu sidemenu_dash">
              <a href="/dashboard-new" className={pathIs(pathname, ...DASH_PATHS) ? 'hr_active' : ''}>
                <I.Iad30a7 />
                <span className="proxima_nova_semibold">Dashboard</span>
              </a>
            </li>
            {attSubs.length > 0 && (
              <li className="nav_menu">
                <a
                  className={pathIs(pathname, 'attendance*') ? 'hr_active' : ''}
                  href="#sidebarLayouts"
                  role="button"
                  aria-expanded={open}
                  aria-controls="sidebarLayouts"
                  onClick={(e) => {
                    e.preventDefault();
                    setAttOpen(!open);
                  }}
                >
                  <I.Ie10a63 />
                  <span className="proxima_nova_semibold">Attendance</span>
                  <span className="arrow">
                    <I.Ic24d4f />
                  </span>
                </a>
                <div className={`menu-dropdown collapse sidebar-layout${open ? ' show' : ''}`} id="sidebarLayouts">
                  <ul className="nav nav-sm flex-column">
                    {attSubs.map((s) => (
                      <li className="nav-item" key={s.href}>
                        <a href={s.href} className={`${pathIs(pathname, ...s.on) ? 'hr_sub_active' : ''} nav-link proxima_nova_semibold`}>
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )}
            {can('view_staff_management') && (
              <li className="nav_menu">
                <a href="/staff-new" className={pathIs(pathname, 'staff*', 'deactivated-staff-new') ? 'hr_active' : ''}>
                  <I.I2499bc />
                  <span className="proxima_nova_semibold">Staff Management</span>
                </a>
              </li>
            )}
            {can('view_report') && (
              <li className="nav_menu">
                <a href="/report_new" className={pathIs(pathname, 'report*') ? 'hr_active' : ''}>
                  <I.I34b910 />
                  <span className="proxima_nova_semibold">Reports</span>
                </a>
              </li>
            )}
            {can('view_payroll') && (
              <li className="nav_menu">
                <a href="/payroll_new" className={pathIs(pathname, 'payroll*') ? 'hr_active' : ''}>
                  <I.I0adbf5 />
                  <span className="proxima_nova_semibold">Payroll</span>
                </a>
              </li>
            )}
            {can('view_roles') && (
              <li className="nav_menu">
                <a href="/roles" className={pathIs(pathname, 'roles*') ? 'hr_active' : ''}>
                  <I.I681d7c />
                  <span className="proxima_nova_semibold">Roles</span>
                </a>
              </li>
            )}
            {can('view_subscription') && (
              <li className="nav_menu">
                <a href="/subscriptions" className={pathIs(pathname, 'subscriptions*') ? 'hr_active' : ''}>
                  <I.Ie390e5 />
                  <span className="proxima_nova_semibold">Subscriptions</span>
                </a>
              </li>
            )}
            {can('view_admin_user') && (
              <li className="nav_menu">
                <a href="/admin_users" className={pathIs(pathname, 'admin_users*') ? 'hr_active' : ''}>
                  <I.Ib98a6e />
                  <span className="proxima_nova_semibold">Admin Users</span>
                </a>
              </li>
            )}
            {can('view_setting') && (
              <li className="nav_menu">
                <a href="/setting-new" className={pathIs(pathname, 'setting*') ? 'hr_active' : ''}>
                  <I.Id96d90 />
                  <span className="proxima_nova_semibold">Settings</span>
                </a>
              </li>
            )}
          </ul>
        </div>
        {!session.user.is_sub_admin && (
          <div className="sidebar-subscription-card">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            {hasPlan ? (
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span className="proxima_nova_semibold" style={{ color: '#1f2937', fontSize: 14, fontWeight: 700, letterSpacing: '-0.2px' }}>Active Plan</span>
                  <span className="plan-badge">
                    <I.I4f2a86 />
                    {cap(sub.plan)}
                  </span>
                </div>
                <div className="glass-stats-box">
                  <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid rgba(229, 231, 235, 0.5)' }}>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: 9, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Seats</p>
                    <p style={{ margin: 0, color: '#111827', fontSize: 15, fontWeight: 800 }}>{sub.seats}</p>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: 9, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Cycle</p>
                    <p style={{ margin: 0, color: '#111827', fontSize: 15, fontWeight: 800 }}>{cap(sub.billing_cycle)}</p>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className={left <= 7 ? 'text-pulse-danger' : ''} style={{ color: left <= 7 ? '#ef4444' : '#4b5563', fontSize: 11, fontWeight: 700 }}>{left} days left</span>
                    <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 600 }}>{fmtExp}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="proxima_nova_semibold" style={{ color: '#1f2937', fontSize: 14, fontWeight: 700 }}>Subscription</span>
                  <span style={{ background: '#fee2e2', color: '#ef4444', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.5px', boxShadow: '0 2px 4px rgba(239,68,68,0.2)' }}>No Plan</span>
                </div>
                <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: 12, lineHeight: 1.5 }}>Unlock premium features by subscribing to a plan.</p>
                <a href="/subscriptions" className="upgrade-btn">
                  <span>Upgrade Now</span>
                  <I.I819995 />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
