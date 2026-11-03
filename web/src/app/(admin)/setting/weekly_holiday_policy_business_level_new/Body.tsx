'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { SwitchLevelOffcanvas, WeeklyLevelHeader } from '@/components/settings/WeeklyLevelHeader';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Body() {
  const q = useAdmin<{ days: number[] }>('/admin/holidays/weekly/business');
  const [days, setDays] = useState<number[]>([]);
  useEffect(() => {
    if (q.data) setDays(q.data.data.days);
  }, [q.data]);
  const save = useAction(() => adminApi.put('/admin/holidays/weekly/business', { days }), { invalidate: ['/admin/holidays/weekly'], success: 'Weekly holidays saved' });
  const toggle = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  return (
    <>
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6 pb-20">
            <BackCrumb title="Weekly Holiday Policy" crumbs={['Settings', 'Holiday / Leave Settings', 'Weekly holiday policy']} />
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
              <WeeklyLevelHeader level="business" />
              <form id="business_holiday_form" onSubmit={(e) => e.preventDefault()}>
                <div className="staff-view-profile-main">
                  <div className="holiday-days">
                    <h2 className="proxima_nova_semibold staff-pay-title">Holiday Days</h2>
                    <div className="shift-main-inner-edit">
                      <div className="shift-inner-sub-label-edit">
                        {DAYS.map((name, i) => (
                          <div className="staff-work-date" key={name}>
                            <input type="checkbox" className="days" id={name.toLowerCase()} checked={days.includes(i)} onChange={() => toggle(i)} />
                            <label htmlFor={name.toLowerCase()} className="staff-setting-holiday section_sub_title">{name}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="flex justify-end pt-4">
              <button
                id="save_weekly_business_holiday"
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover-elevate active-elevate-2 border border-primary-border min-h-10 rounded-md px-8 bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </main>
      <SwitchLevelOffcanvas to="staff" />
    </>
  );
}
