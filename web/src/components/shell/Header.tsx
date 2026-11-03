'use client';

import { useEffect, useRef, useState } from 'react';
import * as I from '@/components/icons';
import { adminApi, business as bizStore } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { useAdmin } from '@/lib/query';
import { timeAgo } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';
import { navigate } from '@/lib/navigate';

interface Notif {
  id: number;
  title: string;
  message: string | null;
  action: string | null;
  action_id: number | null;
  read: boolean;
  created_at: string;
}
interface SearchResult {
  departments: { id: number; name: string }[];
  staff: { id: number; name: string }[];
}

const toggleSidebar = () => {
  const collapsed = !document.body.classList.contains('nav_responsive');
  document.querySelectorAll('.page-wrapper, body').forEach((el) => el.classList.toggle('nav_responsive'));
  if (window.innerWidth >= 992) localStorage.setItem('sidebar-collapsed', collapsed ? 'true' : 'false');
};

export function Header({ title, trialMessage }: { title: string; trialMessage?: string | null }) {
  const { session, logout, switchBusiness, businessId } = useAdminSession();
  const qc = useQueryClient();
  const notifs = useAdmin<Notif[]>('/admin/notifications', { limit: 10 });
  const unread = Number((notifs.data as { unread_count?: number } | undefined)?.unread_count ?? 0);
  const list = notifs.data?.data ?? [];

  return (
    <div className="top-bar">
      <div className="row align-items-center hajri-profile-header-right">
        <div className="col-8 col-lg-6 topbar_left pr-0">
          {trialMessage ? (
            <div className="alert alert-danger mb-0 d-inline-flex align-items-center px-3 py-2" style={{ border: '1px solid #ff4d4f', backgroundColor: '#ffffff', color: '#ff4d4f', fontSize: 14, borderRadius: 4, fontWeight: 500 }}>
              <i className="fas fa-info-circle me-2"></i> {trialMessage}
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
        <div className="col-4 col-lg-6 topbar_right justify-content-end">
          <div className="desktop-screen ">
            <SearchBox id="global_search" />
            <NotificationMenu list={list} unread={unread} variant="desktop" onChange={() => qc.invalidateQueries({ queryKey: ['admin', undefined, '/admin/notifications'] })} />
            <UserMenu session={session} businessId={businessId} switchBusiness={switchBusiness} logout={logout} />
          </div>
          <div className="btn-group upload-actions mobile-screen">
            <div>
              <a
                className="topbartoggler waves-effect waves-light"
                href="#navbarSupportedContent"
                aria-controls="navbarSupportedContent"
                aria-expanded="true"
                aria-label="Toggle navigation"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('navbarSupportedContent')?.classList.toggle('show');
                }}
              >
                <I.Ieb8089 />
              </a>
            </div>
          </div>
        </div>
        <div className="col-12 navbar-collapse collapse mobile-header" id="navbarSupportedContent" data-navbarbg="skin6">
          <div className="mobile-header-sub">
            <SearchBox id="global_search_mobile" />
            <div className="profile-header-sub">
              <NotificationMenu list={list} unread={unread} variant="mobile" onChange={() => qc.invalidateQueries({ queryKey: ['admin', undefined, '/admin/notifications'] })} />
              <UserMenu session={session} businessId={businessId} switchBusiness={switchBusiness} logout={logout} mobile />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchBox({ id }: { id: string }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  useEffect(() => {
    const text = q.trim();
    if (!text) {
      setRes(null);
      return;
    }
    const n = ++seq.current;
    setLoading(true);
    adminApi
      .get<SearchResult>('/admin/search', { q: text })
      .then((r) => n === seq.current && setRes(r.data))
      .catch(() => n === seq.current && setRes({ departments: [], staff: [] }))
      .finally(() => n === seq.current && setLoading(false));
  }, [q]);
  const has = res && (res.departments.length > 0 || res.staff.length > 0);
  return (
    <form action="" onSubmit={(e) => e.preventDefault()}>
      <input className="input-search-rounded global_search_input" type="text" placeholder="Search" id={id} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      <div className="search_data" style={{ display: q.trim() ? 'block' : 'none' }}>
        {loading && (
          <div className="search_loder text-center">
            <img src="/assets/admin/images/search_loader.gif" alt="" />
          </div>
        )}
        {!loading && res && has && (
          <>
            {res.departments.length > 0 && (
              <div className="search_inner_data">
                <h6>Department</h6>
                {res.departments.map((d) => (
                  <a key={d.id} className="staff-edit search_sub_list_data" href="/setting/departments_new">
                    <p>{d.name}</p>
                  </a>
                ))}
              </div>
            )}
            {res.staff.length > 0 && (
              <div className="search_inner_data">
                <h6>Staff</h6>
                {res.staff.map((s) => (
                  <a key={s.id} className="staff-edit search_sub_list_data" href={`/staff/staff-profile-new/${s.id}`}>
                    <p>{s.name}</p>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
        {!loading && res && !has && (
          <div className="search_inner_data text-center pb-0 staff-edit">
            <h6>No Data Found.</h6>
          </div>
        )}
      </div>
    </form>
  );
}

function NotificationMenu({ list, unread, variant, onChange }: { list: Notif[]; unread: number; variant: 'desktop' | 'mobile'; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const markAll = async (e: React.MouseEvent) => {
    e.preventDefault();
    await adminApi.post('/admin/notifications/read-all');
    onChange();
  };
  const markOne = async (e: React.MouseEvent, n: Notif) => {
    e.preventDefault();
    await adminApi.post(`/admin/notifications/${n.id}/read`);
    onChange();
    if (n.action === 'staff_attendance_request') navigate('/attendance/attendance_requests_new');
    else if (n.action === 'staff_leave_request') navigate('/attendance/attendance_leave_new');
  };

  return (
    <div className="profile-main-notification" ref={ref}>
      <div className="notification-toggle" onClick={() => setOpen((o) => !o)}>
        <div className="position-relative">
          <I.I721853 />
          {unread > 0 && <div className="notification_on_icon">{unread}</div>}
        </div>
      </div>
      <div className={`dropdown-content${variant === 'mobile' ? ' dropdown-content-mobile' : ''}${open ? ' active' : ''}`}>
        {list.length > 0 ? (
          <>
            <div className="notification-header d-flex justify-content-between align-items-center p-3 border-bottom">
              <h6 className="mb-0 proxima_nova_bold">Notifications</h6>
              <a href="#" onClick={markAll} className="mark-all-read-btn proxima_nova_semibold text-primary" style={{ fontSize: 13, textDecoration: 'none' }}>
                Mark as all read
              </a>
            </div>
            <ul style={{ paddingLeft: '0px', marginBottom: 0 }}>
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
              <li>
                <div className="notification-text">
                  <a href="/dashboard/notification" className="section_sub_title proxima_nova_bold">
                    See All Notifications
                  </a>
                </div>
              </li>
            </ul>
          </>
        ) : (
          <div className="dropdown-sub-no-notifiy">
            <div>
              <I.I5d8d28 />
            </div>
            <div className="section_title proxima_nova_semibold">No Notifications</div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserMenu({ session, businessId, switchBusiness, logout, mobile }: { session: ReturnType<typeof useAdminSession>['session']; businessId: number | null; switchBusiness: (id: number) => Promise<void>; logout: () => Promise<void>; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const user = session.user;
  const avatar = user.photo ? user.photo : '/assets/admin/images/dummy/dummy-user.svg';
  const name = user.name ? user.name[0].toUpperCase() + user.name.slice(1) : '';
  const initialsOf = (n: string) => {
    const t = n.trim();
    const words = t.split(/\s+/);
    return (words.length > 1 ? words[0][0] + words[1][0] : t.slice(0, 2)).toUpperCase();
  };
  const active = businessId ?? bizStore.get();
  return (
    <div className="user-profile pull-right" ref={ref}>
      <img className="avatar user-thumb" src={avatar} alt="avatar" />
      <div className="dropdown header_user_dropdown">
        <a className="user-name dropdown-toggle text-decoration-none" href="#" role="button" id="dropdownMenuLink" aria-expanded={open} style={{ display: 'flex', alignItems: 'center' }} onClick={(e) => { e.preventDefault(); setOpen((o) => !o); }}>
          <span className="proxima_nova_bold">{name}</span>
          <I.Ie2bcfb />
        </a>
        <ul className={`dropdown-menu dropdown-menu-end p-0 shadow custom-account-dropdown${open ? ' show' : ''}`} aria-labelledby="dropdownMenuLink" {...(open ? { 'data-bs-popper': 'static' } : {})}>
          <div className="account-single-col">
            {!mobile ? (
              <div className="px-3 pt-3 pb-3 d-flex align-items-center border-bottom mb-2">
                <img className="rounded-circle me-3" style={{ width: 40, height: 40, objectFit: 'cover' }} src={avatar} alt="avatar" />
                <div className="d-flex flex-column text-truncate" style={{ maxWidth: 170 }}>
                  <span className="proxima_nova_bold text-dark text-truncate" style={{ fontSize: 15, lineHeight: 1.2 }}>{user.name}</span>
                  <span className="text-muted text-truncate" style={{ fontSize: 13 }}>{user.email ?? user.phone_number}</span>
                </div>
              </div>
            ) : (
              <div className="px-3 pt-3 pb-2">
                <span className="proxima_nova_bold text-dark fs-6" style={{ fontSize: 15 }}>Account</span>
              </div>
            )}
            {!mobile && (
              <div className="px-3">
                <span className="proxima_nova_bold text-dark fs-6" style={{ fontSize: 15 }}>Accounts</span>
              </div>
            )}
            <div className="business-list flex-grow-1 overflow-auto" style={{ maxHeight: 350 }}>
              {session.businesses.map((b) => {
                const isActive = active === b.id;
                return (
                  <a
                    key={b.id}
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      await switchBusiness(b.id);
                      window.location.reload();
                    }}
                    className={`dropdown-item d-flex align-items-center business-item ${isActive ? 'active-business' : ''}`}
                  >
                    <div className="rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: 32, height: 32, backgroundColor: '#fbcfe8', color: '#831843', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {initialsOf(b.name)}
                    </div>
                    <span className="flex-grow-1 text-truncate proxima_nova_semibold text-dark" style={{ fontSize: 14 }}>{b.name}</span>
                    {isActive && <I.I446e55 />}
                  </a>
                );
              })}
            </div>
            <div className="mt-2 border-top">
              <a href="#" onClick={(e) => { e.preventDefault(); void logout(); }} className="dropdown-item d-flex align-items-center px-3 py-3 text-dark custom-logout-btn">
                <I.Ib787f5 />
                <span className={`proxima_nova_semibold${mobile ? '' : ' text-danger'}`} style={{ fontSize: 14 }}>Log out</span>
              </a>
            </div>
          </div>
        </ul>
      </div>
    </div>
  );
}
