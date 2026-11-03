'use client';

import { useEffect, useRef, useState } from 'react';
import * as I from '@/components/icons';
import { useAdmin, useStaff } from '@/lib/query';
import { BackCrumb } from '@/components/shell/BackCrumb';

interface Day { full_date: string; S: string; W: string; BT: string; B: string }
interface StaffCard { id: number; name: string; department: string | null; photo: string | null; calendar: Day[]; totals: { S: string; W: string; BT: string; B: string } }
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const TITLES: Record<string, string> = { S: 'Scheduled Hours', W: 'Worked Hours', BT: 'Break Time', B: 'Balance' };
const KEYS = ['S', 'W', 'BT', 'B'] as const;
const pad = (n: number) => String(n).padStart(2, '0');
const ym = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function DetailsView({ scope }: { scope: 'admin' | 'staff' }) {
  const now = new Date();
  const [range, setRange] = useState<{ filter?: string; month?: string }>({ month: ym(now) });
  const adminQ = useAdmin<StaffCard[]>(scope === 'admin' ? '/admin/attendance/details' : null, range, { keepPrevious: true });
  const staffQ = useStaff<StaffCard | null>(scope === 'staff' ? '/employee/attendance/details' : null, range, { keepPrevious: true });
  const q = scope === 'admin' ? adminQ : staffQ;
  const meta = q.data as unknown as { title?: string; month?: string } | undefined;
  const raw = q.data?.data;
  const cards: StaffCard[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const active = range.month && !range.filter ? range.month : null;
  const thisMonth = ym(now);
  const lastMonth = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const tab = (label: string, r: { filter?: string; month?: string }) => {
    const on = r.filter ? range.filter === r.filter : !range.filter && range.month === r.month;
    return (
      <a href="#" className={`ajax-link ${on ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setRange(r); }}>{label}</a>
    );
  };

  return (
    <main className="flex-1 p-md-5 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-8 max-w-[1600px] mx-auto">
          {scope === 'staff' && <BackCrumb title="Attendance management" crumbs={['Attendance management', 'Attendance Details']} />}
          <div className="flex-1 p-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
            <div className="flex-none flex justify-between items-center mb-6 px-2">
              <div className="flex items-center gap-4">
                <div className="relative" ref={box}>
                  <button id="date-picker-trigger" className="flex items-center gap-2 text-blue-500 hover:text-blue-700 transition focus:outline-none" onClick={() => { setOpen((o) => !o); setYear(Number(meta?.month?.slice(0, 4)) || now.getFullYear()); }}>
                    <I.I04d51d />
                    <span className="font-medium text-lg" id="header-date-title" style={{ fontSize: '16px' }}>{meta?.title ?? ''}</span>
                    <I.I07788b />
                  </button>
                  <div id="custom-date-picker" className={`absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-50 ${open ? '' : 'hidden'}`} style={{ minWidth: '280px' }}>
                    <div className="flex justify-between items-center mb-4 px-2">
                      <button type="button" className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition" onClick={() => setYear((y) => y - 1)}><I.I63d57c /></button>
                      <span className="font-semibold text-gray-700 text-lg">{year}</span>
                      <button type="button" className={`p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition ${year >= now.getFullYear() ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={year >= now.getFullYear()} onClick={() => setYear((y) => y + 1)}><I.Ic56263 /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {MONTHS.map((m, i) => {
                        if (year > now.getFullYear() || (year === now.getFullYear() && i > now.getMonth())) return null;
                        const v = `${year}-${pad(i + 1)}`;
                        const on = active === v;
                        return (
                          <button key={m} type="button" className={`p-2 text-sm font-medium rounded-lg transition-colors duration-200 w-[30%] flex-grow text-center ${on ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-600 hover:bg-blue-50'}`} onClick={() => { setRange({ month: v }); setOpen(false); }}>{m}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-6 text-sm text-gray-500 font-medium items-center">
                {tab('Today', { filter: 'today' })}
                {tab('This week', { filter: 'this_week' })}
                {tab('Last week', { filter: 'last_week' })}
                {tab('This month', { month: thisMonth })}
                {tab('Last month', { month: lastMonth })}
                {tab('This year', { filter: 'this_year' })}
              </div>
            </div>

            <div className="mb-4">
              <div className="w-full bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg p-4" style={{ backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '0.5rem', padding: '1rem', width: '100%' }}>
                <div className="flex flex-wrap gap-x-8 gap-y-3" style={{ display: 'flex', flexWrap: 'wrap', columnGap: '2rem', rowGap: '0.75rem' }}>
                  {[['S', 'Scheduled Hours'], ['W', 'Worked Hours'], ['BT', 'Break Taken'], ['B', 'Balance Hours']].map(([k, label]) => (
                    <div className="flex items-center gap-2" key={k}>
                      <span className="w-7 h-7 flex items-center justify-center bg-white rounded text-xs font-bold shadow-sm" style={{ color: '#111827', border: '1px solid #DBEAFE' }} title={label}>{k}</span>
                      <span className="text-sm font-semibold text-blue-900">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div id="attendance-card-container" className="flex-1 overflow-auto flex flex-col gap-4 pb-4" style={{ opacity: q.isFetching ? 0.5 : 1 }}>
              {cards.map((c) => (
                <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-1 overflow-hidden min-h-0">
                  <div className="flex-none border-r border-gray-100 flex flex-col bg-white z-20" style={{ width: '20%' }}>
                    <div className="h-16 flex items-center justify-center font-semibold text-gray-700 bg-gray-50/50 border-b border-gray-100">Profile</div>
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
                      <div className="relative mb-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.photo ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=EBF4FF&color=7F9CF5`} className="w-16 h-16 rounded-full object-cover border-2 border-green-500 p-0.5" alt="Profile" />
                      </div>
                      <div className="text-center">
                        <div className="text-blue-500 font-semibold text-base">{c.name}</div>
                        <div className="text-gray-400 text-xs mt-1">{c.department ?? <span style={{ color: 'red' }}>No Department Assigned</span>}</div>
                      </div>
                    </div>
                  </div>
                  <div className="w-40 flex-none border-r border-gray-100 flex flex-col bg-white z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                    <div className="h-16 flex items-center justify-center font-semibold text-gray-700 bg-gray-50/50 border-b border-gray-100">Total</div>
                    <div className="flex-1 flex flex-col justify-center bg-white total-attendance">
                      {KEYS.map((k) => (
                        <div key={k} className="h-12 flex items-center justify-between px-6 text-sm border-b border-gray-50/50 last:border-0 hover:bg-gray-50 transition-colors">
                          <span className="font-medium text-gray-400 w-8" title={TITLES[k]}>{k}</span>
                          <span className={`font-medium ${k === 'B' && c.totals[k].includes('-') ? 'text-red-500' : 'text-gray-600'}`} title={TITLES[k]}>{c.totals[k]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto bg-white custom-scrollbar">
                    <div className="flex min-w-max h-full">
                      {c.calendar.map((d, i) => (
                        <div key={i} className="w-28 flex-none border-r border-gray-50 flex flex-col text-center hover:bg-gray-50/30 transition-colors group">
                          <div className="h-16 flex flex-col items-center justify-center bg-gray-50/50 border-b border-gray-100  group-hover:bg-gray-100/50 transition-colors" style={{ padding: '0px 15px 0px 15px' }}>
                            <span className="text-xs font-semibold text-gray-500 mb-0.5" style={{ width: '40px' }}>{d.full_date}</span>
                          </div>
                          <div className="flex-1 flex flex-col justify-center">
                            {KEYS.map((k) => (
                              <div key={k} className="h-12 flex items-center justify-center text-sm border-b border-gray-50/50 last:border-0 group-hover:bg-gray-50/50 transition-colors" title={TITLES[k]}>
                                {d[k] && <span className={`font-medium ${k === 'B' && d[k].includes('-') ? 'text-red-500' : 'text-gray-400'}`}>{d[k]}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="w-8 flex-none"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
