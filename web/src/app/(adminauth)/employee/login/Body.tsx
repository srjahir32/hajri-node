'use client';

import { Css } from '@/components/ui/Css';
import { useState } from 'react';
import { PhoneOtp, type VerifiedSession } from '@/components/auth/PhoneOtp';
import { staffApi, tokens } from '@/lib/api';
import { toast } from '@/lib/toast';
import '@/styles/employee-login.css';
import { navigate } from '@/lib/navigate';

export default function Body() {
  const [staffs, setStaffs] = useState<NonNullable<VerifiedSession['staffs']> | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = async (id: number) => {
    setBusy(true);
    try {
      const res = await staffApi.post<{ token: string }>('/auth/staff/select-business', { staff_id: id });
      tokens.set('staff', res.data.token);
      toast.success('You are logged in successfully.');
      navigate('/employee/dashboard');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Login failed');
      setBusy(false);
    }
  };
  const verified = (s: VerifiedSession) => {
    const raw = (Array.isArray(s) ? s : s.staffs ?? []) as { id?: number; staff_id?: number; name?: string; business_name?: string; business?: { name?: string } }[];
    const list = raw.map((x) => ({ id: (x.staff_id ?? x.id) as number, name: x.name ?? '', business_name: x.business_name ?? x.business?.name }));
    if (list.length === 1) void choose(list[0].id);
    else if (list.length > 1) { setStaffs(list); setPick(list[0].id); }
    else toast.error('No staff account found for this number');
  };

  return (
    <>
      <Css hrefs={['sidebar.css']} />
    <div className="landing-main-sections">
      <div className="main-header">
        <div className="container main-inner-header">
          <div className="row align-items-center">
            <div className="col-6 d-flex align-items-center">
              <a href="/employee/login" className="d-flex align-items-center text-decoration-none">
                <img className="img-responsive logo_img " src="/assets/admin/images/sidebar/logo.svg" alt="User picture" />
                <span className="logo_txt">Hajri</span>
              </a>
            </div>
            <div className="col-6 d-flex justify-content-end align-items-center">
              <a href="/" className="admin-button">Admin Login</a>
            </div>
          </div>
        </div>
      </div>
      <div className="landing-main-section">
        <div className="container">
          <div className="hajri-signup">
            <div className="left-main-landing">
              <div className="landing-left-main-text">
                <h2 className="manage-hajri proxima_nova_bold">Attendance Through Monitoring App</h2>
                <p className="manage-sub-text proxima_nova_regular section_title manage_staff_attent_con">Manage your staff attendance, salary details and compliances in few clicks + attendance based with punch in and punch out.</p>
              </div>
              <div className="landing-left-section">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/admin/images/login/left-image.png" alt="" />
              </div>
            </div>
            <div className="hajri-left-right landing-right">
              <div className="hajri-main-right hajri-main-landing-right">
                {!staffs ? (
                  <PhoneOtp variant="staff" title="Staff Details" subtitle="Enter your mobile number" phoneButton="Login" onVerified={verified} />
                ) : (
                  <div className="hajri-set-business">
                    <div className="hajri-right-text">
                      <h1 className="hajri-right-title proxima_nova_semibold">Select Business</h1>
                      <p className="hajri-right-con proxima_nova_semibold">You are part of more than one business</p>
                      {staffs.map((s) => (
                        <div className="form-check mb-2" key={s.id}>
                          <input className="form-check-input" type="radio" name="staff_id" id={`b${s.id}`} checked={pick === s.id} onChange={() => setPick(s.id)} />
                          <label className="form-check-label" htmlFor={`b${s.id}`}>{s.business_name ?? s.name}</label>
                        </div>
                      ))}
                    </div>
                    <div className="hajri-form-btn form-btn-set-business-btn">
                      <button type="button" className="hajri-submit-btn-submit business-button" disabled={busy || pick == null} onClick={() => pick != null && void choose(pick)}>Submit</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
