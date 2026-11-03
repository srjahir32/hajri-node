'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { AdminProvider, useAdminSession } from '@/lib/auth';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PageMeta, SetTitleContext } from './PageMeta';
import { installLegacyBehaviors } from '@/lib/legacy';
import '@/styles/admin-shell.css';

function Frame({ children }: { children: ReactNode }) {
  const { session } = useAdminSession();
  const [title, setTitle] = useState('');
  useEffect(() => {
    if (window.innerWidth >= 992 && localStorage.getItem('sidebar-collapsed') === 'true') {
      document.querySelectorAll('.page-wrapper, body').forEach((el) => el.classList.add('nav_responsive'));
    }
    void installLegacyBehaviors();
  }, []);
  useEffect(() => {
    if (title) document.title = `Hajri | ${title}`;
  }, [title]);
  const trial = session.subscription.trial_expired ? session.subscription.message : null;
  return (
    <div className="page-wrapper chiller-theme toggled" id="main-page-wrapper">
      <Sidebar />
      <main className="page-content">
        <div className="container-fluid">
          <Header title={title} trialMessage={trial} />
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

/** Session + sidebar + header, mounted once in the (admin) layout. */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <Frame>{children}</Frame>
    </AdminProvider>
  );
}

/** Equivalent of `@extends('admin.layout.main')` with the page's `$header_title` and extra stylesheets. */
export default function AdminPage({ title, css = [], children }: { title: string; css?: string[]; children: ReactNode }) {
  return (
    <PageMeta title={title} css={css}>
      {children}
    </PageMeta>
  );
}
