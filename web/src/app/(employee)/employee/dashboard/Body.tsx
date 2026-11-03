'use client';

import dynamic from 'next/dynamic';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as I from '@/components/icons';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, staffApi, type Envelope } from '@/lib/api';
import { useStaffSession } from '@/lib/auth';
import { useAction, useStaff } from '@/lib/query';
import { fmtHm, fmtTime12, timeAgo } from '@/lib/format';
import { toast } from '@/lib/toast';
import '@/styles/employee-punch.css';

const StaffMap = dynamic(() => import('@/components/widgets/StaffMap'), { ssr: false });

interface Punch { in_time: string | null; out_time: string | null; latitude?: number | null; longitude?: number | null }
interface Dash {
  date: string; timezone: string; is_punched_in: boolean;
  summary: { first_in: string | null; last_out: string | null; behavior: string | null; total_seconds: number; break_seconds: number; payable_seconds: number; punches: Punch[] };
  last_attendance: { in_time: string | null; out_time: string | null } | null;
}
/** POST /employee/punch → data */
interface PunchResult { action: 'punch_in' | 'punch_out'; punch_in_time: string | null; punch_out_time: string | null; needs_approval: boolean; attendance: { in_time: string | null; out_time: string | null } }
interface Day { date: string; total_seconds: number; overtime_seconds: number; shortfall_seconds: number; payable_seconds: number; status: string }
const ord = (d: number) => (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th');
/** whole minutes, the precision fmtHm displays */
const wholeMin = (sec: number) => Math.floor(Math.max(0, Math.round(sec)) / 60);
/** signed "HH:MM" from minutes */
const signedMin = (min: number) => `${min < 0 ? '-' : ''}${fmtHm(Math.abs(min) * 60)}`;

export default function Body() {
  const { staff } = useStaffSession();
  const dash = useStaff<Dash>('/employee/dashboard', undefined, { refetchInterval: 60000 });
  const month = useStaff<Day[]>('/employee/attendance');
  const d = dash.data?.data;
  const tz = d?.timezone ?? staff.timezone ?? 'Asia/Kolkata';
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const clock = useMemo(() => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true }).formatToParts(now), [now, tz]);
  const part = (t: string) => clock.find((x) => x.type === t)?.value ?? '';
  const hour24 = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(now));
  const dateParts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(now);
  const dp = (t: string) => dateParts.find((x) => x.type === t)?.value ?? '';
  const dateText = `${dp('weekday')}, ${dp('day')}${ord(Number(dp('day')))} ${dp('month')} ${dp('year')}`;
  const greeting = hour24 < 12 ? 'Good Morning' : hour24 < 17 ? 'Good Afternoon' : 'Good Evening';
  const userName = staff.name ? staff.name[0].toUpperCase() + staff.name.slice(1) : '';

  const last_attendance = d?.last_attendance ?? null;
  const first_attendance = d ? { behavior: d.summary.behavior, in_time: d.summary.first_in } : null;
  const today_records = d?.summary.punches ?? [];
  const today_logs: { detail: string; created_at: string }[] = [];
  const worked = d?.summary.total_seconds ?? 0;
  const payable = d?.summary.payable_seconds ?? 0;
  const days = month.data?.data ?? [];
  const mWorked = days.reduce((a, x) => a + x.total_seconds, 0);
  const mTarget = days.reduce((a, x) => a + x.payable_seconds, 0);
  const worked_percentage = mTarget ? Math.min(100, Math.round((mWorked / mTarget) * 100)) : 0;
  const monthly_worked_text = fmtHm(mWorked);
  const monthly_shortage_text = fmtHm(days.reduce((a, x) => a + x.shortfall_seconds, 0));
  const monthly_overtime_text = fmtHm(days.reduce((a, x) => a + x.overtime_seconds, 0));
  const total_work_hours = fmtHm(mTarget);
  // computed from the same whole minutes shown for Scheduled / Worked, so Scheduled − Worked always matches Balance
  const balance = signedMin(wholeMin(worked) - wholeMin(payable));

  // first load: placeholders instead of zero values; a failed load shows "—" and an error banner (never fake zeros)
  const dashLoading = dash.isPending;
  const dashFailed = !d && dash.isError;
  const monthLoading = month.isPending;
  const monthFailed = !month.data && month.isError;
  const show = (text: ReactNode, loading: boolean, failed: boolean) => (loading ? <span className="dash-skeleton" aria-hidden="true"></span> : failed ? '—' : text);
  const loadError = dashFailed ? dash.error : monthFailed ? month.error : null;

  // remote staff mark attendance from the Hajri mobile app only; the web punch is for office staff
  const isRemote = staff.is_remote == 1;
  const nextAction: 'in' | 'out' = last_attendance?.in_time && !last_attendance.out_time ? 'out' : 'in';
  const [phase, setPhase] = useState<'' | 'locating' | 'saving'>('');
  // the server's minimum gap between punches: when it rejects a punch it returns `remaining_time` (seconds)
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - now.getTime()) / 1000));
  const qc = useQueryClient();
  const punch = useAction(
    () =>
      new Promise<Envelope<PunchResult>>((resolve, reject) => {
        const send = (c?: GeolocationCoordinates) => {
          setPhase('saving');
          staffApi.post<PunchResult>('/employee/punch', c ? { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy } : {}).then(resolve, reject);
        };
        // location is sent when the browser allows it; the punch still goes through without it
        if (!navigator.geolocation) return void send();
        setPhase('locating');
        navigator.geolocation.getCurrentPosition((p) => void send(p.coords), () => void send(), { enableHighAccuracy: true, timeout: 8000 });
      }),
    {
      invalidate: ['/employee/dashboard', '/employee/attendance'],
      success: false,
      onSuccess: (res) => {
        setPhase('');
        setCooldownUntil(0);
        const r = res.data;
        // show the session the server just saved right away (the dashboard refetch then fills in the totals)
        qc.setQueriesData<Envelope<Dash>>({ predicate: (q) => q.queryKey[0] === 'staff' && q.queryKey[2] === '/employee/dashboard' }, (old) =>
          old ? { ...old, data: { ...old.data, is_punched_in: r.action === 'punch_in', last_attendance: { in_time: r.attendance.in_time, out_time: r.attendance.out_time } } } : old,
        );
        const msg = r.action === 'punch_in' ? `Punched in at ${fmtTime12(r.punch_in_time)}` : `Punched out at ${fmtTime12(r.punch_out_time)}`;
        toast.success(r.needs_approval ? `${msg}. Sent to your admin for approval.` : msg);
      },
      onError: (e) => {
        setPhase('');
        const wait = e instanceof ApiError ? Number(e.body?.remaining_time) : NaN;
        if (wait > 0) setCooldownUntil(Date.now() + wait * 1000);
      },
    },
  );
  const busy = punch.isPending;
  const busyText = phase === 'locating' ? 'Getting location…' : nextAction === 'out' ? 'Punching out…' : 'Punching in…';
  const punchInOut = () => {
    if (isRemote || busy || !d || cooldownLeft > 0) return;
    punch.mutate();
  };
  /** Office staff only — Punch In / Punch Out tile: a button when it is the next action, a plain card otherwise. */
  const punchTile = (kind: 'in' | 'out', className: string, body: ReactNode) => {
    const actionable = !!d && nextAction === kind;
    if (!actionable) return <div className={`${className} punch-tile punch-tile-${kind}`}>{body}</div>;
    const hint = kind === 'out' ? 'Tap to punch out' : last_attendance?.in_time ? 'Tap to punch in again' : 'Tap to punch in';
    return (
      <button type="button" className={`${className} punch-tile punch-tile-${kind} is-actionable`} onClick={punchInOut} disabled={busy || cooldownLeft > 0} aria-busy={busy} aria-label={kind === 'out' ? 'Punch out' : 'Punch in'}>
        {body}
        <span className="punch-tile-hint" aria-live="polite">
          {busy ? (<><span className="spinner-border spinner-border-sm" aria-hidden="true"></span>{busyText}</>)
            : cooldownLeft > 0 ? (<><i className="fa-regular fa-hourglass-half" aria-hidden="true"></i>Available in {cooldownLeft}s</>)
            : (<>{hint}<i className="fa-solid fa-arrow-right" aria-hidden="true"></i></>)}
        </span>
      </button>
    );
  };
  const trackPoints = today_records.filter((r) => r.latitude != null && r.longitude != null).map((r) => ({ latitude: r.latitude as number, longitude: r.longitude as number, label: r.in_time ?? '' }));

  return (
    <>

    <main className="flex-1 p-lg-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-8 max-w-[1600px] mx-auto">
                {isRemote ? (
                    <div className="remote-attendance-card mt-4" role="note" aria-labelledby="remote-attendance-title">
                        <span className="remote-attendance-icon" aria-hidden="true"><i className="fa-solid fa-mobile-screen-button"></i></span>
                        <div className="remote-attendance-text">
                            <h3 id="remote-attendance-title">Remote Attendance</h3>
                            <p>Your attendance is managed through the Hajri mobile application. Please use the mobile app to Punch In and Punch Out.</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-end mt-4 mb-4">
                        <button type="button" className={`btn-punch ${nextAction === 'out' ? 'btn-punch-out' : 'btn-punch-in'}`} onClick={punchInOut} disabled={busy || !d || cooldownLeft > 0} aria-busy={busy}>
                            {busy ? (<><span className="spinner-border spinner-border-sm" aria-hidden="true"></span>{busyText}</>)
                                : cooldownLeft > 0 ? (<><i className="fa-regular fa-hourglass-half" aria-hidden="true"></i>{nextAction === 'out' ? 'Punch Out' : 'Punch In'} in {cooldownLeft}s</>)
                                : (<><i className={`fa-solid ${nextAction === 'out' ? 'fa-right-from-bracket' : 'fa-right-to-bracket'}`} aria-hidden="true"></i>{nextAction === 'out' ? 'Punch Out' : 'Punch In'}</>)}
                        </button>
                    </div>
                )}
                {loadError && (
                    <div className="dash-error" role="alert">
                        <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                        <div className="dash-error-text">
                            <strong>We couldn&apos;t load your attendance.</strong>
                            <span>{loadError.message}</span>
                        </div>
                        <button type="button" className="dash-error-retry" onClick={() => { void dash.refetch(); void month.refetch(); }} disabled={dash.isFetching || month.isFetching}>
                            {dash.isFetching || month.isFetching ? 'Retrying…' : 'Retry'}
                        </button>
                    </div>
                )}
                
                    
                        
                        
                        
                          
                            
                            
                            
                            
                            
                                
                                    
                                        
                                    
                                        
                                        
                                        
                                    
                                
                                    
                                    
                                        
                                            
                                            
                                        
                                            
                                            
                                            
                                            
                                            
                                            
                                            
                                            
                                        
                                    
                                    
                                        
                                            
                                            
                                        
                                            
                                            
                                            
                                            
                                            
                                            
                                            
                                            
                                        
                                    
                                
                            
                    
                        
                            
                                
                                
                            
                                
                                
                                    
                                        
                                        
                                        
                                    
                                        
                                        
                                        
                                    
                                        
                                        
                                        
                                    
                                        
                                        
                                        
                                    
                                
                                
                                    
                                        
                                        
                                    
                                        
                                        
                                        
                                    
                                
                                    
                                        
                                            
                                            
                                        
                                             
                                            
                                        
                                    
                                        
                                            
                                            
                                        
                                             
                                            
                                        
                                    
                                        
                                            
                                            
                                        
                                             
                                            
                                        
                                    
                                
                            
                        
                    
                                <div className="max-w-5xl w-full mx-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="rounded-xl border bg-card text-card-foreground md:col-span-2 border overflow-hidden relative">
                            <div className="absolute right-0 top-0 h-full w-1/3 bg-blue-50/50 -skew-x-12 translate-x-12 z-0">
                            </div>
                            <div className="p-6 relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse"></div>
                                            <span className="text-sm text-muted-foreground font-medium">Current Time</span>
                                        </div>
                                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-0">
                                            <span id="live-time">{(`${part('hour')}:${part('minute')}`)}</span>
                                            <span className="text-xl font-normal text-muted-foreground" id="live-period">{(part('dayPeriod'))}</span>
                                        </h1>
                                    </div>
                                    <div className="flex flex-col items-end" style={{ marginTop: "35px" }}>
                                        {(last_attendance && last_attendance.in_time && first_attendance) && (<>
                                            <div className="flex items-center">
                                                {(first_attendance.behavior === 'Late') ? (<>
                                                    <span className="px-3 py-1 behavior rounded-full text-xs font-semibold bg-red-500 text-white shadow-sm ring-1 ring-white/20" style={{ borderRadius: "5px 0px 0px 5px", fontSize: "14px" }}>Late</span>
                                                </>) : (first_attendance.behavior === 'Early') ? (<>
                                                    <span className="px-3 py-1 behavior rounded-full text-xs font-semibold bg-orange-500 text-white shadow-sm ring-1 ring-white/20" style={{ backgroundColor: "#fc6510", borderRadius: "5px 0px 0px 5px", fontSize: "14px" }}>Early</span>
                                                </>) : (first_attendance.behavior === 'Regular') ? (<>
                                                    <span className="px-3 py-1 behavior rounded-full text-xs font-semibold bg-green-500 text-white shadow-sm ring-1 ring-white/20" style={{ borderRadius: "5px 0px 0px 5px", fontSize: "14px" }}>Regular</span>
                                                </>) : null}
                                            </div>
                                        </>)}
                                        <div className="bg-blue-100/50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                                            {(dateText)}
                                        </div>
                                    </div>
                                </div>
                                <div className="mb-8">
                                    <h2 className="text-xl font-semibold mb-1">{(greeting)}, {(userName)} 👋</h2>
                                    <p className="text-muted-foreground">Don't forget to take a break today!</p>
                                </div>
                                {isRemote ? (
                                    // remote staff punch from the mobile app: today's times are shown read-only, no punch controls
                                    <div className="remote-today" role="group" aria-label="Today's attendance">
                                        <div className="remote-today-item">
                                            <span className="remote-today-label">First In</span>
                                            <span className="remote-today-value">{show(last_attendance?.in_time ? fmtTime12(first_attendance?.in_time) : '--:--', dashLoading, dashFailed)}</span>
                                        </div>
                                        <div className="remote-today-item">
                                            <span className="remote-today-label">Last Out</span>
                                            <span className="remote-today-value">{show(last_attendance?.out_time ? fmtTime12(last_attendance.out_time) : '--:--', dashLoading, dashFailed)}</span>
                                        </div>
                                        <span className="remote-today-source"><i className="fa-solid fa-mobile-screen-button" aria-hidden="true"></i>Marked from the mobile app</span>
                                    </div>
                                ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    {punchTile('in', 'bg-green-50/50 p-4 rounded-xl border border-green-100 relative', (<>
                                        <span className="flex items-center gap-2 mb-2 text-green-600">
                                            <span className="p-1.5 bg-green-100 rounded-full">
                                                <I.If7254e />
                                            </span>
                                        </span>
                                        <span className="punch-tile-label text-xs font-medium text-green-600/70 uppercase tracking-wider mb-1">Punch In</span>
                                        <span className="punch-tile-time text-lg font-bold text-slate-900">
                                            {show(last_attendance?.in_time ? fmtTime12(last_attendance.in_time) : '--:--', dashLoading, dashFailed)}
                                        </span>
                                        {first_attendance?.in_time && last_attendance?.in_time && first_attendance.in_time !== last_attendance.in_time && (
                                            <span className="punch-tile-sub">First in today {fmtTime12(first_attendance.in_time)}</span>
                                        )}
                                    </>))}
                                    {punchTile('out', 'bg-orange-50/50 p-4 rounded-xl border border-orange-100', (<>
                                        <span className="flex items-center gap-2 mb-2 text-orange-600">
                                            <span className="p-1.5 bg-orange-100 rounded-full">
                                                <I.I5a67ef />
                                            </span>
                                        </span>
                                        <span className="punch-tile-label text-xs font-medium text-orange-600/70 uppercase tracking-wider mb-1">Punch Out</span>
                                        <span className="punch-tile-time text-lg font-bold text-slate-900">
                                            {show(last_attendance?.out_time ? fmtTime12(last_attendance.out_time) : '--:--', dashLoading, dashFailed)}
                                        </span>
                                    </>))}
                                </div>
                                )}
                                </div>
                            </div>
                            <div className="rounded-xl border bg-card text-card-foreground border">
                                <div className="flex flex-col space-y-1.5 p-6 pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="font-semibold tracking-tight text-base">Today's Log</div>
                                        
                                            
                                            
                                    </div>
                                </div>
                                <div className="p-6 grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <div className="p-2 bg-blue-50 w-fit rounded-full text-blue-600 mb-2">
                                            <I.Ic84474 />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Scheduled</p>
                                        <p className="text-lg font-bold">
                                            {show(fmtHm(payable), dashLoading, dashFailed)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="p-2 bg-green-50 w-fit rounded-full text-green-600 mb-2">
                                            <I.I543b56 />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Worked</p>
                                        <p className="text-lg font-bold" id="today_worked_timer">
                                            {show(fmtHm(worked), dashLoading, dashFailed)}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="p-2 bg-orange-50 w-fit rounded-full text-orange-600 mb-2">
                                            <I.If89d61 />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Break</p>
                                        <p className="text-lg font-bold">
                                            {show(fmtHm(d?.summary.break_seconds ?? 0), dashLoading, dashFailed)}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="p-2 bg-purple-50 w-fit rounded-full text-purple-600 mb-2">
                                            <I.Ic84474 />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Balance</p>
                                        <p className="text-lg font-bold" id="today_balance_timer">{show(balance, dashLoading, dashFailed)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border bg-card text-card-foreground border">
                            <div className="flex flex-col space-y-1.5 p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <div className="font-semibold tracking-tight text-lg">This Month</div>
                                        <p className="text-sm text-muted-foreground mb-0">Detailed summary of your working hours
                                        </p>
                                    </div>
                                    <div className="flex bg-muted/50 p-1 rounded-lg">
                                        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 hover-elevate active-elevate-2 border border-transparent min-h-8 rounded-md px-3 bg-background shadow-sm h-7 text-xs" style={{ fontSize: "12px" }}>
                                            Monthly
                                        </button>
                                        
                                            
                                            
                                        
                                            
                                            
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 pt-0">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-6">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <I.I9eb62d />
                                                    <span className="font-semibold text-sm">Total Progress</span>
                                                </div>
                                                <span className="text-blue-600 font-bold">{show(`${worked_percentage}%`, monthLoading, monthFailed)}</span>
                                            </div>
                                            <div aria-valuemax={100} aria-valuemin={0} role="progressbar" data-state="indeterminate" data-max="100" className="relative w-full overflow-hidden rounded-full h-3 bg-slate-100">
                                                <div data-state="indeterminate" data-max="100" className="h-full w-full flex-1 bg-primary transition-all" style={{ transform: "translateX(-" + ((100 - worked_percentage)) + "%)", background: "#2F8CFF" }}>
                                                </div>
                                            </div>
                                            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                                <span>{show(`${monthly_worked_text} Hrs`, monthLoading, monthFailed)}</span><span>Target:{" "}{show(`${total_work_hours} Hrs`, monthLoading, monthFailed)}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                                                <p className="text-xs text-muted-foreground mb-1">Shortage Time</p>
                                                <p className="text-xl font-bold text-red-700">{show(monthly_shortage_text, monthLoading, monthFailed)}</p>
                                            </div>
                                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                                <p className="text-xs text-muted-foreground mb-1">Worked Time</p>
                                                <p className="text-xl font-bold text-blue-700">{show(monthly_worked_text, monthLoading, monthFailed)}</p>
                                            </div>
                                            <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                                                <p className="text-xs text-muted-foreground mb-1">Overtime</p>
                                                <p className="text-xl font-bold text-green-700">{show(monthly_overtime_text, monthLoading, monthFailed)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-l pl-0 lg:pl-8 pt-6 lg:pt-0 border-t lg:border-t-0 recent-activity">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                                            Recent Activity</p>
                                        <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[5px] before:w-[1px] before:bg-slate-200" style={{ maxHeight: "180px", overflow: "scroll" }}>
                                            {(today_logs.length > 0) ? (<>
                                                {(today_logs ?? []).map((log, _i1) => (<Fragment key={_i1}>
                                                    <div className="flex gap-4 relative">
                                                        <div className="h-2.5 w-2.5 rounded-full bg-blue-600 mt-1.5 relative z-10 ring-4 ring-white">
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900 mb-0">{(log['detail'])}</p>
                                                            <p className="text-xs text-muted-foreground mb-0">
                                                                
                                                                {(timeAgo(log['created_at']))}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </Fragment>))}
                                            </>) : (<>
                                                {(today_records ?? []).map((today_record, _i2) => (<Fragment key={_i2}>
                                                    {(today_record.in_time) && (<>
                                                        <div className="flex gap-4 relative">
                                                            <div className="h-2.5 w-2.5 rounded-full bg-blue-600 mt-1.5 relative z-10 ring-4 ring-white">
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-900 mb-0">Punch In at{" "}{(fmtTime12(today_record.in_time))}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mb-0">Today</p>
                                                            </div>
                                                        </div>
                                                    </>)}
                                                    {(today_record.out_time != null) && (<>
                                                        <div className="flex gap-4 relative">
                                                            <div className="h-2.5 w-2.5 rounded-full bg-blue-600 mt-1.5 relative z-10 ring-4 ring-white">
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-900 mb-0">Punch Out at{" "}{(fmtTime12(today_record.out_time))}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground mb-0">Today</p>
                                                            </div>
                                                        </div>
                                                    </>)}
                                                </Fragment>))}
                                            </>)}
                                            
                                                
                                                
                                                    
                                                    
                                                    
                                                
                                            
                                                
                                                
                                                    
                                                    
                                                    
                                                
                                            
                                                
                                                
                                                    
                                                    
                                                    
                                                
                                        </div>
                                        
                                            
                                             
                                                 
                                                
                                                
                                                
                                            
                                    </div>
                                </div>
                            </div>
                        </div>
                        {(staff.is_remote == 1) && (<>
                            <div className="rounded-xl border bg-card text-card-foreground border-none shadow-sm mb-4">
                                <div id="mapdiv" style={{ width: "100%", height: "448px", position: "relative", borderRadius: "10px", overflow: "hidden" }}><StaffMap points={trackPoints} height="100%" />
                                    
                                    <button id="fullscreen-btn" style={{ backgroundColor: "#fff", borderRadius: "5px" }}>
                                        <i className="fa fa-expand" aria-hidden="true"></i> 
                                    </button>
                                </div>
                            </div>
                        </>)}
                    </div>
                </div>
            </div>
    </main>

    </>
  );
}
