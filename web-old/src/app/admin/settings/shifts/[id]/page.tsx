'use client';

import { UserPlus } from 'lucide-react';
import { use, useState } from 'react';
import { AssignStaffModal } from '@/components/settings/AssignStaffModal';
import { BackToSettings } from '@/components/settings/BackLink';
import { ShiftForm } from '@/components/settings/ShiftForm';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
import { Field, Select } from '@/components/ui/Field';
import { ErrorState, PageLoader } from '@/components/ui/Misc';
import { useAdmin } from '@/lib/query';
import type { Shift } from '@/lib/types';

export default function EditShiftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useAdmin<Shift>(`/admin/shifts/${id}`);
  const [assign, setAssign] = useState(false);
  const [startIndex, setStartIndex] = useState('0');
  const [workingType, setWorkingType] = useState('1');
  if (q.error) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />;
  if (!q.data) return <PageLoader />;
  const s = q.data.data;
  return (
    <>
      <PageHeader back={<BackToSettings href="/admin/settings/shifts" label="Shifts" />} title={s.name ?? 'Shift'} subtitle={`${s.shift_type} · ${s.staff_count} staff assigned`} actions={<Button icon={<UserPlus className="size-4" />} onClick={() => setAssign(true)}>Assign staff</Button>} />
      <ShiftForm key={JSON.stringify(s.details)} initial={s} />
      {assign && (
        <AssignStaffModal
          open
          onClose={() => setAssign(false)}
          title={`Assign staff to ${s.name}`}
          listPath={`/admin/shifts/${s.id}/staff`}
          savePath={`/admin/shifts/${s.id}/assign`}
          invalidate={['/admin/shifts', '/admin/staff']}
          extra={s.shift_type_id === 2 ? { start_index: Number(startIndex), working_type: Number(workingType) } : undefined}
          header={
            s.shift_type_id === 2 ? (
              <div className="grid gap-4 rounded-xl bg-surface2 p-4 sm:grid-cols-2">
                <Field label="Starts with">{(fid) => <Select id={fid} value={startIndex} onChange={(e) => setStartIndex(e.target.value)}>{s.details.map((d, i) => <option key={d.id} value={i}>{d.name ?? `Shift ${i + 1}`}</option>)}</Select>}</Field>
                <Field label="Rotate every">{(fid) => <Select id={fid} value={workingType} onChange={(e) => setWorkingType(e.target.value)}><option value="0">Day</option><option value="1">Week</option><option value="2">Month</option></Select>}</Field>
              </div>
            ) : undefined
          }
        />
      )}
    </>
  );
}
