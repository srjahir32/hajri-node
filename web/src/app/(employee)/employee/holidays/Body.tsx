'use client';

import { useState } from 'react';
import { useStaff } from '@/lib/query';

interface Policy { id: number; name: string; year: number; holidays: { id: number; name: string; date: string }[] }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n: number) => String(n).padStart(2, '0');
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Body() {
  const q = useStaff<Policy[]>('/employee/holidays');
  const weekly = ((q.data as unknown as { weekly_holiday_days?: number[] })?.weekly_holiday_days ?? []).map(Number);
  const holidays = (q.data?.data ?? []).flatMap((p) => p.holidays);
  const today = new Date();
  const [cur, setCur] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const first = new Date(cur.y, cur.m, 1).getDay();
  const dim = new Date(cur.y, cur.m + 1, 0).getDate();
  const prevDim = new Date(cur.y, cur.m, 0).getDate();
  const step = (n: number) => setCur((c) => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const total = first + dim;
  const after = total % 7 === 0 ? 0 : 7 - (total % 7);
  const year = today.getFullYear();
  const list = holidays.filter((h) => h.date.startsWith(String(year))).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <main className="flex-1 p-lg-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="holiday-page-container">
          <div className="section-header"><h1 className="page-title">Holidays &amp; Events</h1></div>
          <div className="calendar-wrapper">
            <div className="calendar-header">
              <h2 className="month-year-label" id="monthYear">{MONTHS[cur.m]} {cur.y}</h2>
              <div className="calendar-nav">
                <button className="nav-btn" id="prevMonthBtn" onClick={() => step(-1)}><i className="fa fa-arrow-left"></i> Previous Month</button>
                <button className="nav-btn" id="todayBtn" onClick={() => setCur({ y: today.getFullYear(), m: today.getMonth() })}>This Month</button>
                <button className="nav-btn" id="nextMonthBtn" onClick={() => step(1)}>Next Month <i className="fa fa-arrow-right"></i></button>
              </div>
            </div>
            <div className="calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div className="day-header" key={d}>{d}</div>)}
              {Array.from({ length: first }, (_, i) => <div className="day-cell other-month" key={`p${i}`}><div className="day-number">{prevDim - first + i + 1}</div></div>)}
              {Array.from({ length: dim }, (_, i) => {
                const day = i + 1;
                const ds = `${cur.y}-${pad(cur.m + 1)}-${pad(day)}`;
                const isToday = day === today.getDate() && cur.m === today.getMonth() && cur.y === today.getFullYear();
                return (
                  <div className={`day-cell ${isToday ? 'current-day' : ''}`} key={day}>
                    <div className="day-number">{day}</div>
                    {holidays.filter((h) => h.date === ds).map((h) => <div className="event-badge" title={h.name} key={h.id}>{h.name}</div>)}
                    {weekly.includes(new Date(cur.y, cur.m, day).getDay()) && <div className="event-badge weekly-holiday-badge" title="Weekly Holiday">Weekend</div>}
                  </div>
                );
              })}
              {Array.from({ length: after }, (_, i) => <div className="day-cell other-month" key={`n${i}`}><div className="day-number">{i + 1}</div></div>)}
            </div>
          </div>
          <div className="policy-list-wrapper">
            <h3 className="policy-header">Holiday Lists - {year}</h3>
            <div className="policy-items">
              {list.length ? list.map((h) => {
                const d = new Date(`${h.date}T00:00:00`);
                return (
                  <div className="policy-item" key={h.id}>
                    <div className="policy-date">{pad(d.getDate())} {MONTHS[d.getMonth()].slice(0, 3)} {d.getFullYear()}</div>
                    <div className="policy-name">{h.name}</div>
                    <div className="policy-day">{DOW[d.getDay()]}</div>
                  </div>
                );
              }) : <div className="policy-item"><div className="policy-name text-muted">No holidays found for this policy.</div></div>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
