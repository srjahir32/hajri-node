'use client';

import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { StaffPicker, type PickRow } from '@/components/widgets/StaffPicker';
import { navigate } from '@/lib/navigate';

interface Row { id: number; name: string; phone_number: string | null; photo: string | null; department: string | null; assigned: boolean }

export default function Body() {
  const id = Number(useSearchParams().get('id'));
  const list = useAdmin<Row[]>(id ? `/admin/holidays/policies/${id}/staff` : null);
  const rows: PickRow[] = (list.data?.data ?? []).map((r) => ({ id: r.id, name: r.name, phone_number: r.phone_number, photo: r.photo, sub: r.department, assigned: r.assigned }));
  const apply = useAction((v: { selected: number[]; unselected: number[] }) => adminApi.post(`/admin/holidays/policies/${id}/assign`, { selected_ids: v.selected, unselected_ids: v.unselected }), {
    invalidate: ['/admin/holidays'],
    onSuccess: () => window.setTimeout(() => (navigate('/setting/holiday_policy_new')), 800),
  });
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title="Apply Holiday Template" crumbs={['Settings', 'Holiday / Leave Settings', 'Holiday Policy', 'Apply Holiday Template']} />
          <div className="main-content-inner on-time-main main-atten">
            <StaffPicker rows={rows} buttonLabel="Apply" busy={apply.isPending} onApply={(selected, unselected) => apply.mutate({ selected, unselected })} />
          </div>
        </div>
      </div>
    </main>
  );
}
