'use client';

import * as I from '@/components/icons';
import { showOffcanvas } from '@/lib/bs';
import { navigate } from '@/lib/navigate';

/** "Weekly Off Preference" intro + Business Level / Staff Level switch shared by the two weekly-holiday views. */
export function WeeklyLevelHeader({ level }: { level: 'business' | 'staff' }) {
  const business = level === 'business';
  return (
    <>
      <div className="weekly-top-nots">
        <h2 className="proxima_nova_semibold">Weekly Holidays Policy</h2>
        <p>Assign weekly off days of your business to automatically mark attendance for those days</p>
      </div>
      <div className="leavel-data">
        <div className={business ? undefined : 'level-data-sub weekly_off_preference_txt'}>
          <h2 className={`proxima_nova_semibold section_sub_title${business ? '' : ' mb-0 pe-2'}`}>Weekly Off Preference</h2>
        </div>
        <div>
          <p>{business ? 'Choose if you wish to keep same holidays for all your staff or different' : '(Choose if you wish to keep same holidays for all your staff or different)'}</p>
        </div>
        <div className="leavel-btn">
          {business ? (
            <>
              <button className="business-level proxima_nova_semibold level-active">Business Level</button>
              <button type="button" className="staff-level proxima_nova_semibold" onClick={() => void showOffcanvas('create-toggle-right')}>Staff Level</button>
            </>
          ) : (
            <>
              <button className="business-level proxima_nova_semibold" onClick={() => void showOffcanvas('create-toggle-right')}>Business Level</button>
              <button type="button" className="staff-level proxima_nova_semibold level-active">Staff Level</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** The "Switch to … level?" offcanvas. */
export function SwitchLevelOffcanvas({ to }: { to: 'business' | 'staff' }) {
  const staff = to === 'staff';
  return (
    <div className="offcanvas offcanvas-end daily-work-data-download" tabIndex={-1} id="create-toggle-right" data-bs-scroll="true">
      <div className="offcanvas-header">
        <div className="popup-close-btns" data-bs-dismiss="offcanvas" aria-label="Close">
          <I.I9dae93 />
        </div>
      </div>
      <div className="offcanvas-body overflow-auto">
        <h5 className="section_title_heading proxima_nova_bold download-work-main-header filter-title-main">{staff ? 'Switch to Staff level?' : 'Switch to Business level?'}</h5>
        <hr />
        <div className="filter-sub-sec">
          <form className={staff ? 'switch_staff_level_form' : 'switch_business_level_form'} onSubmit={(e) => e.preventDefault()}>
            <div className={staff ? 'daily-work-select business_swith_staff' : 'daily-work-select'}>
              <h2 className="holiday-staff-select  proxima_nova_semibold">Your current weekly off setting will be removed.</h2>
            </div>
          </form>
          <div className="download-cancel-btns-main">
            <div className="holiday-data-save-btn">
              <button className="continue_btn download-btn proxima_nova_semibold w-100" onClick={() => (navigate(staff ? '/setting/weekly_holiday_policy_staff_level' : '/setting/weekly_holiday_policy_business_level_new'))}>Continue</button>
              <button className="cancel-btn-btn proxima_nova_semibold w-100" data-bs-dismiss="offcanvas" aria-label="Close">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
