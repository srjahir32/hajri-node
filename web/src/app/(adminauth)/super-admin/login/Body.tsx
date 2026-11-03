'use client';

import { Css } from '@/components/ui/Css';
import { useState } from 'react';
import { superApi, tokens } from '@/lib/api';
import { toast } from '@/lib/toast';
import '@/styles/super-admin-login.css';
import { navigate } from '@/lib/navigate';

export default function Body() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Enter your email and password');
    setBusy(true);
    try {
      const res = await superApi.post<{ token: string }>('/auth/super-admin/login', { email, password });
      tokens.set('super', res.data.token);
      navigate('/super-admin/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
      setBusy(false);
    }
  };
  return (
    <>
      <Css hrefs={['sidebar.css']} />
    <div className="landing-main-sections">
      <div className="main-header">
        <div className="container main-inner-header">
          <div className="row">
            <div className="col-12">
              <a href="/super-admin/login">
                <img className="img-responsive logo_img " src="/assets/admin/images/sidebar/logo.svg" alt="User picture" />
                <span className="logo_txt">Hajri</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="landing-main-section">
        <div className="container">
          <div className="hajri-signup">
            <div className="left-main-landing">
              <div className="landing-left-main-text">
                <h2 className="manage-hajri proxima_nova_bold">Hajri Super Admin Portal</h2>
                <p className="manage-sub-text proxima_nova_regular section_title manage_staff_attent_con">Manage registered businesses, oversee subscription plans, track overall platform metrics, and control system-wide settings.</p>
              </div>
              <div className="landing-left-section">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/admin/images/login/left-image.png" alt="" />
              </div>
            </div>
            <div className="hajri-left-right landing-right">
              <div className="hajri-main-right hajri-main-landing-right">
                <form id="super-admin-form" onSubmit={submit}>
                  <div className="hajri-right" id="step-1">
                    <div className="hajri-right-main-logo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/assets/admin/images/login/icon2.svg" alt="" />
                    </div>
                    <div className="hajri-right-text">
                      <h1 className="hajri-right-title proxima_nova_semibold">Super Admin</h1>
                      <p className="hajri-right-con proxima_nova_semibold">Enter your credentials</p>
                    </div>
                    <div className="hajri-phone-number" id="edit-mobile">
                      <div className="form-group" id="email-group">
                        <label htmlFor="super_admin_email" className="form-label phone-field">Email</label>
                        <input type="email" id="super_admin_email" className="form-control phone_input" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </div>
                      <div className="form-group mt-2" id="password-group">
                        <label htmlFor="super_admin_password" className="form-label phone-field">Password</label>
                        <input type="password" id="super_admin_password" className="form-control phone_input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                      </div>
                    </div>
                    <div className="hajri-form-btn">
                      <button type="submit" id="super-admin-login-btn" className="hajri-submit-btnss" disabled={busy}>Login</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
