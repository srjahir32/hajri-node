'use client';

import { createContext, Suspense, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { AdminProvider, useAdminSession } from '@/lib/auth';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PageMeta, SetTitleContext } from './PageMeta';
import { installLegacyBehaviors } from '@/lib/legacy';
import '@/styles/admin-shell.css';

/** A page's browser-tab title when it differs from its header title; '' means the tab uses the header title. */
const SetTabTitleContext = createContext<(tabTitle: string) => void>(() => {});

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function Frame({ children }: { children: ReactNode }) {
  const { session } = useAdminSession();
  const [title, setTitle] = useState('');
  const [tabTitle, setTabTitle] = useState('');
  useEffect(() => {
    if (window.innerWidth >= 992 && localStorage.getItem('sidebar-collapsed') === 'true') {
      document.querySelectorAll('.page-wrapper, body').forEach((el) => el.classList.add('nav_responsive'));
    }
    void installLegacyBehaviors();
  }, []);
  useEffect(() => {
    const tab = tabTitle || title;
    if (tab) document.title = `Hajri | ${tab}`;
  }, [title, tabTitle]);
  const trial = session.subscription.trial_expired ? session.subscription.message : null;
  return (
    <div className="page-wrapper chiller-theme toggled" id="main-page-wrapper">
      <Sidebar />
      <main className="page-content">
        <div className="container-fluid">
          <Header title={title} trialMessage={trial} />
          <div className="main-content-inner">
            <SetTitleContext.Provider value={setTitle}>
              <SetTabTitleContext.Provider value={setTabTitle}>
                <Suspense fallback={null}>{children}</Suspense>
              </SetTabTitleContext.Provider>
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

/** Equivalent of `@extends('admin.layout.main')` with the page's `$header_title` and extra stylesheets. `tabTitle` overrides the browser-tab title only. */
export default function AdminPage({ title, tabTitle, css = [], children }: { title: string; tabTitle?: string; css?: string[]; children: ReactNode }) {
  const setTabTitle = useContext(SetTabTitleContext);
  useIsoLayoutEffect(() => setTabTitle(tabTitle ?? ''), [tabTitle, setTabTitle]);
  return (
    <PageMeta title={title} css={css}>
      {children}
    </PageMeta>
  );
}
