'use client';

import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { WEEKDAYS } from '@/lib/format';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { StaffPicker, type PickRow } from '@/components/widgets/StaffPicker';
import { navigate } from '@/lib/navigate';

interface Row { id: number; name: string; phone_number: string | null; department: string | null; photo: string | null; days: number[] }

export default function Body() {
  const day = Number(useSearchParams().get('day') ?? 0);
  const list = useAdmin<Row[]>('/admin/holidays/weekly/staff');
  const staff = list.data?.data ?? [];
  const rows: PickRow[] = staff.map((r) => ({ id: r.id, name: r.name, phone_number: r.phone_number, photo: r.photo, sub: r.department, assigned: r.days.includes(day) }));

  /** The API replaces each staff member's whole day set, so group staff by their resulting set and send one call per group. */
  const save = useAction(
    async (v: { selected: number[]; unselected: number[] }) => {
      const groups = new Map<string, number[]>();
      for (const s of staff) {
        const next = v.selected.includes(s.id) ? [...new Set([...s.days, day])] : v.unselected.includes(s.id) ? s.days.filter((d) => d !== day) : null;
        if (!next) continue;
        const key = next.sort().join(',');
        groups.set(key, [...(groups.get(key) ?? []), s.id]);
      }
      let last = await adminApi.get('/admin/holidays/weekly/business');
      for (const [key, ids] of groups) last = await adminApi.put('/admin/holidays/weekly/staff', { staff_ids: ids, days: key ? key.split(',').map(Number) : [] });
      return last;
    },
    { invalidate: ['/admin/holidays/weekly'], success: 'Weekly holidays saved', onSuccess: () => window.setTimeout(() => (navigate('/setting/weekly_holiday_policy_staff_level')), 800) },
  );
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title={WEEKDAYS[day] ?? 'Weekly Holiday'} crumbs={['Settings', 'Holiday / Leave Settings', 'Weekly holiday policy', WEEKDAYS[day] ?? 'Staff']} />
          <div className="main-content-inner on-time-main main-atten">
            <StaffPicker rows={rows} buttonLabel="Save" busy={save.isPending} onApply={(selected, unselected) => save.mutate({ selected, unselected })} />
          </div>
        </div>
      </div>
    </main>
  );
}
