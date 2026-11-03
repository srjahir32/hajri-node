'use client';

import { ArrowLeft, Pencil, UserCheck, UserX } from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';
import { AttendanceCalendar, DayDetail } from '@/components/attendance/AttendanceCalendar';
import type { StaffDetail } from '@/components/staff/StaffForm';
import { LinkButton, Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, PageHeader, Stat, StatusBadge } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/Confirm';
import { ToggleRow } from '@/components/ui/Field';
import { Avatar, EmptyState, ErrorState, KeyValue, MonthPicker, PageLoader, Section, Tabs } from '@/components/ui/Misc';
import { Table, TableWrap, Td, Th, THead, Tr } from '@/components/ui/Table';
import { adminApi } from '@/lib/api';
import { useAdminSession } from '@/lib/auth';
import { fmtDate, fmtDateTime, fmtDuration, fmtMoney, MONTHS, monthStr } from '@/lib/format';
import { useAction, useAdmin } from '@/lib/query';
import type { DaySummary } from '@/lib/types';

type StaffFull = StaffDetail & {
  full_name: string;
  is_deactivate: number;
  overtime_rule: number;
  break_rule: number;
  late_entry_rule: number;
  early_exit_rule: number;
  department: { id: number; name: string } | null;
  shift: { working_shift_id: number; name: string | null; shift_type: string } | null;
  leave_policies: { id: number; name: string }[];
  holiday_policies: { id: number; name: string }[];
};

export default function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useAdminSession();
  const [tab, setTab] = useState<'overview' | 'attendance' | 'payroll' | 'documents' | 'activity'>('overview');
  const [ask, dialog] = useConfirm();
  const q = useAdmin<StaffFull>(`/admin/staff/${id}`);
  const toggle = useAction((deactivate: boolean) => adminApi.post(`/admin/staff/${id}/${deactivate ? 'deactivate' : 'activate'}`), { invalidate: ['/admin/staff'] });
  const rules = useAction((b: Record<string, boolean>) => adminApi.patch(`/admin/staff/${id}/rules`, b), { invalidate: [`/admin/staff/${id}`], success: 'Rules updated' });

  if (q.error) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />;
  if (!q.data) return <PageLoader />;
  const s = q.data.data;

  return (
    <>
      <PageHeader
        back={<Link href="/admin/staff" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> All staff</Link>}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={s.full_name} src={s.photos[0]?.url} size={48} />
            <span>
              {s.full_name}
              <span className="mt-0.5 flex items-center gap-2 text-sm font-normal text-muted">
                +{s.country_code} {s.phone_number}
                {s.is_deactivate ? <StatusBadge status="Deactivated" /> : <StatusBadge status="Active" />}
              </span>
            </span>
          </span>
        }
        actions={
          can('add_staff') && (
            <>
              <LinkButton href={`/admin/staff/${s.id}/edit`} variant="secondary" icon={<Pencil className="size-4" />}>Edit</LinkButton>
              <Button
                variant={s.is_deactivate ? 'primary' : 'secondary'}
                icon={s.is_deactivate ? <UserCheck className="size-4" /> : <UserX className="size-4" />}
                onClick={() => ask({
                  title: s.is_deactivate ? 'Activate staff?' : 'Deactivate staff?',
                  message: s.is_deactivate ? 'They will be able to log in again.' : 'They will be logged out and unable to punch. Records are kept.',
                  confirmLabel: s.is_deactivate ? 'Activate' : 'Deactivate',
                  tone: s.is_deactivate ? 'primary' : 'danger',
                  onConfirm: () => toggle.mutateAsync(!s.is_deactivate),
                })}
              >
                {s.is_deactivate ? 'Activate' : 'Deactivate'}
              </Button>
            </>
          )
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'attendance', label: 'Attendance' },
          { id: 'payroll', label: 'Payroll' },
          { id: 'documents', label: 'Documents' },
          { id: 'activity', label: 'Activity' },
        ]}
      />
      <div className="mt-6">
        {tab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Profile" />
              <CardBody className="space-y-6">
                <Section title="Work">
                  <dl className="grid gap-4 sm:grid-cols-3">
                    <KeyValue label="Department">{s.department?.name}</KeyValue>
                    <KeyValue label="Designation">{s.info?.designation}</KeyValue>
                    <KeyValue label="Joined">{s.info?.date_of_joining && fmtDate(s.info.date_of_joining)}</KeyValue>
                    <KeyValue label="Shift">{s.shift ? `${s.shift.name} (${s.shift.shift_type})` : undefined}</KeyValue>
                    <KeyValue label="Salary">{s.salary_amount ? fmtMoney(s.salary_amount) : undefined}</KeyValue>
                    <KeyValue label="Email">{s.email}</KeyValue>
                    <KeyValue label="UAN">{s.info?.UAN_number}</KeyValue>
                    <KeyValue label="ESI">{s.info?.ESI_number}</KeyValue>
                    <KeyValue label="PAN">{s.info?.PAN_number}</KeyValue>
                  </dl>
                </Section>
                <Section title="Bank">
                  <dl className="grid gap-4 sm:grid-cols-3">
                    <KeyValue label="Bank">{s.bank?.bank_name}</KeyValue>
                    <KeyValue label="Account holder">{s.bank?.account_holder_name}</KeyValue>
                    <KeyValue label="Account number">{s.bank?.account_number}</KeyValue>
                    <KeyValue label="IFSC">{s.bank?.IFSC_code}</KeyValue>
                    <KeyValue label="UPI">{s.bank?.UPI_id}</KeyValue>
                  </dl>
                </Section>
                <Section title="Personal">
                  <dl className="grid gap-4 sm:grid-cols-3">
                    <KeyValue label="Date of birth">{s.profile?.date_of_birth && fmtDate(s.profile.date_of_birth)}</KeyValue>
                    <KeyValue label="Gender">{s.profile?.gender}</KeyValue>
                    <KeyValue label="City">{s.profile?.city}</KeyValue>
                    <KeyValue label="Address">{[s.profile?.address1, s.profile?.address2, s.profile?.state, s.profile?.pincode].filter(Boolean).join(', ')}</KeyValue>
                  </dl>
                </Section>
              </CardBody>
            </Card>
            <div className="space-y-6">
              <Card>
                <CardHeader title="Attendance mode" />
                <CardBody className="space-y-2 text-sm">
                  <p className="flex justify-between"><span className="text-muted">Remote</span><b>{s.is_remote ? 'Yes' : 'No'}</b></p>
                  <p className="flex justify-between"><span className="text-muted">Auto-approve</span><b>{s.auto_approve_attendance ? 'Yes' : 'No'}</b></p>
                  <p className="flex justify-between"><span className="text-muted">Geo-fencing</span><b>{s.is_geo_fencing ? 'On' : 'Off'}</b></p>
                  <p className="flex justify-between"><span className="text-muted">Timezone</span><b>{s.timezone ?? 'Business default'}</b></p>
                </CardBody>
              </Card>
              {can('view_setting') && (
                <Card>
                  <CardHeader title="Salary rules" subtitle="Applied when payroll is calculated" />
                  <CardBody className="space-y-2">
                    <ToggleRow title="Overtime pay" checked={!!s.overtime_rule} onChange={(v) => rules.mutate({ overtime_rule: v })} />
                    <ToggleRow title="Break deduction" checked={!!s.break_rule} onChange={(v) => rules.mutate({ break_rule: v })} />
                    <ToggleRow title="Late-entry deduction" checked={!!s.late_entry_rule} onChange={(v) => rules.mutate({ late_entry_rule: v })} />
                    <ToggleRow title="Early-exit deduction" checked={!!s.early_exit_rule} onChange={(v) => rules.mutate({ early_exit_rule: v })} />
                  </CardBody>
                </Card>
              )}
              <Card>
                <CardHeader title="Policies" />
                <CardBody className="space-y-2 text-sm">
                  <p><span className="text-muted">Leave:</span> {s.leave_policies.map((p) => p.name).join(', ') || '—'}</p>
                  <p><span className="text-muted">Holidays:</span> {s.holiday_policies.map((p) => p.name).join(', ') || 'Business default'}</p>
                </CardBody>
              </Card>
            </div>
          </div>
        )}
        {tab === 'attendance' && <AttendanceTab id={id} />}
        {tab === 'payroll' && <PayrollTab id={id} />}
        {tab === 'documents' && (
          <Card>
            <CardHeader title="Photos & documents" />
            <CardBody>
              {s.photos.length + s.documents.length === 0 ? <EmptyState title="Nothing uploaded" message="Edit the profile to upload photos or ID documents." /> : (
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-3">
                    {s.photos.map((p) => (
                      <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt="" className="size-28 rounded-xl object-cover" />
                      </a>
                    ))}
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {s.documents.map((d) => <li key={d.id}><a className="text-brand hover:underline" href={d.url} target="_blank" rel="noreferrer">{d.name ?? d.url.split('/').pop()}</a></li>)}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        )}
        {tab === 'activity' && <ActivityTab id={id} />}
      </div>
      {dialog}
    </>
  );
}

function AttendanceTab({ id }: { id: string }) {
  const [month, setMonth] = useState(monthStr());
  const [sel, setSel] = useState<DaySummary | null>(null);
  const [y, m] = month.split('-');
  const q = useAdmin<DaySummary[]>(`/admin/staff/${id}/attendance`, { month: Number(m), year: Number(y) }, { keepPrevious: true });
  const body = q.data as unknown as { data: { days: DaySummary[]; count: Record<string, number> } } | undefined;
  const cal = body?.data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker value={month} onChange={(v) => { setMonth(v); setSel(null); }} />
      </div>
      {cal && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Present" value={cal.count.present_count} tone="success" />
          <Stat label="Absent" value={cal.count.absent_count} tone="danger" />
          <Stat label="Half day" value={cal.count.halfday_count} tone="warning" />
          <Stat label="Leave" value={cal.count.leave} tone="info" />
          <Stat label="Overtime days" value={cal.count.overtime} tone="brand" />
          <Stat label="Short days" value={cal.count.fine} tone="warning" />
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardBody>{cal ? <AttendanceCalendar month={month} days={cal.days} onSelect={setSel} selected={sel?.date} /> : <PageLoader />}</CardBody></Card>
        <Card>
          <CardHeader title={sel ? fmtDate(sel.date, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Day details'} />
          <CardBody>{sel ? <DayDetail day={sel} /> : <p className="text-sm text-muted">Select a day to see punches, breaks and overtime.</p>}</CardBody>
        </Card>
      </div>
    </div>
  );
}

function PayrollTab({ id }: { id: string }) {
  const q = useAdmin<Record<string, number | string>[]>(`/admin/reports/staff-payroll/${id}`);
  const { can } = useAdminSession();
  if (!can('view_payroll', 'view_report')) return <EmptyState title="No access" message="You don't have permission to view payroll." />;
  if (q.error) return <ErrorState message={q.error.message} />;
  if (!q.data) return <PageLoader />;
  if (!q.data.data.length) return <Card><EmptyState title="No payroll processed yet" message="Process payroll from the Payroll page to see history here." /></Card>;
  return (
    <Card>
      <TableWrap>
        <Table>
          <THead><tr><Th>Month</Th><Th align="right">Worked</Th><Th align="right">Base</Th><Th align="right">Overtime</Th><Th align="right">Deductions</Th><Th align="right">PF</Th><Th align="right">Net</Th></tr></THead>
          <tbody>
            {q.data.data.map((p) => (
              <Tr key={p.id as number}>
                <Td>{MONTHS[Number(p.month) - 1]} {p.year}</Td>
                <Td align="right" className="tnum">{fmtDuration(Number(p.worked_seconds))}</Td>
                <Td align="right" className="tnum">{fmtMoney(Number(p.base_salary))}</Td>
                <Td align="right" className="tnum">{fmtMoney(Number(p.overtime_salary))}</Td>
                <Td align="right" className="tnum">{fmtMoney(Number(p.break_deduction) + Number(p.late_deduction) + Number(p.early_deduction))}</Td>
                <Td align="right" className="tnum">{fmtMoney(Number(p.pf_cut))}</Td>
                <Td align="right" className="tnum font-semibold">{fmtMoney(Number(p.net_salary))}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </Card>
  );
}

function ActivityTab({ id }: { id: string }) {
  const q = useAdmin<{ id: number; detail: string; by: string | null; created_at: string }[]>(`/admin/staff/${id}/logs`, { per_page: 50 });
  if (q.error) return <ErrorState message={q.error.message} />;
  if (!q.data) return <PageLoader />;
  return (
    <Card>
      {q.data.data.length ? (
        <ul className="divide-y divide-line">
          {q.data.data.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
              <span>{l.detail}</span>
              <span className="text-xs text-muted">{l.by ? `${l.by} · ` : ''}{fmtDateTime(l.created_at)}</span>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No activity yet" />}
    </Card>
  );
}
