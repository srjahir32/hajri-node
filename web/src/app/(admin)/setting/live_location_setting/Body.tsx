'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { SettingRow, SettingsCard } from '@/components/settings/SettingsCard';

interface Settings { location_update_interval: number; location_api_call_interval: number }

export default function Body() {
  const q = useAdmin<Settings>('/admin/settings');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [err, setErr] = useState<{ a?: string; b?: string }>({});
  useEffect(() => {
    if (q.data) {
      setA(String(q.data.data.location_update_interval));
      setB(String(q.data.data.location_api_call_interval));
    }
  }, [q.data]);
  const save = useAction(() => adminApi.put('/admin/settings', { location_update_interval: Number(a), location_api_call_interval: Number(b) }), { invalidate: ['/admin/settings'], success: 'Live location settings saved successfully' });
  const submit = () => {
    const e: typeof err = {};
    if (a === '') e.a = 'Location update interval is required';
    if (b === '') e.b = 'Location API call interval is required';
    setErr(e);
    if (!Object.keys(e).length) save.mutate();
  };
  return (
    <SettingsCard title="Live Location Settings" crumbs={['Settings', 'System Settings', 'Live Location Settings']} busy={save.isPending} onSave={submit}>
      <SettingRow label="Location Update Interval (Seconds)" hint="The frequency at which the mobile app captures the employee's GPS coordinates. A lower value provides more accurate tracking but consumes more battery.">
        <input type="number" id="location_update_interval" className="form-control shift-edit-input" min="0" placeholder="Enter seconds (e.g. 10)" value={a} onChange={(e) => setA(e.target.value)} />
        {err.a && <span className="error error_message proxima_nova_semibold">{err.a}</span>}
      </SettingRow>
      <SettingRow divider label="Location API Call Interval (Seconds)" hint="The frequency at which the app sends the collected location data to the server. This helps in batching requests to save battery and data.">
        <input type="number" id="location_api_call_interval" className="form-control shift-edit-input" min="0" placeholder="Enter seconds (e.g. 60)" value={b} onChange={(e) => setB(e.target.value)} />
        {err.b && <span className="error error_message proxima_nova_semibold">{err.b}</span>}
      </SettingRow>
    </SettingsCard>
  );
}
