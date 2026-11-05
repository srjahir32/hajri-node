'use client';

import dynamic from 'next/dynamic';
import { Fragment, useEffect, useMemo, useState } from 'react';
import * as I from '@/components/icons';
import { staffApi } from '@/lib/api';
import { useStaffSession } from '@/lib/auth';
import { useAction, useStaff } from '@/lib/query';
import { fmtHm, fmtTime12, timeAgo } from '@/lib/format';
import { toast } from '@/lib/toast';

const StaffMap = dynamic(() => import('@/components/widgets/StaffMap'), { ssr: false });

interface Punch { in_time: string | null; out_time: string | null; latitude?: number | null; longitude?: number | null }
interface Dash {
  date: string; timezone: string; is_punched_in: boolean;
  summary: { first_in: string | null; last_out: string | null; behavior: string | null; total_seconds: number; break_seconds: number; payable_seconds: number; punches: Punch[] };
  last_attendance: { in_time: string | null; out_time: string | null } | null;
}
interface Day { date: string; total_seconds: number; overtime_seconds: number; shortfall_seconds: number; payable_seconds: number; status: string }
const ord = (d: number) => (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th');
const signed = (sec: number) => `${sec < 0 ? '-' : ''}${fmtHm(Math.abs(sec))}`;

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
  const has_recent_activity = today_logs.length > 0 || today_records.some((r) => r.in_time || r.out_time != null);
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
  const balance = signed(worked - payable);

  const punch = useAction(
    () =>
      new Promise<Awaited<ReturnType<typeof staffApi.post>>>((resolve, reject) => {
        const send = (c?: GeolocationCoordinates) => staffApi.post('/employee/punch', c ? { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy } : {}).then(resolve, reject);
        if (!navigator.geolocation) return void send();
        navigator.geolocation.getCurrentPosition((p) => void send(p.coords), () => void send(), { enableHighAccuracy: true, timeout: 8000 });
      }),
    { invalidate: ['/employee/dashboard', '/employee/attendance'], success: 'Attendance marked successfully', onError: () => toast.error('Could not mark attendance') },
  );
  const punchInOut = () => punch.mutate();
  const trackPoints = today_records.filter((r) => r.latitude != null && r.longitude != null).map((r) => ({ latitude: r.latitude as number, longitude: r.longitude as number, label: r.in_time ?? '' }));

  return (
    <>

    <main className="flex-1 p-lg-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-8 max-w-[1600px] mx-auto">
                <div className="text-end mt-4 mb-4">
                    {(staff.is_remote == 0) && (<>

                        {(last_attendance == null) && (<>
                            <button className="btn-punch btn-punch-in" onClick={punchInOut} disabled={punch.isPending} style={{ color: "#fff", borderRadius: "8px" }}>Punch In</button>
                        </>)}
                        {(last_attendance) && (<>
                            {(last_attendance.in_time != null && last_attendance.out_time != null) && (<>
                                <button className="btn-punch btn-punch-in" onClick={punchInOut} disabled={punch.isPending} style={{ color: "#fff", borderRadius: "8px" }}>Punch In</button>
                            </>)}
                            {(last_attendance.in_time == null) ? (<>
                                <button className="btn-punch btn-punch-in" onClick={punchInOut} disabled={punch.isPending} style={{ color: "#fff", borderRadius: "8px" }}>Punch In</button>
                            </>) : (last_attendance.out_time == null) ? (<>
                                <button className="btn-punch btn-punch-out" onClick={punchInOut} disabled={punch.isPending} style={{ color: "#fff", borderRadius: "8px" }}>Punch Out</button>
                            </>) : null}
                        </>)}
                    </>)}
                </div>
                
                    
                        
                        
                        
                          
                            
                            
                            
                            
                            
                                
                                    
                                        
                                    
                                        
                                        
                                        
                                    
                                
                                    
                                    
                                        
                                            
                                            
                                        
                                            
                                            
                                            
                                            
                                            
                                            
                                            
                                            
                                        
                                    
                                    
                                        
                                            
                                            
                                        
                                            
                                            
                                            
                                            
                                            
                                            
                                            
                                            
                                        
                                    
                                
                            
                    
                        
                            
                                
                                
                            
                                
                                
                                    
                                        
                                        
                                        
                                    
                                        
                                        
                                        
                                    
                                        
                                        
                                        
                                    
                                        
                                        
                                        
                                    
                                
                                
                                    
                                        
                                        
                                    
                                        
                                        
                                        
                                    
                                
                                    
                                        
                                            
                                            
                                        
                                             
                                            
                                        
                                    
                                        
                                            
                                            
                                        
                                             
                                            
                                        
                                    
                                        
                                            
                                            
                                        
                                             
                                            
                                        
                                    
                                
                            
                        
                    
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 relative">
                                        <div className="flex items-center gap-2 mb-2 text-green-600">
                                            <div className="p-1.5 bg-green-1[;00 rounded-full">
                                                <I.If7254e />
                                            </div>
                                        </div>
                                        <p className="text-xs font-medium text-green-600/70 uppercase tracking-wider mb-1">Punch
                                            In</p>
                                        {(last_attendance && last_attendance.in_time) ? (<>
                                            <p className="text-lg font-bold text-slate-900">
                                                {(fmtTime12(first_attendance?.in_time))}</p>
                                        </>) : (<>
                                            <p className="text-lg font-bold text-slate-900">--:--</p>
                                        </>)}
                                    </div>
                                    <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                                        <div className="flex items-center gap-2 mb-2 text-orange-600">
                                            <div className="p-1.5 bg-orange-100 rounded-full">
                                                
                                                    <I.I5a67ef />
                                                </div>
                                            </div>
                                            <p className="text-xs font-medium text-orange-600/70 uppercase tracking-wider mb-1">
                                                Punch Out</p>
                                            {(last_attendance && last_attendance.out_time) ? (<>
                                                <p className="text-lg font-bold text-slate-900">
                                                    {(fmtTime12(last_attendance.out_time))}</p>
                                            </>) : (<>
                                                <p className="text-lg font-bold text-slate-900">--:--</p>
                                            </>)}
                                        </div>
                                    </div>
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
                                            {(fmtHm(payable))}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="p-2 bg-green-50 w-fit rounded-full text-green-600 mb-2">
                                            <I.I543b56 />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Worked</p>
                                        <p className="text-lg font-bold" id="today_worked_timer">
                                            {(fmtHm(worked))}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="p-2 bg-orange-50 w-fit rounded-full text-orange-600 mb-2">
                                            <I.If89d61 />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Break</p>
                                        <p className="text-lg font-bold">
                                            {(fmtHm(d?.summary.break_seconds ?? 0))}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="p-2 bg-purple-50 w-fit rounded-full text-purple-600 mb-2">
                                            <I.Ic84474 />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Balance</p>
                                        <p className="text-lg font-bold" id="today_balance_timer">{(balance)}</p>
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
                                                <span className="text-blue-600 font-bold">{(worked_percentage)}%</span>
                                            </div>
                                            <div aria-valuemax={100} aria-valuemin={0} role="progressbar" data-state="indeterminate" data-max="100" className="relative w-full overflow-hidden rounded-full h-3 bg-slate-100">
                                                <div data-state="indeterminate" data-max="100" className="h-full w-full flex-1 bg-primary transition-all" style={{ transform: "translateX(-" + ((100 - worked_percentage)) + "%)", background: "#2F8CFF" }}>
                                                </div>
                                            </div>
                                            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                                <span>{(monthly_worked_text)} Hrs</span><span>Target:{" "}{(total_work_hours)} Hrs</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                                                <p className="text-xs text-muted-foreground mb-1">Shortage Time</p>
                                                <p className="text-xl font-bold text-red-700">{(monthly_shortage_text)}</p>
                                            </div>
                                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                                <p className="text-xs text-muted-foreground mb-1">Worked Time</p>
                                                <p className="text-xl font-bold text-blue-700">{(monthly_worked_text)}</p>
                                            </div>
                                            <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                                                <p className="text-xs text-muted-foreground mb-1">Overtime</p>
                                                <p className="text-xl font-bold text-green-700">{(monthly_overtime_text)}</p>
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
                                        {/* Shown only once the dashboard data has loaded (not while loading or on error) and there is nothing to list. */}
                                        {(d && !has_recent_activity) && (<p className="text-sm text-muted-foreground mb-0">No recent activity</p>)}
                                        
                                            
                                             
                                                 
                                                
                                                
                                                
                                            
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
