'use client';

import { useEffect, useRef, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';
import { SettingRow, SettingsCard } from '@/components/settings/SettingsCard';

interface Tz { timezone: string; display: string }

export default function Body() {
  const zones = useAdmin<Tz[]>('/auth/reference/timezones').data?.data ?? [];
  const settings = useAdmin<{ timezone: string }>('/admin/settings');
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (settings.data) setValue(settings.data.data.timezone ?? '');
  }, [settings.data]);
  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const save = useAction(() => adminApi.put('/admin/settings', { timezone: value }), { invalidate: ['/admin/settings'], success: 'Time zone saved successfully' });
  const q = query.toLowerCase().trim();
  const shown = zones.filter((z) => !q || z.timezone.toLowerCase().includes(q));
  const current = zones.find((z) => z.timezone === value);
  return (
    <SettingsCard title="Time Zone Settings" crumbs={['Settings', 'Time Zone Settings']} busy={save.isPending} onSave={() => value && save.mutate()}>
      <SettingRow label="Business Time Zone" hint="Select the timezone for your business. All employee attendance records, shift timing constraints, check-in logs, and salary calculations will align with this selected timezone.">
        <div className="custom-dropdown" id="timezone-dropdown-container" ref={box} data-react-dropdown="">
          <div className="dropdown-trigger cursor-pointer flex items-center justify-between w-full" onClick={() => setOpen((o) => !o)}>
            <div className="flex items-center">
              <span className="sort_by_text text-blue-500">TimeZone:</span>
              <span className="selected-value text-gray-900 font-semibold ml-1">{current?.display ?? 'Select Time Zone'}</span>
            </div>
          </div>
          <div className="dropdown-options mt-2 w-full z-50 bg-white" style={{ display: open ? 'block' : 'none' }}>
            <div className="search-container" onClick={(e) => e.stopPropagation()}>
              <input type="text" id="timezone-search" placeholder="Search timezone..." autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <ul className="max-h-60 overflow-y-auto divide-y divide-gray-50/50" id="timezone-options-list" style={{ display: 'block' }}>
              {shown.map((z) => (
                <li key={z.timezone} data-value={z.timezone} className={`cursor-pointer ${z.timezone === value ? 'selected' : ''}`} onClick={() => { setValue(z.timezone); setOpen(false); }}>
                  {z.display}
                </li>
              ))}
              {!shown.length && <li className="px-4 py-6 text-center text-sm text-gray-400 hover:bg-transparent">No time zones found</li>}
            </ul>
          </div>
        </div>
      </SettingRow>
    </SettingsCard>
  );
}
