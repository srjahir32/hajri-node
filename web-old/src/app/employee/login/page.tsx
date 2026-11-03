'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { AuthShell } from '@/components/layout/AuthShell';
import { OtpLogin } from '@/components/layout/OtpLogin';
import { Button } from '@/components/ui/Button';
import { publicApi, tokens } from '@/lib/api';
import type { StaffSession } from '@/lib/types';
import { errMsg } from '@/lib/query';

interface Option { id: number; name: string; business_id: number; business: { id: number; name: string } }

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [options, setOptions] = useState<Option[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  async function choose(id: number) {
    setBusy(id);
    try {
      const res = await publicApi.post<StaffSession>('/auth/staff/select-business', { staff_id: id });
      tokens.set('staff', res.data.token);
      router.replace('/employee/dashboard');
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(null);
    }
  }

  return (
    <AuthShell
      title={options ? 'Choose your workplace' : 'Employee sign in'}
      subtitle={options ? 'Your number is registered with more than one business.' : 'Use the mobile number your employer registered.'}
      footer={<>Business owner? <Link className="text-brand hover:underline" href="/login">Owner sign in</Link></>}
    >
      {options ? (
        <div className="space-y-2">
          {options.map((o) => (
            <Button key={o.id} variant="secondary" className="w-full justify-between" loading={busy === o.id} onClick={() => void choose(o.id)}>
              <span>{o.business.name}</span><span className="text-muted">→</span>
            </Button>
          ))}
        </div>
      ) : (
        <OtpLogin
          sendPath="/auth/staff/send-otp"
          verifyPath="/auth/staff/verify-otp"
          onVerified={async (d) => {
            const list = d as Option[];
            if (list.length === 1) await choose(list[0].id);
            else setOptions(list);
          }}
        />
      )}
    </AuthShell>
  );
}
