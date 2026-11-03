'use client';

import { Fragment } from 'react';
import * as I from '@/components/icons';
import { useEffect, useState } from 'react';
import { adminApi, tokens, business, ApiError } from '@/lib/api';
import { toast } from '@/lib/toast';
import { PhoneOtp, finishAdminLogin } from '@/components/auth/PhoneOtp';
import '@/styles/a-admin-login.css';
import { navigate } from '@/lib/navigate';

interface Country { id: number; name: string }
const DURATIONS = [{ value: 'daily', label: 'Daily' }, { value: 'hourly', label: 'Hourly' }];

export default function Body() {
  const [step, setStep] = useState(1);
  const [countries, setCountries] = useState<Country[]>([]);
  const [busy, setBusy] = useState(false);
  const [durOpen, setDurOpen] = useState(false);
  const [f, setF] = useState<Record<string, string>>({ shift_hour: '08:30', shift_name: '', salary_duration: '' });
  const set = (k: string) => (e: { target: { value: string } }) => setF((c) => ({ ...c, [k]: e.target.value }));

  useEffect(() => {
    adminApi.get<Country[]>('/auth/reference/countries').then((r) => setCountries(r.data)).catch(() => {});
    // verified earlier but business not created yet -> continue at step 2
    if (!tokens.get('admin')) return;
    adminApi.get<{ is_register: boolean }>('/auth/admin/me').then((r) => (r.data.is_register ? (navigate('/dashboard-new')) : setStep(2))).catch(() => tokens.clear('admin'));
  }, []);

  const next2 = () => {
    for (const [k, label] of [['name', 'Your Name'], ['business_name', 'Business Name'], ['email', 'Email ID'], ['business_address', 'Business Address']] as const) {
      if (!f[k]?.trim()) return toast.error(`${label} is required`);
    }
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return toast.error('Enter a valid email');
    setStep(3);
  };
  const finish = async () => {
    if (!f.shift_name?.trim()) return toast.error('Shift name is required');
    if (!f.salary_duration) return toast.error('Select salary duration');
    const [h, m] = (f.shift_hour || '08:30').split(':').map(Number);
    setBusy(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await adminApi.post<{ business?: { id: number }; id?: number }>('/auth/admin/register-business', {
        name: f.name, email: f.email, business_name: f.business_name, business_address: f.business_address,
        street: f.street || undefined, city: f.city || undefined, state: f.state || undefined,
        country_id: f.country_id ? Number(f.country_id) : undefined,
        salary_duration: f.salary_duration, shift_hour: h + m / 60, shift_name: f.shift_name, timezone: tz,
      });
      const b = res.data.business?.id ?? res.data.id;
      if (b) business.set(b);
      navigate('/dashboard-new');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };
  const tabs = (i: number, on: string) => (i < step ? on : '');
  return (
    <>

    <div className="">
        <div className="hajri-signup">
            <div className="hajri-left-bg">
                <div className="hajri-main-logo">

                    <img className="img-responsive logo_img " src={"/assets/admin/images/sidebar/logo.svg"} alt="User picture" /><span className="logo_txt">Hajri</span>
                </div>
                <div className="hajri-steps">
                    <div className="navigation_menu" id="navigation_menu">
                        <ul className="navigation_tabs" id="navigation_tabs">
                            <li className={tabs(0, "tab_active")}>
                                <div className="nav-active">
                                    <h2 className="nav-tab-title proxima_nova_semibold">Your details</h2>
                                    <span className="nav-tab-des">Enter your mobile number.</span>
                                </div>
                            </li>
                            <li className={tabs(1, "tab_active")}>
                                <div className="nav-active">
                                    <h2 className="nav-tab-title proxima_nova_semibold">Business information</h2>
                                    <span className="nav-tab-des">One step away to move your business online.</span>
                                </div>
                            </li>
                            <li className={tabs(2, "tab_active")}>
                                <div className="nav-active">
                                    <h2 className="nav-tab-title proxima_nova_semibold">Salary structure</h2>
                                    <span className="nav-tab-des">Define salary calculation method & working hours.</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div className="navigation_menu_mobile" id="navigation_menu">
                        <ul className="navigation_tabs" id="navigation_tabs_mobile">
                            <li className={tabs(0, "tab_actives")}>
                                <div className="nav-active">
                                    <h2 className="nav-tab-title proxima_nova_semibold">Your details</h2>
                                </div>
                            </li>
                            <li className={tabs(1, "tab_actives")}>
                                <div className="nav-active">
                                    <h2 className="nav-tab-title proxima_nova_semibold">Business information</h2>
                                </div>
                            </li>
                            <li className={tabs(2, "tab_actives")}>
                                <div className="nav-active">
                                    <h2 className="nav-tab-title proxima_nova_semibold">Salary structure</h2>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="hajri-main-footer">
                    <h2 className="footer-title proxima_nova_bold">Hajri<span className="footer-title-sub">.app</span></h2>
                    <p className="footer-content proxima_nova_semibold">Seamless Solutions for Workforce Management</p>
                    <div className="footer-inner-sec">
                        <p className="footer-number proxima_nova_semibold">+91 8460460916</p>
                        <p className="footer-email proxima_nova_semibold">hajri.app@gmail.com</p>
                    </div>
                </div>
            </div>
            <div className="hajri-left-right">
                <div className="hajri-main-right">
                    <div id="mobile-form">
                        
                        <input type="hidden" id="user_id" name="user_id" />
                        <div style={{ display: step === 1 ? '' : 'none' }}><PhoneOtp onVerified={(x) => (x.is_register ? finishAdminLogin(x) : (tokens.set('admin', x.token), setStep(2)))} title="Your Details" subtitle="Provide your mobile number" phoneButton="Submit" contactHref="mailto:hi@hajri.app" /></div>
                        <div className="hajri-right step" id="step-2" style={{ display: step === 2 ? 'block' : 'none' }}>
                            <div className="hajri-right-main-logo">
                                <img src={"/assets/admin/images/login/business.svg"} alt="" />
                            </div>
                            <div className="hajri-right-text">
                                <h1 className="hajri-right-title proxima_nova_semibold">Business Information</h1>
                                <p className="hajri-right-con proxima_nova_semibold">One step away to move your business online</p>
                                <div className="hajri-busi-field row mx-0">
                                    <div className="col-md-6 px-2">
                                        <div className="form-group">
                                            <label htmlFor="exampleInputPassword1" className="form-label business-info-field">Your Name <i className="fa-solid fa-star-of-life text-danger fa-2xs" style={{ fontSize: "6px", marginTop: "8px" }}></i></label>
                                            <div className="input_form-fields">
                                                <input type="text" className="form-control input-field-form" placeholder="Your Name" id="name" name="name" value={f.name ?? ''} onChange={set('name')} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6 px-2">
                                        <div className="form-group">
                                            <label htmlFor="exampleInputPassword1" className="form-label business-info-field">Business Name <i className="fa-solid fa-star-of-life text-danger fa-2xs" style={{ fontSize: "6px", marginTop: "8px" }}></i></label>
                                            <div className="input_form-fields">
                                                <input type="text" className="form-control input-field-form" placeholder="Enter business name" id="business_name" name="business_name" value={f.business_name ?? ''} onChange={set('business_name')} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6 px-2">
                                        <div className="form-group">
                                            <label htmlFor="exampleInputPassword1" className="form-label business-info-field">Email ID <i className="fa-solid fa-star-of-life text-danger fa-2xs" style={{ fontSize: "6px", marginTop: "8px" }}></i></label>
                                            <div className="input_form-fields">
                                                <input type="email" className="form-control input-field-form" placeholder="Enter email address" id="email" name="email" value={f.email ?? ''} onChange={set('email')} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6 px-2">
                                        <div className="form-group">
                                            <label htmlFor="exampleInputPassword1" className="form-label business-info-field">Business Address <i className="fa-solid fa-star-of-life text-danger fa-2xs" style={{ fontSize: "6px", marginTop: "8px" }}></i></label>
                                            <div className="input_form-fields">
                                                <input type="text" className="form-control input-field-form" placeholder="Enter business address" id="business_address" name="business_address" autoComplete="off" value={f.business_address ?? ''} onChange={set('business_address')} />
                                                <input type="hidden" name="latitude" id="latitude" defaultValue="" />
                                                <input type="hidden" name="longitude" id="longitude" defaultValue="" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-6 px-2">
                                        <div className="form-group">
                                            <label className="form-label business-info-field">Street</label>
                                            <div className="input_form-fields">
                                                <input type="text" className="form-control input-field-form" placeholder="Enter street" id="street" name="street" value={f.street ?? ''} onChange={set('street')} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6 px-2">
                                        <div className="form-group">
                                            <label className="form-label business-info-field">City</label>
                                            <div className="input_form-fields">
                                                <input type="text" className="form-control input-field-form" placeholder="Enter city" id="city" name="city" value={f.city ?? ''} onChange={set('city')} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6 px-2">
                                        <div className="form-group">
                                            <label className="form-label business-info-field">State</label>
                                            <div className="input_form-fields">
                                                <input type="text" className="form-control input-field-form" placeholder="Enter state" id="state" name="state" value={f.state ?? ''} onChange={set('state')} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6 px-2">
                                        <div className="form-group">
                                            <label className="form-label business-info-field">Country</label>
                                            <div className="input_form-fields">
                                                <select className="form-select select2 input-field-form" id="country_id" name="country_id" style={{ width: "100%" }} value={f.country_id ?? ''} onChange={set('country_id')}>
                                                    <option value="">Select Country</option>
                                                    {(countries ?? []).map((country, _i1) => (<Fragment key={_i1}>
                                                        <option value={(country.id)}>{(country.name)}</option>
                                                    </Fragment>))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="hajri-form-btn">
                                    <button type="button" name="" className="hajri-continue-btn hajri-submit-btn step-2-continue-button" onClick={next2}>Continue</button>
                                </div>
                            </div>
                        </div>
                        <div className="hajri-right step" id="step-3" style={{ display: step === 3 ? 'block' : 'none' }}>
                            <div className="hajri-right-inner d-none">
                                <div className="hajri-right-main-logo">
                                    <img src={"/assets/admin/images/login/salary.svg"} alt="" />
                                </div>
                                <div className="hajri-right-text">
                                    <div className="hajri-main-con">
                                        <h1 className="hajri-right-title hajri-step-3-title proxima_nova_semibold">How do you pay your salary?</h1>
                                        <p className="hajri-right-con hajri-step-3-con proxima_nova_semibold">Define salary calculation method & working hours</p>
                                    </div>
                                    <div className="hajri-salary-field">
                                        <div className="hajri-salary-pay-main">
                                            <div className="hajri-salary-pay-inner">
                                                <div className="salary-main-box">
                                                    <div className="salary-inner-input">
                                                        <input type="radio" name="salary_calculation" defaultValue="month" />
                                                    </div>
                                                    <div className="salary-inner-label">
                                                        <label className="radio-button-container proxima_nova_semibold">Total days in month :</label>
                                                        <p className="salary-date">Ex : January - 31 days, February - 28 days</p>
                                                        <span className="salary-days">Salary/day = total salary / 30</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="hajri-salary-pay-main salary_pay_gap">
                                            <div className="hajri-salary-pay-inner">
                                                <div className="salary-main-box">
                                                    <div className="salary-inner-input">
                                                        <input type="radio" name="salary_calculation" defaultValue="calculate" />
                                                    </div>
                                                    <div className="salary-inner-label">
                                                        <label className="radio-button-container proxima_nova_semibold">Calculate 30 days for each month :</label>
                                                        <p className="salary-date">Ex : January - 30 days, February - 30 days</p>
                                                        <span className="salary-days">(Per day salary = Salary/No. of daysin month)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="hajri-salary-pay-main salary_pay_gap">
                                            <div className="hajri-salary-pay-inner">
                                                <div className="salary-main-box">
                                                    <div className="salary-inner-input">
                                                        <input type="radio" name="salary_calculation" defaultValue="days" />
                                                    </div>
                                                    <div className="salary-inner-label">
                                                        <label className="radio-button-container proxima_nova_semibold">Count only working days :</label>
                                                        <p className="salary-date">Ex : January - 22 workdays, 8 weekend days</p>
                                                        <span className="salary-days">(Per day salary = Total Salary / Workdays)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="hajri-form-btn">
                                    <button type="button" name="" className="hajri-continue-btns">Continue</button>
                                </div>
                            </div>
                            <div className="hajri-right-sub-inner">
                                <div className="hajri-right-main-logo">
                                    <img src={"/assets/admin/images/login/salary.svg"} alt="" />
                                </div>
                                <div className="">
                                    <div className="hajri-main-con hajri-right-text">
                                        <h1 className="hajri-right-title hajri-step-3-title proxima_nova_semibold">Salary Structure</h1>
                                        <p className="hajri-right-con hajri-step-3-con proxima_nova_semibold">Define salary calculation method & working hours </p>
                                        <p className="hajri-structure proxima_nova_semibold">How long do staff work in one shift?</p>
                                    </div>
                                    <div className="hajri-salary-field">
                                        <div className="form-group login_shift_hours_group">
                                            <label htmlFor="exampleInputPassword1" className="form-label shift-hour-label">Shift Name</label>
                                            <div className="salary-stru-field">
                                                <input type="text" className="form-control hajri_shift_hours" placeholder="Enter shift name" name="shift_name" id="shift_name" value={f.shift_name ?? ''} onChange={set('shift_name')} />
                                            </div>
                                        </div>
                                        <div className="form-group hajri-form-info login_shift_hours_group">
                                            <label htmlFor="exampleInputPassword1" className="form-label shift-hour-label">Shift Hours</label>
                                            <div className="salary-stru-field">
                                                <input type="time" className="form-control hajri_shift_hours" placeholder="08:30 Hrs" name="shift_hour" id="shift_hour" value={f.shift_hour ?? ''} onChange={set('shift_hour')} />
                                            </div>
                                        </div>
                                        <div className="form-group hajri-form-info login_shift_hours_group">
                                            <div className="salary-stru-field">
                                                <label className="form-label shift-hour-label">Salary Duration</label>
                                                <div className="filters staff_attendance">
                                                    <div className={`select-club-services selectDropdown${durOpen ? ' open' : ''}${f.salary_duration ? ' filled' : ''}`}>
                                                        <select className="form-select create-select section_sub_title select-club-services" id="salary_duration" name="salary_duration" value={f.salary_duration} onChange={set('salary_duration')}>
                                                            <option value="">Select Salary Duration</option>
                                                            {DURATIONS.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
                                                        </select>
                                                        <span onClick={() => setDurOpen((o) => !o)}>{DURATIONS.find((d) => d.value === f.salary_duration)?.label ?? 'Select Salary Duration'}</span>
                                                        <ul>
                                                            {DURATIONS.map((d) => (<li key={d.value} className={f.salary_duration === d.value ? 'active' : ''}><a data-id={d.value} onClick={(e) => { e.preventDefault(); setF((c) => ({ ...c, salary_duration: d.value })); setDurOpen(false); }}>{d.label}</a></li>))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="hajri-form-btn">
                                            <button type="button" name="" className="hajri-continue-btn hajri-submit-btn step-3-button" onClick={finish} disabled={busy}>Continue</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="progress-dots">
                    <span className={`dot${step === 1 ? ' active' : ''}`} id="dot-1"></span>
                    <span className={`dot${step === 2 ? ' active' : ''}`} id="dot-2"></span>
                    <span className={`dot${step === 3 ? ' active' : ''}`} id="dot-3"></span>
                </div>
            </div>
            <div className="hajri-main-footer-mobile">
                <h2 className="footer-title proxima_nova_bold">Hajri<span className="footer-title-sub">.app</span></h2>
                <p className="footer-content proxima_nova_semibold">Seamless Solutions for Workforce Management</p>
                <div className="footer-inner-sec">
                    <p className="footer-number proxima_nova_semibold">+91 8460460916</p>
                    <p className="footer-email proxima_nova_semibold">hajri.app@gmail.com</p>
                </div>
            </div>
        </div>
    </div>

    </>
  );
}
