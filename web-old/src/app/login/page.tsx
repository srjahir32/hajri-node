'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/layout/AuthShell';
import { OtpLogin } from '@/components/layout/OtpLogin';
import { business, tokens } from '@/lib/api';
import type { AdminSession } from '@/lib/types';

export default function AdminLoginPage() {
  const router = useRouter();
  return (
    <AuthShell
      title="Business sign in"
      subtitle="Log in with your mobile number. New here? We'll set up your business right after."
      footer={<>Are you an employee? <Link className="text-brand hover:underline" href="/employee/login">Employee sign in</Link></>}
    >
      <OtpLogin
        sendPath="/auth/admin/send-otp"
        verifyPath="/auth/admin/verify-otp"
        onVerified={(d) => {
          const s = d as AdminSession;
          tokens.set('admin', s.token);
          if (s.current_business_id) business.set(s.current_business_id);
          router.replace(s.is_register ? '/admin/dashboard' : '/register');
        }}
      />
    </AuthShell>
  );
}
