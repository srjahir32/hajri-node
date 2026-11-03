'use client';

import { Fragment } from 'react';
import * as I from '@/components/icons';
import { count } from '@/lib/blade';
import { useMemo, useState } from 'react';
import { useAdmin } from '@/lib/query';
import { monthStr, todayStr } from '@/lib/format';
import { MonthPicker } from '@/components/widgets/MonthPicker';
import { ApexChart } from '@/components/widgets/ApexChart';
import { LiveMap } from './LiveMap';
import { navigate } from '@/lib/navigate';

interface StaffRow { id: number; full_name: string; photo: string | null; department: string | null }
interface DashboardData {
  date: string;
  count: { staff_count: number; present_count: number; absent_count: number; halfday_count: number; late_count: number; pending_count: number };
  total_department: number;
  present_staff: StaffRow[];
  absent_staff: StaffRow[];
  half_day_staff: StaffRow[];
  department_wise_late_count: { id: number; name: string; late_count: number }[];
  pending: { attendance: number; leaves: number };
  upcoming_holidays: { id: number; name: string; date: string }[];
}
interface ChartData { present: { count: number }[]; absent: { count: number }[]; half_day: { count: number }[] }

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Same shape the Blade view loops over: groups with a `Staff` list. */
const toGroups = (rows: StaffRow[] = []) =>
  rows.map((r) => ({ staff_id: r.id, Staff: [{ name: r.full_name, staffPhoto: r.photo ? [{ photo: r.photo }] : [], Department: { name: r.department } }] }));

export default function Body() {
  const [month, setMonth] = useState(monthStr());
  const dash = useAdmin<DashboardData>('/admin/dashboard');
  const chartRes = useAdmin<ChartData>('/admin/dashboard/chart', { month });
  const d = dash.data?.data;
  const today = new Date(`${d?.date ?? todayStr()}T00:00:00`);
  const current_day = `${DAY_NAMES[today.getDay()]}, ${String(today.getDate()).padStart(2, '0')} ${MONTH_NAMES[today.getMonth()].slice(0, 3)} ${today.getFullYear()}`;
  const total_staff = d?.count.staff_count ?? 0;
  const total_department = d?.total_department ?? 0;
  const present_count = d?.count.present_count ?? 0;
  const absent_count = d?.count.absent_count ?? 0;
  const half_day = d?.count.halfday_count ?? 0;
  const late_staff_count = d?.count.late_count ?? 0;
  const pending_approval_count = (d?.pending.attendance ?? 0) + (d?.pending.leaves ?? 0);
  const percentage = total_staff > 0 ? Math.round((present_count / total_staff) * 10000) / 100 : 0;
  const absent_percentage = total_staff > 0 ? Math.round((absent_count / total_staff) * 10000) / 100 : 0;
  const presentstaff = useMemo(() => toGroups(d?.present_staff), [d]);
  const absentstaff = useMemo(() => toGroups(d?.absent_staff), [d]);
  const halfleave = useMemo(() => toGroups(d?.half_day_staff), [d]);
  const presentstaff_count = present_count;
  const absentstaff_count = absent_count;
  const halfleave_count = half_day;
  const department_wise_late_count = (d?.department_wise_late_count ?? []).filter((x) => x.late_count > 0);
  const holiday = (d?.upcoming_holidays ?? []).map((h) => ({ holiday_name: h.name, holiday_date: h.date }));
  const goStatus = (status: string) => {
    try {
      localStorage.setItem('attendanceStatus', status);
    } catch {}
    navigate('/attendance-new');
  };
  const chart = chartRes.data?.data;
  const days = chart?.present.length ?? 0;
  const presentCounts = chart?.present.map((x) => x.count) ?? [];
  const absentCounts = chart?.absent.map((x) => x.count) ?? [];
  const halfdayCounts = chart?.half_day.map((x) => x.count) ?? [];
  const maxCount = Math.max(0, ...presentCounts) + Math.max(0, ...absentCounts) + Math.max(0, ...halfdayCounts);
  const yMax = maxCount !== 0 ? maxCount : 20;
  return (

    <>

    <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-8 max-w-[1600px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h2>
                        <p className="text-muted-foreground text-sm mt-1 mb-0">{current_day}</p>
                    </div>
                    
                        
                            
                                  
                                
                                
                                
                                
                                
                            
                            
                        
                             
                            
                            
                                  
                                
                                
                            
                        
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                        <div className="h-full flex flex-col justify-between rounded-2xl border p-4 sm:p-6 relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-200 text-blue-700 hover:shadow-md transition-shadow" style={{ transform: "none" }}>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Total Staff
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-4xl font-bold text-gray-900 tracking-tight">{(total_staff)}</h3>
                                        
                                    </div>
                                    
                                </div>
                                <div className="p-3 rounded-xl shadow-lg transform rotate-3 transition-transform group-hover:rotate-6 bg-blue-500 text-white shadow-blue-200">
                                    <I.I033f72 />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 font-medium flex items-center gap-1 mb-0">
                                Across {(total_department)} Departments</p>
                        </div>
                    </div>
                    <div>
                        <div className="h-full flex flex-col justify-between rounded-2xl border p-4 sm:p-6 relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-200 text-green-700 hover:shadow-md transition-shadow" style={{ transform: "none" }}>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Present</p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-4xl font-bold text-gray-900 tracking-tight">{(present_count)}</h3>
                                    </div>
                                    
                                </div>
                                <div className="p-3 rounded-xl shadow-lg transform rotate-3 transition-transform group-hover:rotate-6 bg-green-500 text-white shadow-green-200">
                                    <I.Ie31983 />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 font-medium flex items-center gap-1 mb-0">{percentage}%
                                of total staff</p>
                        </div>
                    </div>
                    <div>
                        <div className="h-full flex flex-col justify-between rounded-2xl border p-4 sm:p-6 relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-200 text-red-700 hover:shadow-md transition-shadow" style={{ transform: "none" }}>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Absent
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-4xl font-bold text-gray-900 tracking-tight">{(absent_count)}</h3>
                                        
                                    </div>
                                    
                                </div>
                                <div className="p-3 rounded-xl shadow-lg transform rotate-3 transition-transform group-hover:rotate-6 bg-red-500 text-white shadow-red-200">
                                    <I.I97b6fa />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 font-medium flex items-center gap-1 mb-0">
                                {absent_percentage}% of total staff
                            </p>
                        </div>
                    </div>
                    <div>
                        <div className="h-full flex flex-col justify-between rounded-2xl border p-4 sm:p-6 relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-200 text-yellow-700 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Half
                                        Leave</p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-4xl font-bold text-gray-900 tracking-tight">{(half_day)}</h3>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl shadow-lg transform rotate-3 transition-transform group-hover:rotate-6 bg-yellow-500 text-white shadow-yellow-200">
                                    <I.I547611 />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 font-medium flex items-center gap-1 mb-0">
                                {((half_day !== 0) ? half_day + ' requests today' : 'No requests today')}
                            </p>
                        </div>
                    </div>
                    <div>
                        <div className="h-full flex flex-col justify-between rounded-2xl border p-4 sm:p-6 relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-200 text-purple-700 hover:shadow-md transition-shadow" style={{ backgroundImage: "linear-gradient(to bottom right, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.05))", borderColor: "rgb(233, 213, 255)", color: "rgb(126, 34, 206)" }}>
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Late
                                        Arrival</p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-4xl font-bold text-gray-900 tracking-tight">{(late_staff_count)}
                                        </h3>
                                        
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl shadow-lg transform rotate-3 transition-transform group-hover:rotate-6 bg-purple-500 text-white shadow-purple-200" style={{ backgroundColor: "rgb(168, 85, 247)", "--tw-shadow-color": "rgb(233, 213, 255)" as never } as import('react').CSSProperties}>
                                    <I.Ibdab93 />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 font-medium flex items-center gap-1 mb-0">Across{" "}{(total_department)} Departments
                            </p>
                        </div>
                    </div>
                    <div>
                        <a href={"/attendance/attendance_requests_new"} className="block h-full group">
                            <div className="h-full flex flex-col justify-between rounded-2xl border p-4 sm:p-6 relative overflow-hidden transition-all duration-300 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-200 text-indigo-700 hover:shadow-lg hover:border-indigo-300 transform hover:-translate-y-1 hover:shadow-md transition-shadow" style={{ backgroundImage: "linear-gradient(to bottom right, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.05))", borderColor: "rgb(199, 210, 254)", color: "rgb(67, 56, 202)" }}>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Pending
                                            Approval</p>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-4xl font-bold text-gray-900 tracking-tight">
                                                {(pending_approval_count)}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-xl shadow-lg transform rotate-3 transition-transform group-hover:rotate-6 bg-indigo-500 text-white shadow-indigo-200" style={{ backgroundColor: "rgb(99, 102, 241)", "--tw-shadow-color": "rgb(199, 210, 254)" as never } as import('react').CSSProperties}>
                                        <I.Id11acf />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2 font-medium flex items-center gap-1 mb-0">
                                    {((pending_approval_count !== 0) ? pending_approval_count + ' requests pending' : 'No requests pending')}
                                </p>
                            </div>
                        </a>
                    </div>
                </div>
                
                     
                        
                            
                                
                                
                                    
                                    
                                    
                                
                            
                                
                                     
                                    
                                    
                                    
                                    
                                    
                                
                            
                        
                        
                     
                        
                            
                                
                                
                                    
                                    
                                
                                
                                
                                
                                
                                
                                
                            
                                
                                     
                                    
                                    
                                    
                                
                            
                        
                        
                     
                        
                            
                                
                                    
                                    
                                    
                                
                                
                                
                                
                                
                                
                            
                                
                                     
                                    
                                    
                                    
                                    
                                    
                                
                            
                        
                        
                    
                        
                            
                                
                                
                                    
                                    
                                
                                
                            
                                
                                      
                                    
                                    
                                    
                                    
                                
                            
                        
                        
                     
                        
                            
                                
                                
                                    
                                    
                                    
                                
                                
                            
                                
                                    
                                    
                                    
                                    
                                
                            
                        
                        
                    
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-3 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-100 rounded-md">
                                    <I.Idb9624 />
                                </div>
                                Live Field Tracking
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>Live Updates
                                </span>
                            </div>
                        </div>
                        <div className="bg-slate-900 rounded-2xl overflow-hidden h-[450px] relative shadow-xl border border-slate-800 group transition-all hover:shadow-2xl hover:shadow-indigo-500/10">
                            <LiveMap />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white rounded-2xl border p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">Attendance Trends</h3>
                                <p className="text-sm text-gray-500 mb-0">Overview of staff presence this month</p>
                            </div>
                            <MonthPicker id="datepicker" name="start_month" className="attendance_status_month proxima_nova_semibold" value={month} onChange={setMonth} maxMonth={monthStr()} />
                        </div>
                        <div className="h-[320px] w-full">
                            <div id="chart">
                                <ApexChart
                                    type="bar"
                                    height={300}
                                    series={[
                                        { name: 'On Time', data: presentCounts },
                                        { name: 'Absent / No Data', data: absentCounts },
                                        { name: 'Half Leave', data: halfdayCounts },
                                    ]}
                                    options={{
                                        chart: { type: 'bar', height: 300, stacked: true, toolbar: { show: false }, zoom: { enabled: true } },
                                        plotOptions: { bar: { horizontal: false, borderRadius: 5 } },
                                        xaxis: { type: 'category', categories: Array.from({ length: days }, (_, i) => String(i + 1)) },
                                        yaxis: { min: 0, max: yMax, tickAmount: yMax < 6 ? yMax : 6, labels: { style: { fontSize: '14px' }, formatter: (v: number) => v.toFixed(0) } },
                                        legend: { position: 'bottom', offsetX: -50 },
                                        fill: { opacity: 1 },
                                        dataLabels: { enabled: false },
                                        colors: ['#3AC74B', '#FF6857', '#FEBD0B'],
                                        responsive: [
                                            { breakpoint: 1024, options: { chart: { height: 250 }, legend: { position: 'bottom', fontSize: '12px', offsetX: -10 } } },
                                            { breakpoint: 600, options: { chart: { height: 200 }, plotOptions: { bar: { borderRadius: 2, columnWidth: '70%' } }, legend: { position: 'bottom', fontSize: '10px', offsetX: 0 } } },
                                        ],
                                    }}
                                />
                            </div>

                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border p-0 flex flex-col h-full hover:shadow-md transition-shadow">
                        <div className="p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                            <div className="flex items-center">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">Upcoming Holidays</h3>
                                    <p className="text-sm text-gray-500 mb-0">Holidays for this month</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col">
                            {(count(holiday) != 0) ? (<>
                                <div className="divide-y divide-gray-100">
                                    {(holiday ?? []).map((holidays, _i1) => (<Fragment key={_i1}>
                                        <div className="p-3 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all duration-300 group cursor-pointer">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex flex-col items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                                                            
                                                            <span className="text-xs font-bold text-indigo-600 uppercase leading-none">{MONTH_NAMES[new Date(holidays.holiday_date + 'T00:00:00').getMonth()].slice(0, 3)}</span>
                                                            <span className="text-lg font-bold text-gray-900 leading-none">{holidays.holiday_date.slice(8, 10)}</span>
                                                        </div>
                                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full border-2 border-white shadow-sm">
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 text-sm group-hover:text-indigo-700 transition-colors capitalize">
                                                            {(holidays['holiday_name'])}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 mt-0.5 mb-0">
                                                            {(() => { const dt = new Date(holidays.holiday_date + 'T00:00:00'); return `${DAY_NAMES[dt.getDay()]}, ${MONTH_NAMES[dt.getMonth()]} ${String(dt.getDate()).padStart(2, '0')}, ${dt.getFullYear()}`; })()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Fragment>))}
                                </div>
                            </>) : (<>
                                <div className="flex-1 flex flex-col items-center justify-center p-8">
                                    <div className="w-40 h-40 bg-white rounded-full shadow-sm flex items-center justify-center mb-6 relative border border-dashed border-gray-200">
                                        <div className="absolute inset-0 bg-blue-50 rounded-full scale-90 opacity-50 animate-pulse">
                                        </div>
                                        <I.Id4fe53 />
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-lg">No Holidays Found</h4>
                                    <p className="text-gray-500 text-sm text-center mt-2 max-w-[200px]">There are no holidays
                                        scheduled for {MONTH_NAMES[today.getMonth()]} {today.getFullYear()}.</p>
                                    
                                        
                                        
                                </div>
                            </>)}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white rounded-2xl border overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-300">
                        <div className="px-4 py-4 font-semibold text-sm border-b flex justify-between items-center bg-emerald-50 text-emerald-700 border-emerald-100">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full animate-pulse bg-emerald-500"></span>Present Staff
                            </div>
                            {(presentstaff_count > 5) && (<>
                                <a className="see_employee_status" data-status="Present" onClick={() => goStatus("Present")}>
                                    <span className="text-xs font-normal opacity-80 bg-white/50 px-2 py-0.5 rounded-full cursor-pointer">See
                                        all</span>
                                </a>
                            </>)}
                        </div>
                        <div className="flex-1 min-h-[240px] bg-white">
                            {(presentstaff_count > 0) ? (<>
                                {(presentstaff ?? []).map((presentstaffs, _i2) => (<Fragment key={_i2}>
                                    {(presentstaffs['Staff'] ?? []).map((staff, _i3) => (<Fragment key={_i3}>
                                        <div className="flex items-center justify-between py-2 px-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 gap-2 transition-colors duration-200">
                                            <a href={"/staff/staff-profile-new/" + ((presentstaffs['staff_id']))} className="flex items-center gap-3 min-w-0 flex-1 group">
                                                <div className="relative shrink-0">
                                                    {(count(staff.staffPhoto) > 0) ? (<>
                                                        <img src={staff.staffPhoto[0].photo} className="w-8 h-8 rounded-full object-cover border border-gray-100 shadow-xs group-hover:scale-105 transition-transform duration-200" alt="" />
                                                    </>) : (<>
                                                        <img src={"/assets/admin/images/dummy/dummy-user.svg"} className="w-8 h-8 rounded-full object-cover border border-gray-100 shadow-xs" alt="" />
                                                    </>)}
                                                </div>
                                                <div className="min-w-0 flex flex-col">
                                                    <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors duration-200 block truncate" title={(staff['name'])}>
                                                        {(staff['name'])}
                                                    </span>
                                                    <span className="text-xs text-gray-400 mt-0.5 block truncate" title={(staff.Department.name ?? 'N/A')}>
                                                        {(staff.Department.name ?? 'N/A')}
                                                    </span>
                                                </div>
                                            </a>
                                        </div>
                                    </Fragment>))}
                                </Fragment>))}
                            </>) : (<>
                                <div className="flex flex-col items-center justify-center py-16 text-center h-full">
                                    <div className="w-20 h-20 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center mb-4 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gray-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                        </div>
                                        <I.I4e57ea />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">No Data Available</p>
                                    <p className="text-xs text-gray-400 mt-1 max-w-[150px]">No staff marked as present today yet.
                                    </p>
                                </div>
                            </>)}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-300">
                        <div className="px-4 py-4 font-semibold text-sm border-b flex justify-between items-center bg-rose-50 text-rose-700 border-rose-100">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full animate-pulse bg-rose-500"></span>Absent Staff
                            </div>
                            {(absentstaff_count > 5) && (<>
                                <a className="see_employee_status" data-status="Absent" onClick={() => goStatus("Absent")}>
                                    <span className="text-xs font-normal opacity-80 bg-white/50 px-2 py-0.5 rounded-full cursor-pointer">See
                                        all</span>
                                </a>
                            </>)}
                        </div>
                        <div className="flex-1 min-h-[240px] bg-white">
                            {(absentstaff_count > 0) ? (<>
                                {(absentstaff ?? []).map((absentstaffs, _i4) => (<Fragment key={_i4}>
                                    {(absentstaffs['Staff'] ?? []).map((staff, _i5) => (<Fragment key={_i5}>
                                        <div className="flex items-center justify-between py-2 px-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 gap-2 transition-colors duration-200">
                                            <a href={"/staff/staff-profile-new/" + ((absentstaffs['staff_id']))} className="flex items-center gap-3 min-w-0 flex-1 group">
                                                <div className="relative shrink-0">
                                                    {(count(staff.staffPhoto) > 0) ? (<>
                                                        <img src={staff.staffPhoto[0].photo} className="w-8 h-8 rounded-full object-cover border border-gray-100 shadow-xs group-hover:scale-105 transition-transform duration-200" alt="" />
                                                    </>) : (<>
                                                        <img src={"/assets/admin/images/dummy/dummy-user.svg"} className="w-8 h-8 rounded-full object-cover border border-gray-100 shadow-xs" alt="" />
                                                    </>)}
                                                </div>
                                                <div className="min-w-0 flex flex-col">
                                                    <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors duration-200 block truncate" title={(staff['name'])}>
                                                        {(staff['name'])}
                                                    </span>
                                                    <span className="text-xs text-gray-400 mt-0.5 block truncate" title={(staff.Department.name ?? 'N/A')}>
                                                        {(staff.Department.name ?? 'N/A')}
                                                    </span>
                                                </div>
                                            </a>
                                        </div>
                                    </Fragment>))}
                                </Fragment>))}
                            </>) : (<>
                                <div className="flex flex-col items-center justify-center py-16 text-center h-full">
                                    <div className="w-20 h-20 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center mb-4 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gray-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                        </div>
                                        <I.I4e57ea />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">No Data Available</p>
                                    <p className="text-xs text-gray-400 mt-1 max-w-[150px]">No staff marked as absent today yet.</p>
                                </div>
                            </>)}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-300">
                        <div className="px-4 py-4 font-semibold text-sm border-b flex justify-between items-center bg-amber-50 text-amber-700 border-amber-100">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full animate-pulse bg-amber-500"></span>Half Leave Staff
                            </div>
                            {(halfleave_count > 5) && (<>
                                <a className="see_employee_status" data-status="Half Day" onClick={() => goStatus("Half Day")}>
                                    <span className="text-xs font-normal opacity-80 bg-white/50 px-2 py-0.5 rounded-full cursor-pointer">See
                                        all</span>
                                </a>
                            </>)}
                            
                        </div>
                        <div className="flex-1 min-h-[240px] bg-white">
                            {(halfleave_count > 0) ? (<>
                                {(halfleave ?? []).map((halfleaves, _i6) => (<Fragment key={_i6}>
                                    {(halfleaves['Staff'] ?? []).map((staff, _i7) => (<Fragment key={_i7}>
                                        <div className="flex items-center justify-between py-2 px-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 gap-2 transition-colors duration-200">
                                            <a href={"/staff/staff-profile-new/" + ((halfleaves['staff_id']))} className="flex items-center gap-3 min-w-0 flex-1 group">
                                                <div className="relative shrink-0">
                                                    {(count(staff.staffPhoto) > 0) ? (<>
                                                        <img src={staff.staffPhoto[0].photo} className="w-8 h-8 rounded-full object-cover border border-gray-100 shadow-xs group-hover:scale-105 transition-transform duration-200" alt="" />
                                                    </>) : (<>
                                                        <img src={"/assets/admin/images/dummy/dummy-user.svg"} className="w-8 h-8 rounded-full object-cover border border-gray-100 shadow-xs" alt="" />
                                                    </>)}
                                                </div>
                                                <div className="min-w-0 flex flex-col">
                                                    <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors duration-200 block truncate" title={(staff['name'])}>
                                                        {(staff['name'])}
                                                    </span>
                                                    <span className="text-xs text-gray-400 mt-0.5 block truncate" title={(staff.Department.name ?? 'N/A')}>
                                                        {(staff.Department.name ?? 'N/A')}
                                                    </span>
                                                </div>
                                            </a>
                                        </div>
                                    </Fragment>))}
                                </Fragment>))}
                            </>) : (<>
                                <div className="flex flex-col items-center justify-center py-16 text-center h-full">
                                    <div className="w-20 h-20 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center mb-4 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gray-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                        </div>
                                        <I.I4e57ea />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">No Data Available</p>
                                    <p className="text-xs text-gray-400 mt-1 max-w-[150px]">No staff marked as half leave today yet.
                                    </p>
                                </div>
                            </>)}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-300">
                        <div className="px-4 py-4 font-semibold text-sm border-b flex justify-between items-center border-amber-100" style={{ backgroundImage: "linear-gradient(to bottom right, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.05))", borderColor: "rgb(233, 213, 255)", color: "rgb(126, 34, 206)" }}>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "rgb(126, 34, 206)" }}></span>Late Arrival Staff
                            </div>
                            
                            
                                
                                
                            
                            
                        </div>
                        <div className="flex-1 min-h-[240px] bg-white" style={{ maxHeight: "290px", overflow: "scroll", minHeight: "290px" }}>
                            {(count(department_wise_late_count) > 0) ? (<>
                                {(department_wise_late_count ?? []).map((value, _i8) => (<Fragment key={_i8}>
                                    <div className="flex items-center justify-between py-2 px-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 gap-2 transition-colors duration-200">
                                        <div className="min-w-0 flex-1">
                                            <span className="text-sm  text-gray-700 block truncate" title={(value.name)}>
                                                {(value.name)}
                                            </span>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className="inline-block text-xs font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100">
                                                {(value.late_count)}
                                            </span>
                                        </div>
                                    </div>
                                </Fragment>))}
                            </>) : (<>
                                <div className="flex flex-col items-center justify-center py-16 text-center h-full">
                                    <div className="w-20 h-20 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-center mb-4 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-purple-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                        </div>
                                        <I.I85568d />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">No Data Available</p>
                                    <p className="text-xs text-gray-400 mt-1 max-w-[150px]">No staff marked as Late today yet.</p>
                                </div>
                            </>)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    </>
  );
}
