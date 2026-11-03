'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { SettingRow, SettingsCard } from '@/components/settings/SettingsCard';

export default function Body() {
  const q = useAdmin<{ staff_allowed_radius: number }>('/admin/settings');
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (q.data) setV(String(q.data.data.staff_allowed_radius));
  }, [q.data]);
  const save = useAction(() => adminApi.put('/admin/settings', { staff_allowed_radius: Number(v) }), { invalidate: ['/admin/settings'], success: 'Staff allowed radius saved successfully' });
  return (
    <SettingsCard title="Staff Allowed Radius" crumbs={['Settings', 'System Settings', 'Staff Allowed Radius']} busy={save.isPending} onSave={() => (v === '' ? setErr('Staff allowed radius is required') : (setErr(''), save.mutate()))}>
      <SettingRow label="Staff Allowed Radius (Meters)" hint="The maximum distance (in meters) within which staff are allowed to mark their attendance from their designated office location.">
        <input type="number" id="staff_allowed_radius" className="form-control shift-edit-input" min="0" placeholder="Enter radius in meters (e.g. 100)" value={v} onChange={(e) => setV(e.target.value)} />
        {err && <span className="error error_message proxima_nova_semibold">{err}</span>}
      </SettingRow>
    </SettingsCard>
  );
}
