'use client';

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import * as I from '@/components/icons';
import { staffApi } from '@/lib/api';
import { StaffProvider, useStaffSession } from '@/lib/auth';
import { useStaff } from '@/lib/query';
import { pathIs } from '@/lib/nav';
import { timeAgo } from '@/lib/format';
import { PageMeta, SetTitleContext } from './PageMeta';
import { installLegacyBehaviors } from '@/lib/legacy';
import '@/styles/admin-shell.css';

interface Notif { id: number; title: string; message: string | null; read: boolean; created_at: string }
const toggleSidebar = () => {
  const collapsed = !document.body.classList.contains('nav_responsive');
  document.querySelectorAll('.page-wrapper, body').forEach((el) => el.classList.toggle('nav_responsive'));
  if (window.innerWidth >= 992) localStorage.setItem('sidebar-collapsed', collapsed ? 'true' : 'false');
};

function StaffSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(pathIs(pathname, 'employee/attendance', 'employee/attendance/details'));
  const dash = pathIs(pathname, 'employee/dashboard*', 'employee/notifications', 'employee/edit-profile');
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
            <a href="/employee/dashboard" style={{ display: 'flex' }}>
              <img className="img-responsive logo_img " src="/assets/admin/images/sidebar/logo.svg" alt="User picture" />
              <span className="logo_txt">Hajri</span>
            </a>
          </div>
        </div>
        <div className="sidebar-menu pt-0">
          <ul>
            <li className="nav_menu sidemenu_dash">
              <a href="/employee/dashboard" className={dash ? 'hr_active' : ''}>
                <I.Iad30a7 />
                <span className="proxima_nova_semibold">Dashboard</span>
              </a>
            </li>
            <li className="nav_menu">
              <a className={pathIs(pathname, 'employee/attendance', 'employee/attendance/details') ? 'hr_active' : ''} href="#sidebarLayouts" role="button" aria-expanded={open} aria-controls="sidebarLayouts" onClick={(e) => { e.preventDefault(); setOpen(!open); }}>
                <I.Ie10a63 />
                <span className="proxima_nova_semibold">Attendance</span>
                <span className="arrow"><I.Ic24d4f /></span>
              </a>
              <div className={`menu-dropdown collapse sidebar-layout${open ? ' show' : ''}`} id="sidebarLayouts">
                <ul className="nav nav-sm flex-column">
                  <li className="nav-item"><a href="/employee/attendance" className={`${pathIs(pathname, 'employee/attendance') ? 'hr_sub_active' : ''} nav-link proxima_nova_semibold`}>Attendance</a></li>
                  <li className="nav-item"><a href="/employee/attendance/details" className={`${pathIs(pathname, 'employee/attendance/details') ? 'hr_sub_active' : ''} nav-link proxima_nova_semibold`}>Attendance Details</a></li>
                </ul>
              </div>
            </li>
            <li className="nav_menu">
              <a href="/employee/attendance-request" className={pathIs(pathname, 'employee/attendance-request*') ? 'hr_active' : ''}>
                <I.I8ef321 />
                <span className="proxima_nova_semibold">Attendance Request</span>
              </a>
            </li>
            <li className="nav_menu">
              <a href="/employee/leaves" className={pathIs(pathname, 'employee/leaves*') ? 'hr_active' : ''}>
                <I.Ifcff7c />
                <span className="proxima_nova_semibold">Leave Request</span>
              </a>
            </li>
            <li className="nav_menu">
              <a href="/employee/reports" className={pathIs(pathname, 'employee/reports*') ? 'hr_active' : ''}>
                <I.I34b910 />
                <span className="proxima_nova_semibold">Reports</span>
              </a>
            </li>
            <li className="nav_menu">
              <a href="/employee/holidays" className={pathIs(pathname, 'employee/holidays*') ? 'hr_active' : ''}>
                <I.I0adbf5 />
                <span className="proxima_nova_semibold">Holidays</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

function StaffHeader({ title }: { title: string }) {
  const { staff, logout, subscription } = useStaffSession();
  const qc = useQueryClient();
  const notifs = useStaff<Notif[]>('/employee/notifications', { limit: 10 });
  const unread = Number((notifs.data as { unread_count?: number } | undefined)?.unread_count ?? 0);
  const list = notifs.data?.data ?? [];
  const [nOpen, setNOpen] = useState(false);
  const [uOpen, setUOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) { setNOpen(false); setUOpen(false); }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const refresh = () => qc.invalidateQueries({ queryKey: ['staff'] });
  const markAll = async (e: React.MouseEvent) => { e.preventDefault(); await staffApi.post('/employee/notifications/read-all'); refresh(); };
  const markOne = async (e: React.MouseEvent, n: Notif) => { e.preventDefault(); await staffApi.post(`/employee/notifications/${n.id}/read`); refresh(); };
  const name = staff.name ? staff.name[0].toUpperCase() + staff.name.slice(1) : '';
  return (
    <div className="top-bar">
      <div className="row align-items-center hajri-profile-header-right">
        <div className="col-8 col-lg-6 topbar_left pr-0">
          {subscription?.trial_expired ? (
            <div className="alert alert-danger mb-0 d-inline-flex align-items-center px-3 py-2" style={{ border: '1px solid #ff4d4f', backgroundColor: '#ffffff', color: '#ff4d4f', fontSize: 14, borderRadius: 4, fontWeight: 500 }}>
              <i className="fas fa-info-circle me-2"></i> {subscription.message}
            </div>
          ) : (
            <h3 className="topbar_title mb-0 ">
              <a id="show-sidebar" className="sidebar_toggle cursor_pointer" onClick={toggleSidebar}>
                <img className="topbar_title_icon" src="/assets/admin/images/header/ic_layout.svg" alt="" />
              </a>
              <span className="proxima_nova_bold header_title">{title}</span>
            </h3>
          )}
        </div>
        <div className="col-4 col-lg-6 topbar_right justify-content-end" ref={ref}>
          <div className="desktop-screen ">
            <div className="profile-main-notification">
              <div className="notification-toggle" onClick={() => { setNOpen((o) => !o); setUOpen(false); }}>
                <div className="position-relative">
                  <I.I721853 />
                  {unread > 0 && <div className="notification_on_icon">{unread}</div>}
                </div>
              </div>
              <div className={`dropdown-content${nOpen ? ' active' : ''}`}>
                {list.length > 0 ? (
                  <>
                    <div className="notification-header d-flex justify-content-between align-items-center p-3 border-bottom">
                      <h6 className="mb-0 proxima_nova_bold">Notifications</h6>
                      <a href="#" onClick={markAll} className="mark-all-read-btn proxima_nova_semibold text-primary" style={{ fontSize: 13, textDecoration: 'none' }}>Mark all as read</a>
                    </div>
                    <ul style={{ paddingLeft: 0, marginBottom: 0 }}>
                      {list.slice(0, 5).map((n) => (
                        <li key={n.id}>
                          <a href="#" onClick={(e) => markOne(e, n)}>
                            <div className="notification-text position-relative">
                              {!n.read && <div className="unread-dot"></div>}
                              <p className="noti-main-text proxima_nova_semibold">{n.message ?? n.title}</p>
                              <span>{timeAgo(n.created_at)}</span>
                            </div>
                          </a>
                        </li>
                      ))}
                      <li><div className="notification-text"><a href="/employee/notifications" className="section_sub_title proxima_nova_bold">See All Notifications</a></div></li>
                    </ul>
                  </>
                ) : (
                  <div className="dropdown-sub-no-notifiy">
                    <div><I.I5d8d28 /></div>
                    <div className="section_title proxima_nova_semibold">No Notifications</div>
                  </div>
                )}
              </div>
            </div>
            <div className="user-profile pull-right">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="avatar user-thumb" src={staff.photo ?? '/assets/admin/images/dummy/dummy-user.svg'} alt="avatar" />
              <div className="dropdown header_user_dropdown">
                <a className="user-name dropdown-toggle text-decoration-none" href="#" role="button" aria-expanded={uOpen} style={{ display: 'flex', alignItems: 'center' }} onClick={(e) => { e.preventDefault(); setUOpen((o) => !o); setNOpen(false); }}>
                  <span className="proxima_nova_bold">{name}</span>
                  <I.Ie2bcfb />
                </a>
                <ul className={`dropdown-menu dropdown-menu-end p-0 shadow custom-account-dropdown${uOpen ? ' show' : ''}`} style={uOpen ? { display: 'block' } : undefined}>
                  <div className="account-single-col">
                    <div className="px-3 pt-3 pb-3 d-flex align-items-center border-bottom mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="rounded-circle me-3" style={{ width: 40, height: 40, objectFit: 'cover' }} src={staff.photo ?? '/assets/admin/images/dummy/dummy-user.svg'} alt="avatar" />
                      <div className="d-flex flex-column text-truncate" style={{ maxWidth: 170 }}>
                        <span className="proxima_nova_bold text-dark text-truncate" style={{ fontSize: 15, lineHeight: 1.2 }}>{staff.name}</span>
                        <span className="text-muted text-truncate" style={{ fontSize: 13 }}>{staff.email ?? staff.phone_number}</span>
                      </div>
                    </div>
                    <div className="px-2 pb-2">
                      <a className="dropdown-item proxima_nova_semibold" href="/employee/edit-profile">Edit Profile</a>
                      <a className="dropdown-item proxima_nova_semibold text-danger" href="#" onClick={(e) => { e.preventDefault(); void logout(); }}>Logout</a>
                    </div>
                  </div>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('');
  useEffect(() => {
    if (window.innerWidth >= 992 && localStorage.getItem('sidebar-collapsed') === 'true') document.querySelectorAll('.page-wrapper, body').forEach((el) => el.classList.add('nav_responsive'));
    void installLegacyBehaviors();
  }, []);
  useEffect(() => {
    if (title) document.title = `Hajri | ${title}`;
  }, [title]);
  return (
    <div className="page-wrapper chiller-theme toggled" id="main-page-wrapper">
      <StaffSidebar />
      <main className="page-content">
        <div className="container-fluid">
          <StaffHeader title={title} />
          <div className="main-content-inner">
            <SetTitleContext.Provider value={setTitle}>
              <Suspense fallback={null}>{children}</Suspense>
            </SetTitleContext.Provider>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Staff session + sidebar + header, mounted once in the (employee) layout. */
export function StaffShell({ children }: { children: ReactNode }) {
  return (
    <StaffProvider>
      <Frame>{children}</Frame>
    </StaffProvider>
  );
}

/** Equivalent of `@extends('front.layout.main')`: the page's title and stylesheets. */
export default function StaffPage({ title, css = [], children }: { title: string; css?: string[]; children: ReactNode }) {
  return (
    <PageMeta title={title} css={css}>
      {children}
    </PageMeta>
  );
}
