'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { SettingRow, SettingsCard } from '@/components/settings/SettingsCard';

interface Settings { punch_in_time_tolerance: number }

export default function Body() {
  const q = useAdmin<Settings>('/admin/settings');
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (q.data) setV(String(q.data.data.punch_in_time_tolerance));
  }, [q.data]);
  const save = useAction(() => adminApi.put('/admin/settings', { punch_in_time_tolerance: Number(v) }), { invalidate: ['/admin/settings'], success: 'Attendance setting saved successfully' });
  return (
    <SettingsCard title="Attendance Settings" crumbs={['Settings', 'Attendance Settings']} busy={save.isPending} onSave={() => (v === '' || Number(v) < 0 ? setErr('Punch in tolerance field is required') : (setErr(''), save.mutate()))}>
      <SettingRow label="Punch in time tolerance (Minutes)" hint="The adjustment considers the punch in time based on a work shift.">
        <input type="number" id="punch_in_tolerance" className="form-control shift-edit-input" min="0" placeholder="Enter minutes" value={v} onChange={(e) => setV(e.target.value)} />
        {err && <span className="error error_message proxima_nova_semibold">{err}</span>}
        <div className="flex items-start gap-8 mt-3">
          <div className="flex flex-col items-center gap-2">
            <span className="px-3 py-1 behavior rounded-full text-xs font-semibold bg-orange-500 text-white shadow-sm ring-1 ring-white/20">Early</span>
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Before on time</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="px-3 py-1 behavior rounded-full text-xs font-semibold bg-green-500 text-white shadow-sm ring-1 ring-white/20">Regular</span>
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">On time to tolerance</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="px-3 py-1 behavior rounded-full text-xs font-semibold bg-red-500 text-white shadow-sm ring-1 ring-white/20">Late</span>
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">After tolerance</span>
          </div>
        </div>
      </SettingRow>
    </SettingsCard>
  );
}
