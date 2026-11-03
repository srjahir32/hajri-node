'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { ApiError, publicApi } from '@/lib/api';
import { toast } from 'sonner';

const CODES = [
  ['91', 'India (+91)'], ['1', 'USA / Canada (+1)'], ['44', 'UK (+44)'], ['971', 'UAE (+971)'], ['966', 'Saudi Arabia (+966)'], ['974', 'Qatar (+974)'],
  ['65', 'Singapore (+65)'], ['61', 'Australia (+61)'], ['977', 'Nepal (+977)'], ['880', 'Bangladesh (+880)'], ['94', 'Sri Lanka (+94)'], ['92', 'Pakistan (+92)'],
];

/** Two-step phone + OTP form used by both the owner and the employee sign-in screens. */
export function OtpLogin({
  sendPath,
  onVerified,
  verifyPath,
  submitLabel = 'Verify & continue',
}: {
  sendPath: string;
  verifyPath: string;
  onVerified: (data: unknown, ctx: { country_code: string; phone: string }) => Promise<void> | void;
  submitLabel?: string;
}) {
  const [code, setCode] = useState('91');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send() {
    setError(null);
    if (phone.replace(/\D/g, '').length < 6) return setError('Enter a valid phone number');
    setBusy(true);
    try {
      await publicApi.post(sendPath, { country_code: code, phone });
      setStep('otp');
      setWait(30);
      toast.success('OTP sent');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError(null);
    if (otp.length < 4) return setError('Enter the 4-digit code');
    setBusy(true);
    try {
      const res = await publicApi.post(verifyPath, { country_code: code, phone, otp });
      await onVerified(res.data, { country_code: code, phone });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Verification failed');
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void (step === 'phone' ? send() : verify());
      }}
    >
      {step === 'phone' ? (
        <>
          <Field label="Country">
            {(id) => (
              <Select id={id} value={code} onChange={(e) => setCode(e.target.value)}>
                {CODES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Mobile number" error={error}>
            {(id) => <Input id={id} inputMode="numeric" autoComplete="tel-national" autoFocus placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />}
          </Field>
          <Button type="submit" loading={busy} className="w-full" size="lg">Send OTP</Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">We sent a 4-digit code to <b className="text-ink">+{code} {phone}</b>.</p>
          <Field label="One-time password" error={error}>
            {(id) => <Input id={id} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus className="text-center text-xl tracking-[0.5em]" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />}
          </Field>
          <Button type="submit" loading={busy} className="w-full" size="lg">{submitLabel}</Button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" className="text-brand hover:underline" onClick={() => { setStep('phone'); setOtp(''); setError(null); }}>Change number</button>
            <button type="button" disabled={wait > 0 || busy} className="text-brand hover:underline disabled:text-muted disabled:no-underline" onClick={() => void send()}>
              {wait > 0 ? `Resend in ${wait}s` : 'Resend OTP'}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
