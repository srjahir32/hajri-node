'use client';

import * as I from '@/components/icons';
import { useAdmin } from '@/lib/query';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { SwitchLevelOffcanvas, WeeklyLevelHeader } from '@/components/settings/WeeklyLevelHeader';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
interface Row { id: number; name: string; days: number[] }

export default function Body() {
  const staff = useAdmin<Row[]>('/admin/holidays/weekly/staff').data?.data ?? [];
  return (
    <>
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-6 pb-20">
            <BackCrumb title="Weekly Holiday Policy" crumbs={['Settings', 'Holiday / Leave Settings', 'Weekly holiday policy']} />
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
              <WeeklyLevelHeader level="staff" />
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="staff-view-profile-main">
                  <div className="holiday-days">
                    <h2 className="proxima_nova_semibold staff-pay-title mb-0">Holiday Days</h2>
                    {DAYS.map((name, d) => {
                      const on = staff.filter((s) => s.days.includes(d));
                      const href = `/setting/weekly_holiday_policy_staff_manage?day=${d}`;
                      return (
                        <div className="holiday_days_accordian" key={name}>
                          <div className="holiday-datastaff row">
                            <div className="holidayexpand section_sub_title col-sm-4 holiday_staff_level_day" data-bs-toggle="collapse" data-bs-target={`#${name.toLowerCase()}dropdown`} aria-expanded="false" aria-controls={`${name.toLowerCase()}dropdown`}>
                              {name}
                            </div>
                            <div className="col-sm-4 holiday_staff_level_day text-center">
                              <p className="business-manager-count">{on.length ? `${on.length} Assigned` : 'Not Assigned'}</p>
                            </div>
                            <div className="col-sm-4 holiday_staff_level_day text-end">
                              <a href={href}>
                                <I.Iaddd28 />
                              </a>
                            </div>
                          </div>
                          <div className="collapse" id={`${name.toLowerCase()}dropdown`}>
                            <div className="colspan-data-more">
                              {on.slice(0, 10).map((s) => `${s.name}, `)}
                              <a href={href} className="more-data">{on.length > 10 && '10+ more.'}</a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      <SwitchLevelOffcanvas to="business" />
    </>
  );
}
