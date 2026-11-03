'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSuper } from '@/lib/query';
import { esc } from '@/lib/bs';
import { fmtDate, fmtHm, fmtTime12, monthStr } from '@/lib/format';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { DataTable } from '@/components/widgets/DataTable';
import { MonthPicker } from '@/components/widgets/MonthPicker';

interface Day { date: string; status: string; first_in: string | null; last_out: string | null; total_seconds: number; break_seconds: number; overtime_seconds: number; behavior: string | null }
interface D {
  staff: { id: number; name: string; phone: string; email: string | null; business: { id: number; name: string }; department: string | null; designation: string | null; photo: string | null; is_deactivated: boolean };
  attendance: { days?: Day[] } | Day[];
  logs: { id: number; detail: string; created_at: string }[];
}
const BADGE: Record<string, string> = { Present: 'bg-success', Absent: 'bg-danger', 'Half Day': 'bg-warning', Holiday: 'bg-info' };

export default function Body() {
  const id = Number(useParams<{ id: string }>().id);
  const [ym, setYm] = useState(monthStr());
  const q = useSuper<D>(`/super-admin/staff/${id}`, { month: ym }, { keepPrevious: true });
  const d = q.data?.data;
  if (!d) return null;
  const days: Day[] = Array.isArray(d.attendance) ? d.attendance : d.attendance.days ?? [];
  const s = d.staff;
  return (
    <main className="flex-1 pb-4 pt-4 overflow-y-auto">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title="View Profile" crumbs={['Staff management', 'Staff profile', 'Attendance']} />
          <div className="staff-profile-main">
            <div className="staff-profile">
              <div className="staff-left-header profile-staff-content">
                <div className="staff-avatar-upload">
                  <div className="staff-avatar-preview">
                    <div className="half-image">{/* eslint-disable-next-line @next/next/no-img-element */}<img id="staff-imagePreview" src={s.photo ?? '/assets/admin/images/dummy/dummy-user.svg'} alt="Image Preview 1" /></div>
                  </div>
                </div>
                <div className="staff-main-header">
                  <div className="staff-profile-names">
                    <div className="flex items-center gap-3">
                      <h2 className="staff-name">{s.name}</h2>
                      {s.is_deactivated ? <span className="px-3 py-1 rounded-full text-xs font-semibold border">Deactive</span> : <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">Active</span>}
                    </div>
                    <p className="staff-user-skill section_sub_title">{s.department ?? '-'}</p>
                    <span className="staff-number section_sub_title">{s.business.name.slice(0, 3)}{s.id}</span>
                  </div>
                </div>
              </div>
              <div className="staff-right-header">
                <div className="staff-profile-details">
                  <div className="staff-profile-num"><h2 className="section_sub_title"> Mobile Number</h2><p className="staff-phone-number">{s.phone}</p></div>
                  <div className="staff-profile-num staff-profile-sec"><h2 className="section_sub_title">Business</h2><p><a href={`/super-admin/business/${s.business.id}`}>{s.business.name}</a></p></div>
                </div>
                <div className="staff-profile-details-sec">
                  <div className="staff-profile-num"><h2 className="section_sub_title">Email</h2><p>{s.email ?? '-'}</p></div>
                  <div className="staff-profile-num staff-profile-sec"><h2 className="section_sub_title">Designation</h2><p>{s.designation ?? '-'}</p></div>
                </div>
              </div>
            </div>
          </div>
          <div className="dashboard_current_day_txt">
            <div className="row"><div className="col-12 text-end"><MonthPicker id="datepicker" className="selected_date attendance_status_month proxima_nova_semibold" value={ym} onChange={setYm} /></div></div>
          </div>
          <div className="approve_staff_data">
            <DataTable
              id="staff_datas"
              deps={[days]}
              head={<tr><th>Date</th><th>In Time</th><th>Out Time</th><th>Break Time</th><th>Work Time</th><th>Status</th><th>Overtime</th></tr>}
              options={() => ({
                data: [...days].reverse(), searching: false, lengthChange: false, info: false, responsive: true, order: [],
                columns: [
                  { data: 'date', render: (v: string) => fmtDate(v) },
                  { data: 'first_in', render: (v: string | null) => (v ? fmtTime12(v) : '-') },
                  { data: 'last_out', render: (v: string | null) => (v ? fmtTime12(v) : '-') },
                  { data: 'break_seconds', render: (v: number) => (v ? fmtHm(v) : '00:00') },
                  { data: 'total_seconds', render: (v: number) => (v ? fmtHm(v) : '00:00') },
                  { data: 'status', render: (v: string) => `<span class="badge ${BADGE[v] ?? 'bg-secondary'}">${esc(v)}</span>` },
                  { data: 'overtime_seconds', render: (v: number) => (v ? fmtHm(v) : '-') },
                ],
              })}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
