'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useAdmin } from '@/lib/query';
import { fmtClock, fmtHm, todayStr } from '@/lib/format';
import { SelectClub } from '@/components/ui/SelectClub';

const StaffMap = dynamic(() => import('@/components/widgets/StaffMap'), { ssr: false });

interface Pt { latitude: number; longitude: number; accuracy: number | null; type: string; formatted_time: string | null; time: string | null }
interface AttRow { id: number; full_name: string; photo: string | null; total_seconds: number; break_seconds: number; overtime_seconds: number; punches: { in_time: string | null; out_time: string | null }[] }

const shift = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00`);
  x.setDate(x.getDate() + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const Empty = ({ icon, text }: { icon: string; text: string }) => (
  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
    <i className={`fa ${icon} text-3xl`}></i>
    <p className="text-sm text-center px-4">{text}</p>
  </div>
);

export default function Body() {
  const today = todayStr();
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(today);
  const [applied, setApplied] = useState({ staff: '', date: today });
  const staff = useAdmin<{ id: number; full_name: string }[]>('/admin/staff', { size: 500 }).data?.data ?? [];
  const live = useAdmin<{ staff_id: number; staff_name: string; staff_image: string | null; last_location: Pt }[]>('/admin/locations/live', { date: applied.date });
  const timeline = useAdmin<Pt[]>(applied.staff ? `/admin/locations/staff/${applied.staff}` : null, { date: applied.date });
  const att = useAdmin<AttRow[]>(applied.staff ? '/admin/attendance' : null, { date: applied.date });
  const row = att.data?.data.find((r) => String(r.id) === applied.staff);
  const pts = useMemo(() => timeline.data?.data ?? [], [timeline.data]);
  const selected = staff.find((s) => String(s.id) === applied.staff);
  const mapPoints = applied.staff
    ? pts.length ? [{ latitude: pts[pts.length - 1].latitude, longitude: pts[pts.length - 1].longitude, label: selected?.full_name, sub: pts[pts.length - 1].formatted_time ?? '', highlight: true }] : []
    : (live.data?.data ?? []).map((l) => ({ latitude: l.last_location.latitude, longitude: l.last_location.longitude, label: l.staff_name, sub: l.last_location.formatted_time ?? '' }));
  const apply = () => setApplied({ staff: staffId, date });
  const go = (n: number) => {
    const d = shift(date, n);
    if (d > today) return;
    setDate(d);
    setApplied({ staff: staffId, date: d });
  };
  const fmtT = (t: string | null) => (t ? fmtClock(t) : '--:--');

  return (
    <main className="flex-1 pt-2 pb-2 sm:pt-4 sm:pb-4 md:pt-4 md:pb-4 overflow-y-hidden locations-main">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
        <div className="mx-auto locations-page-wrap w-full">
          <div className="locations-layout bg-white rounded-lg border">
            <div className="locations-filter-bar bg-white border-b border-gray-200 p-2 ">
              <div className="locations-filter-controls rounded-lg  border border-gray-200 text-sm bg-white">
                <div className="locations-staff-select px-3 border-r border-gray-200 flex items-center bg-gray-50 hover:bg-gray-100 transition-colors rounded-l-lg py-0.5 h-full">
                  <i className="fa fa-user text-gray-400 mr-2 shrink-0"></i>
                  <SelectClub id="staff_filter" className="select-club-services border-0 bg-transparent py-2 font-medium focus:ring-0 text-gray-700 w-48 cursor-pointer outline-none" placeholder="Select Staff..." value={staffId} onChange={(_e, v) => { setStaffId(v); }} closeOnEscape>
                    <option value="">Select Staff...</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </SelectClub>
                </div>
                <div className="locations-date-controls flex items-center px-2 bg-white border-r border-gray-200">
                  <button type="button" id="prev_day" className="text-gray-400 hover:text-gray-800 px-3 py-2" onClick={() => go(-1)}><i className="fa fa-chevron-left"></i></button>
                  <input type="date" id="date_filter" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="border-0 text-sm focus:ring-0 py-2 text-center font-bold text-gray-700 w-36 bg-transparent cursor-pointer" />
                  <button type="button" id="next_day" className="text-gray-400 hover:text-gray-800 px-3 py-2" onClick={() => go(1)}><i className="fa fa-chevron-right"></i></button>
                </div>
                <button type="button" id="apply_filter" className="staff-manage-summary-btn locations-apply-btn" onClick={apply}>Apply</button>
              </div>
            </div>
            <div className="locations-body">
              <div className="locations-sidebar bg-white shadow-[2px_0_10px_rgba(0,0,0,0.05)] z-10 flex flex-col h-full shrink-0 border-r border-gray-200">
                {applied.staff && selected && (
                  <div id="sidebar_header_container" className="border-b p-4">
                    <div className="flex items-center gap-3 mb-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={row?.photo ?? '/assets/admin/images/dummy/dummy-user.svg'} className="w-12 h-12 rounded-full border border-gray-300 shadow-sm object-cover" alt="" />
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm mb-0">{selected.full_name}</h3>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5 mb-0"><i className="fa fa-calendar mr-1"></i> {applied.date}</p>
                      </div>
                    </div>
                    <div className="bg-white border rounded-lg shadow-sm p-3 space-y-3 text-xs max-h-48 overflow-y-auto custom-scrollbar " style={{ maxHeight: '80%', overflowX: 'auto' }}>
                      <div className="space-y-2 border-gray-100 pb-2">
                        {(row?.punches.length ? row.punches : [{ in_time: null, out_time: null }]).map((p, i) => (
                          <div key={i} className="flex justify-between items-center pb-2 border-b border-gray-100 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><i className="fa fa-sign-in"></i></div>
                              <div><p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Punch In</p><p className="font-bold text-gray-800 text-sm mb-0">{fmtT(p.in_time)}</p></div>
                            </div>
                            <div className="flex items-center gap-2 text-right">
                              <div className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center"><i className="fa fa-sign-out"></i></div>
                              <div><p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Punch Out</p><p className="font-bold text-gray-800 text-sm mb-0">{fmtT(p.out_time)}</p></div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-center pt-1">
                        <div className="flex-1 border-r border-gray-100"><p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Total</p><p className="font-bold text-gray-700 mb-0">{row?.total_seconds ? fmtHm(row.total_seconds) : '--:--'}</p></div>
                        <div className="flex-1 border-r border-gray-100"><p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Break</p><p className="font-bold text-gray-700 mb-0">{row?.break_seconds ? fmtHm(row.break_seconds) : '--:--'}</p></div>
                        <div className="flex-1"><p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Overtime</p><p className="font-bold text-gray-700 mb-0">{row?.overtime_seconds ? fmtHm(row.overtime_seconds) : '--:--'}</p></div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar" id="timeline_sidebar">
                  {!applied.staff ? (
                    <Empty icon="fa-map-signs" text="Select a staff member to view their timeline." />
                  ) : pts.length === 0 ? (
                    <Empty icon="fa-info-circle" text="No location data found for this date." />
                  ) : (
                    <>
                      <div className="px-1 pt-2"><h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1 border-b border-gray-100 pb-2 mb-2"><i className="fa fa-map-marker mr-1"></i> Location Timeline</h4></div>
                      <div className="pt-0 locations-timeline-list custom-scrollbar" style={{ minHeight: 200, maxHeight: '90%', overflow: 'auto' }}>
                        {pts.map((p, i) => (
                          <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50">
                            <div className="mt-1 w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></div>
                            <div className="text-xs">
                              <p className="font-bold text-gray-700 mb-0">{p.formatted_time}{p.type !== 'tracking' && <span className="ml-2 text-[10px] uppercase text-blue-500">{p.type}</span>}</p>
                              <p className="text-gray-400 mb-0">{p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="locations-map-area flex flex-col bg-[#e5e5e5] relative">
                <div className="locations-map-canvas">
                  <div id="mapdiv" style={{ height: '100%', width: '100%' }}>
                    <StaffMap points={mapPoints} trail={applied.staff ? pts.map((p) => [p.latitude, p.longitude] as [number, number]) : undefined} height="100%" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
