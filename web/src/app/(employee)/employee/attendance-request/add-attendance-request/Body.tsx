'use client';

import { useState } from 'react';
import { staffApi } from '@/lib/api';
import { useAction } from '@/lib/query';
import { BackCrumb } from '@/components/shell/BackCrumb';
import { PRIMARY_BTN } from '@/components/settings/SettingsCard';
import { F_INPUT, F_LABEL, F_TEXTAREA } from '@/components/settings/formClasses';
import { navigate } from '@/lib/navigate';

export default function Body() {
  const [f, setF] = useState({ punch_in: '', punch_out: '', reason: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = (k: string) => (e: { target: { value: string } }) => setF((c) => ({ ...c, [k]: e.target.value }));
  const send = useAction(() => staffApi.post('/employee/attendance-requests', { punch_in: f.punch_in, punch_out: f.punch_out, reason: f.reason.trim() }), {
    invalidate: ['/employee/attendance-requests'],
    onSuccess: () => window.setTimeout(() => (navigate('/employee/attendance-request')), 900),
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.punch_in) er.punch_in = 'Punch in date & time is required';
    if (!f.punch_out) er.punch_out = 'Punch out date & time is required';
    if (f.punch_in && f.punch_out && f.punch_out <= f.punch_in) er.punch_out = 'Punch out must be after punch in';
    if (!f.reason.trim()) er.reason = 'Reason is required';
    setErrs(er);
    if (!Object.keys(er).length) send.mutate();
  };
  const Err = ({ k }: { k: string }) => (errs[k] ? <span className="error error_message proxima_nova_semibold">{errs[k]}</span> : null);
  const req = <span className="text-destructive">*</span>;
  return (
    <main className="flex-1 p-md-5 overflow-y-auto">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-6 pb-20">
          <BackCrumb title="Back" crumbs={['Attendance Request', 'Add Attendance Request']} />
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
            <form id="add_attendance_request_form" className="space-y-8" onSubmit={submit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className={F_LABEL} htmlFor="punch_in">Punch In Date &amp; Time {req}</label>
                  <input type="datetime-local" id="punch_in" className={F_INPUT} value={f.punch_in} onChange={set('punch_in')} max={new Date().toISOString().slice(0, 16)} />
                  <Err k="punch_in" />
                </div>
                <div className="space-y-2">
                  <label className={F_LABEL} htmlFor="punch_out">Punch Out Date &amp; Time {req}</label>
                  <input type="datetime-local" id="punch_out" className={F_INPUT} value={f.punch_out} onChange={set('punch_out')} max={new Date().toISOString().slice(0, 16)} />
                  <Err k="punch_out" />
                </div>
              </div>
              <div className="space-y-2">
                <label className={F_LABEL} htmlFor="reason">Reason note for manual entry {req}</label>
                <textarea className={F_TEXTAREA} id="reason" placeholder="Enter reason" value={f.reason} onChange={set('reason')} />
                <Err k="reason" />
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" id="submit_request" className={PRIMARY_BTN} disabled={send.isPending}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
