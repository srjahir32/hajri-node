'use client';

import { useEffect, useState } from 'react';
import { staffApi } from '@/lib/api';
import { useStaffSession } from '@/lib/auth';
import { useAction, useStaff } from '@/lib/query';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { PRIMARY_BTN } from '@/components/settings/SettingsCard';
import { DatePicker } from '@/components/widgets/DatePicker';
import { SelectClub } from '@/components/ui/SelectClub';
import { navigate } from '@/lib/navigate';

interface Details { date_of_birth: string | null; gender: string | null; address1: string | null; address2: string | null; city: string | null; state: string | null; pincode: string | null }
const Star = () => <i className="fa-solid fa-star-of-life text-danger fa-2xs"></i>;

export default function Body() {
  const { staff, refresh } = useStaffSession();
  const det = useStaff<Details>('/employee/profile/details').data?.data;
  const tzs = useStaff<{ timezone: string; display: string }[]>('/auth/reference/timezones').data?.data ?? [];
  const [f, setF] = useState<Record<string, string>>({ name: staff.name ?? '', last_name: staff.last_name ?? '', middle_name: staff.middle_name ?? '', email: staff.email ?? '', dob: '', gender: '', address1: '', address2: '', city: '', state: '', pincode: '', timezone: staff.timezone ?? '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  useEffect(() => {
    if (det) setF((c) => ({ ...c, dob: det.date_of_birth ?? '', gender: det.gender ?? '', address1: det.address1 ?? '', address2: det.address2 ?? '', city: det.city ?? '', state: det.state ?? '', pincode: det.pincode ?? '' }));
  }, [det]);
  const set = (k: string) => (e: { target: { value: string } }) => setF((c) => ({ ...c, [k]: e.target.value }));
  const save = useAction(
    () => staffApi.put('/employee/profile', { name: f.name.trim(), middle_name: f.middle_name, last_name: f.last_name, email: staff.email ? undefined : f.email, timezone: f.timezone || undefined, date_of_birth: f.dob || null, gender: f.gender, address1: f.address1, address2: f.address2, city: f.city, state: f.state, pincode: f.pincode }),
    { success: 'Profile updated successfully', invalidate: ['/employee/profile'], onSuccess: () => { refresh(); window.setTimeout(() => (navigate('/employee/dashboard')), 900); } },
  );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.name.trim()) er.name = 'First name is required';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email';
    setErrs(er);
    if (!Object.keys(er).length) save.mutate();
  };
  const Err = ({ k }: { k: string }) => (errs[k] ? <span className="error error_message proxima_nova_semibold">{errs[k]}</span> : null);
  const row = (a: React.ReactNode, b: React.ReactNode) => <div className="shift-main-inner-edit">{a}{b}</div>;
  const field = (label: React.ReactNode, input: React.ReactNode) => <div className="shift-inner-sub-label-edit"><label className="shift-type-label">{label}</label>{input}</div>;
  const inp = (k: string, ph: string, extra: Record<string, unknown> = {}) => <input type="text" className="form-control shift-edit-input" placeholder={ph} value={f[k]} onChange={set(k)} {...extra} />;
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title="Personal Info" crumbs={['Dashboard', 'Personal Info']} />
          <div className="staff-view-profile-main">
            <div id="profile-step">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                <form id="staff_personal_info" onSubmit={submit}>
                  <h2 className="proxima_nova_semibold staff-pay-title mt-0">Personal Information</h2>
                  {row(field(<>First Name <Star /></>, <>{inp('name', 'Enter your first name')}<Err k="name" /></>), field(<>Last Name <Star /></>, inp('last_name', 'Enter your last name')))}
                  {row(field(<>Middle Name</>, inp('middle_name', 'Enter your middle name')), field(<>Phone Number <Star /></>, <input type="text" className="form-control shift-edit-input" value={staff.phone_number} readOnly />))}
                  {row(field(<>Email</>, <>{inp('email', 'Enter your email', staff.email ? { readOnly: true } : {})}<Err k="email" /></>), field('Date of Birth', <DatePicker id="date_of_birth" className="input-group-addon form-control shift-edit-input calender-picker view_profile_date_ofbirth" format="dd M yyyy" max={new Date().toISOString().slice(0, 10)} value={f.dob} onChange={(d) => setF((c) => ({ ...c, dob: d }))} />))}
                  {row(
                    field('Gender', <div className="filters staff_attendance" id="gender_error"><SelectClub className="form-select create-select section_sub_title select-club-services" id="gender" name="gender" value={f.gender} onChange={(_e, v) => setF((c) => ({ ...c, gender: v }))}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></SelectClub></div>),
                    field('Address 1', inp('address1', 'Enter address')),
                  )}
                  {row(field('City', inp('city', 'Enter city')), field('Address 2 (Optional)', inp('address2', 'Enter address')))}
                  {row(field('State', inp('state', 'Enter state')), field('Pincode', inp('pincode', 'Enter pincode', { maxLength: 8 })))}
                  {row(
                    field('Time Zone', <select className="form-select" value={f.timezone} onChange={set('timezone')}><option value="">Business default</option>{tzs.map((t) => <option key={t.timezone} value={t.timezone}>{t.display}</option>)}</select>),
                    <div className="shift-inner-sub-label-edit" />,
                  )}
                  <div className="flex justify-end pt-4">
                    <button type="submit" id="staff_step1_btn" className={PRIMARY_BTN} disabled={save.isPending}>Save</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
