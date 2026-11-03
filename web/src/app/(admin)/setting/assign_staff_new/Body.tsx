'use client';

import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { StaffPicker, type PickRow } from '@/components/widgets/StaffPicker';
import { navigate } from '@/lib/navigate';

interface Row { id: number; name: string; phone_number: string | null; photo: string | null; current_department: string | null; assigned: boolean }

export default function Body() {
  const id = Number(useSearchParams().get('id'));
  const list = useAdmin<Row[]>(id ? `/admin/departments/${id}/staff` : null);
  const rows: PickRow[] = (list.data?.data ?? []).map((r) => ({ id: r.id, name: r.name, phone_number: r.phone_number, photo: r.photo, sub: r.current_department, assigned: r.assigned }));
  const apply = useAction((v: { selected: number[]; unselected: number[] }) => adminApi.post(`/admin/departments/${id}/assign`, { selected_ids: v.selected, unselected_ids: v.unselected }), {
    invalidate: ['/admin/departments'],
    onSuccess: () => window.setTimeout(() => (navigate('/setting/departments_new')), 800),
  });
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6">
          <BackCrumb title="Assign Staff" crumbs={['Settings', 'Holiday / Leave Settings', 'Departments', 'Assign Staff']} />
          <div className="main-content-inner on-time-main main-atten">
            <StaffPicker rows={rows} buttonLabel="Assign Staff" busy={apply.isPending} onApply={(selected, unselected) => apply.mutate({ selected, unselected })} />
          </div>
        </div>
      </div>
    </main>
  );
}
