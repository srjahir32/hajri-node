'use client';

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import * as I from '@/components/icons';
import { SuperProvider, useSuperSession } from '@/lib/auth';
import { pathIs } from '@/lib/nav';
import { PageMeta, SetTitleContext } from './PageMeta';
import { installLegacyBehaviors } from '@/lib/legacy';
import '@/styles/admin-shell.css';

const toggleSidebar = () => {
  const collapsed = !document.body.classList.contains('nav_responsive');
  document.querySelectorAll('.page-wrapper, body').forEach((el) => el.classList.toggle('nav_responsive'));
  if (window.innerWidth >= 992) localStorage.setItem('sidebar-collapsed', collapsed ? 'true' : 'false');
};

function SuperSidebar() {
  const pathname = usePathname();
  const subs = pathIs(pathname, 'super-admin/subscription*');
  const [open, setOpen] = useState(subs);
  const item = (href: string, label: string, icon: ReactNode, on: string[]) => (
    <li className="nav_menu">
      <a href={href} className={pathIs(pathname, ...on) ? 'hr_active' : ''}>{icon}<span className="proxima_nova_semibold">{label}</span></a>
    </li>
  );
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
            <a href="/super-admin/dashboard" style={{ display: 'flex' }}>
              <img className="img-responsive logo_img " src="/assets/admin/images/sidebar/logo.svg" alt="User picture" />
              <span className="logo_txt">Hajri</span>
            </a>
          </div>
        </div>
        <div className="sidebar-menu">
          <ul>
            <li className="nav_menu sidemenu_dash">
              <a href="/super-admin/dashboard" className={pathIs(pathname, 'super-admin/dashboard*') ? 'hr_active' : ''}><I.Iad30a7 /><span className="proxima_nova_semibold">Dashboard</span></a>
            </li>
            {item('/super-admin/business', 'Business', <I.I2499bc />, ['super-admin/business*'])}
            {item('/super-admin/users', 'Business Owners', <I.I2499bc />, ['super-admin/users*'])}
            {item('/super-admin/staff-list', 'Staff List', <I.I2499bc />, ['super-admin/staff-list*', 'super-admin/staff-profile*'])}
            <li className="nav_menu">
              <a className={subs ? 'hr_active' : ''} href="#superAdminSubscriptionLayouts" role="button" aria-expanded={open} onClick={(e) => { e.preventDefault(); setOpen(!open); }}>
                <I.Ie390e5 />
                <span className="proxima_nova_semibold">Subscriptions</span>
                <span className="arrow"><I.Ic24d4f /></span>
              </a>
              <div className={`menu-dropdown collapse sidebar-layout${open ? ' show' : ''}`} id="superAdminSubscriptionLayouts">
                <ul className="nav nav-sm flex-column">
                  <li className="nav-item"><a href="/super-admin/subscription/plans" className={`${pathIs(pathname, 'super-admin/subscription/plans*') ? 'hr_sub_active' : ''} nav-link proxima_nova_semibold`}>Plans</a></li>
                  <li className="nav-item"><a href="/super-admin/subscription/payments" className={`${pathIs(pathname, 'super-admin/subscription/payments*') ? 'hr_sub_active' : ''} nav-link proxima_nova_semibold`}>Payments</a></li>
                </ul>
              </div>
            </li>
            {item('/super-admin/reports', 'Reports', <I.Ic1ec60 />, ['super-admin/reports*'])}
          </ul>
        </div>
      </div>
    </nav>
  );
}

function SuperHeader({ title }: { title: string }) {
  const { admin, logout } = useSuperSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const name = admin.name ?? admin.email;
  return (
    <div className="top-bar">
      <div className="row align-items-center hajri-profile-header-right">
        <div className="col-8 col-lg-6 topbar_left pr-0">
          <h3 className="topbar_title mb-0 ">
            <a id="show-sidebar" className="sidebar_toggle cursor_pointer" onClick={toggleSidebar}>
              <img className="topbar_title_icon" src="/assets/admin/images/header/ic_layout.svg" alt="" />
            </a>
            <span className="proxima_nova_bold header_title">{title}</span>
          </h3>
        </div>
        <div className="col-4 col-lg-6 topbar_right justify-content-end" ref={ref}>
          <div className="desktop-screen ">
            <div className="user-profile pull-right">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="avatar user-thumb" src="/assets/admin/images/dummy/dummy-user.svg" alt="avatar" />
              <div className="dropdown header_user_dropdown">
                <a className="user-name dropdown-toggle text-decoration-none" href="#" role="button" aria-expanded={open} style={{ display: 'flex', alignItems: 'center' }} onClick={(e) => { e.preventDefault(); setOpen((o) => !o); }}>
                  <span className="proxima_nova_bold">{name}</span>
                  <I.Ie2bcfb />
                </a>
                <ul className={`dropdown-menu dropdown-menu-end p-0 shadow custom-account-dropdown${open ? ' show' : ''}`} style={open ? { display: 'block' } : undefined}>
                  <div className="account-single-col">
                    <div className="px-3 pt-3 pb-2 d-flex flex-column border-bottom mb-2">
                      <span className="proxima_nova_bold text-dark" style={{ fontSize: 15 }}>{admin.name ?? 'Super Admin'}</span>
                      <span className="text-muted" style={{ fontSize: 13 }}>{admin.email}</span>
                    </div>
                    <div className="px-2 pb-2">
                      <a className="dropdown-item proxima_nova_semibold text-danger" href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Logout</a>
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
      <SuperSidebar />
      <main className="page-content">
        <div className="container-fluid">
          <SuperHeader title={title} />
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

/** Super-admin session + sidebar + header, mounted once in the (super) layout. */
export function SuperShell({ children }: { children: ReactNode }) {
  return (
    <SuperProvider>
      <Frame>{children}</Frame>
    </SuperProvider>
  );
}

/** Equivalent of `@extends('super-admin.layout.main')`. */
export default function SuperPage({ title, css = [], children }: { title: string; css?: string[]; children: ReactNode }) {
  return (
    <PageMeta title={title} css={[...new Set(['super-admin-custom.css', ...css])]}>
      {children}
    </PageMeta>
  );
}
