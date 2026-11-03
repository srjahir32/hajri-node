'use client';

import { Building2, CalendarDays, Clock, Landmark, Layers, MapPin, Palmtree, Sliders } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/Card';

const items = [
  { href: '/admin/settings/business', title: 'Business profile', desc: 'Name, address, logo, salary mode and working hours.', icon: Building2 },
  { href: '/admin/settings/departments', title: 'Departments', desc: 'Create departments and assign staff to them.', icon: Layers },
  { href: '/admin/settings/shifts', title: 'Shifts', desc: 'Fixed, rotational and flexible working shifts.', icon: Clock },
  { href: '/admin/settings/holidays', title: 'Holidays', desc: 'Holiday templates and weekly offs for the business or individual staff.', icon: CalendarDays },
  { href: '/admin/settings/leave-policies', title: 'Leave policies', desc: 'Monthly / yearly leave balances with carry-forward.', icon: Palmtree },
  { href: '/admin/settings/rules', title: 'Automation rules', desc: 'Overtime pay and break, late-entry and early-exit deductions.', icon: Sliders },
  { href: '/admin/settings/attendance', title: 'Attendance & location', desc: 'Late tolerance, geo-fence radius, location tracking and timezone.', icon: MapPin },
  { href: '/admin/settings/pf', title: 'Provident fund', desc: 'Employee / employer contribution percentages and cap.', icon: Landmark },
];

export default function SettingsHub() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Configure how attendance and payroll work for this business" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(({ href, title, desc, icon: Icon }) => (
          <Link key={href} href={href} className="group flex gap-4 rounded-xl border border-line bg-surface p-5 shadow-card transition hover:border-brand/60">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brandsoft text-brand transition group-hover:bg-brand group-hover:text-white"><Icon className="size-5" /></span>
            <span><span className="block font-semibold">{title}</span><span className="mt-0.5 block text-sm text-muted">{desc}</span></span>
          </Link>
        ))}
      </div>
    </>
  );
}
