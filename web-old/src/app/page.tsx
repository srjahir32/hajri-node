import Link from 'next/link';
import { Briefcase, ShieldCheck, UserRound } from 'lucide-react';

const portals = [
  { href: '/login', title: 'Business owner', desc: 'Manage staff, attendance, shifts, payroll and reports for your business.', icon: Briefcase },
  { href: '/employee/login', title: 'Employee', desc: 'Punch in and out, apply for leave, view your attendance and holidays.', icon: UserRound },
  { href: '/super-admin/login', title: 'Platform admin', desc: 'Monitor businesses, subscriptions and revenue across the platform.', icon: ShieldCheck },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-brand text-2xl font-bold text-white shadow-card">H</div>
        <h1 className="text-4xl font-semibold tracking-tight">Hajri</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">Attendance, leave and payroll in one place — simple enough for a shop floor, powerful enough for a growing business.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {portals.map(({ href, title, desc, icon: Icon }) => (
          <Link key={href} href={href} className="group rounded-2xl border border-line bg-surface p-6 shadow-card transition hover:-translate-y-0.5 hover:border-brand/60">
            <div className="mb-4 grid size-11 place-items-center rounded-xl bg-brandsoft text-brand transition group-hover:bg-brand group-hover:text-white">
              <Icon className="size-5" />
            </div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{desc}</p>
            <p className="mt-4 text-sm font-medium text-brand">Sign in →</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
