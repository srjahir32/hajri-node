'use client';

import { staffApi } from '@/lib/api';
import { useAction, useStaff } from '@/lib/query';
import { timeAgo } from '@/lib/format';
import { BackCrumb } from '@/components/shell/BackCrumb';

interface N { id: number; title?: string | null; message: string | null; read: boolean; created_at: string }

export default function Body() {
  const q = useStaff<N[]>('/employee/notifications', { size: 100 });
  const list = q.data?.data ?? [];
  const read = useAction((id: number) => staffApi.post(`/employee/notifications/${id}/read`), { invalidate: ['/employee/notifications'], success: false });
  const readAll = useAction(() => staffApi.post('/employee/notifications/read-all'), { invalidate: ['/employee/notifications'], success: 'All notifications marked as read' });
  return (
    <main className="flex-1 p-md-5 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-8 max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between">
            <BackCrumb title="All Notifications" crumbs={[]} />
            {list.some((n) => !n.read) && <button className="btn btn-sm btn-outline-primary" onClick={() => readAll.mutate()}>Mark all as read</button>}
          </div>
          <div className="card">
            <div className="card-body p-0">
              {list.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {list.map((n) => (
                    <li className="list-group-item" key={n.id}>
                      <a href="#" onClick={(e) => { e.preventDefault(); if (!n.read) read.mutate(n.id); }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="notification-text">
                            <p className="noti-main-text proxima_nova_semibold mb-1">{n.message ?? n.title}</p>
                            <small className="text-muted">{timeAgo(n.created_at)}</small>
                          </div>
                          {!n.read && <span className="badge bg-primary rounded-pill">New</span>}
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center py-5">
                  <div className="mb-6">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/admin/images/staff_manage/no_data.svg" alt="No Notifications" /></div>
                  <h5 className="proxima_nova_semibold text-2xl text-gray-500 mb-0">No Notifications Found</h5>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
