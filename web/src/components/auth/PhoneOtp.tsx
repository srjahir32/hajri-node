'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, makeApi, tokens, business, type Role } from '@/lib/api';
import { toast } from '@/lib/toast';
import { navigate } from '@/lib/navigate';

type Variant = 'admin' | 'staff';

export interface VerifiedSession {
  token: string;
  is_register?: boolean;
  current_business_id?: number | null;
  businesses?: { id: number }[];
  // staff only: several businesses for the same phone
  staffs?: { id: number; name: string; business_name?: string }[];
  [k: string]: unknown;
}

const fmtTimer = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/**
 * Step 1 of the login screens: phone number (intl-tel-input) → 4-digit OTP. Same markup/classes as login.blade.php;
 * the Laravel `/register-number` + `/verify-otp` calls map to our `send-otp` / `verify-otp`.
 */
export function PhoneOtp({
  variant = 'admin',
  title = 'Your Details',
  subtitle = 'Enter your mobile number',
  phoneButton = 'Login',
  onVerified,
  contactHref = 'https://mail.google.com/mail/?view=cm&fs=1&to=hi@hajri.app',
  logoSrc = '/assets/admin/images/login/icon2.svg',
}: {
  variant?: Variant;
  title?: string;
  subtitle?: string;
  phoneButton?: string;
  onVerified: (s: VerifiedSession) => void;
  contactHref?: string;
  logoSrc?: string;
}) {
  const api = makeApi((variant === 'admin' ? 'admin' : 'staff') as Role);
  const base = variant === 'admin' ? '/auth/admin' : '/auth/staff';
  const input = useRef<HTMLInputElement>(null);
  const iti = useRef<any>(null);
  const [stage, setStage] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [dial, setDial] = useState('91');
  const [digits, setDigits] = useState(['', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let off = false;
    (async () => {
      const mod: any = await import('intl-tel-input');
      const factory = mod.default ?? mod;
      if (off || !input.current) return;
      iti.current = factory(input.current, { initialCountry: 'in', separateDialCode: true });
      input.current.addEventListener('countrychange', () => setDial(String(iti.current?.getSelectedCountryData()?.dialCode ?? '91')));
      setDial(String(iti.current?.getSelectedCountryData()?.dialCode ?? '91'));
    })();
    return () => {
      off = true;
      iti.current?.destroy?.();
    };
  }, []);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const send = useCallback(async () => {
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 6) {
      toast.error('Enter a valid phone number');
      return false;
    }
    setBusy(true);
    try {
      await api.post(`${base}/send-otp`, { country_code: dial, phone: digitsOnly });
      setLeft(180);
      return true;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not send OTP');
      return false;
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, dial]);

  const submitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (await send()) {
      setStage('otp');
      setTimeout(() => boxes.current[0]?.focus(), 50);
    }
  };

  const verify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const otp = digits.join('');
    if (otp.length !== 4) {
      toast.error('Enter the 4-digit verification code');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<VerifiedSession>(`${base}/verify-otp`, { country_code: dial, phone: phone.replace(/\D/g, ''), otp });
      toast.success(String(res.message ?? 'You are logged in successfully.'));
      onVerified(res.data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'OTP verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/[^0-9]/g, '').slice(0, 1);
    setDigits((cur) => cur.map((x, k) => (k === i ? d : x)));
    if (d && i < 3) boxes.current[i + 1]?.focus();
  };

  return (
    <div className="hajri-right step" id="step-1">
      <div className="hajri-right-main-logo">
        <img src={logoSrc} alt="" />
      </div>
      <div className="hajri-right-text">
        <h1 className="hajri-right-title proxima_nova_semibold">{title}</h1>
        <p className="hajri-right-con proxima_nova_semibold">{subtitle}</p>
        <form onSubmit={stage === 'phone' ? submitPhone : verify}>
          <div className="hajri-phone-number" id="edit-mobile" style={{ display: stage === 'phone' ? '' : 'none' }}>
            <div className="form-group" id="error">
              <label htmlFor="mobile_code" className="form-label phone-field">Phone Number</label>
              <input ref={input} type="text" id="mobile_code" className="form-control phone_input" placeholder="Phone Number" name="phone_number" maxLength={16} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 15))} />
            </div>
            <div className="hajri-form-btn">
              <button type="submit" name="" className="hajri-submit-btnss" disabled={busy}>
                {phoneButton}
                <img className="loader" src="/assets/admin/images/white_loader.gif" alt="" style={{ display: busy ? 'inline-block' : 'none' }} />
              </button>
            </div>
          </div>
          <div className="hajri-phone-otp" style={{ display: stage === 'otp' ? '' : 'none' }}>
            <div className="hajri-inner-otp">
              <p className="otp_num proxima_nova_semibold" id="otp_num">{`+${dial} ${phone}`}</p>
              <img className="phone-number-text" src="/assets/admin/images/login/icon-edit.svg" alt="" style={{ cursor: 'pointer' }} onClick={() => { setStage('phone'); setDigits(['', '', '', '']); }} />
            </div>
            <div className="hajri-inner-text">
              <p className="digit_text">4-Digit Verification Code</p>
            </div>
            <div className="text-center digit-num">
              <div className="digit-main-num">
                <div className="digit-inner-num">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { boxes.current[i] = el; }}
                      className="otp digit_number"
                      type="number"
                      inputMode="numeric"
                      value={d}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !digits[i] && i > 0) boxes.current[i - 1]?.focus();
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const t = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
                        setDigits([0, 1, 2, 3].map((k) => t[k] ?? ''));
                        boxes.current[Math.min(t.length, 3)]?.focus();
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="main-counter">
              <a className="resend_otp" style={{ cursor: 'pointer', display: left > 0 ? 'none' : '' }} onClick={() => void send()}> Resend OTP</a>
              <span id="countdowntimer">{left > 0 ? fmtTimer(left) : ''}</span>
            </div>
            <div className="hajri-form-btn form-btn-otp-btn">
              <button type="submit" name="" className="hajri-submit-btn-submit otp-button" disabled={busy}>
                Submit
                <img className="loader" src="/assets/admin/images/white_loader.gif" alt="" style={{ display: busy ? 'inline-block' : 'none' }} />
              </button>
            </div>
          </div>
        </form>
        <div className="hajri-form-link">
          <p>
            Having trouble login?{' '}
            <a href={contactHref} target="_blank">
              Contact Admin
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Stores the verified admin session the same way the old UI did, then leaves for the right page. */
export function finishAdminLogin(s: VerifiedSession) {
  tokens.set('admin', s.token);
  const biz = s.current_business_id ?? s.businesses?.[0]?.id;
  if (biz) business.set(biz);
  navigate(s.is_register ? '/dashboard-new' : '/a_admin/login');
}
