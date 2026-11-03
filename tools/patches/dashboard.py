import re,sys
p=sys.argv[1]
s=open(p).read()
HEAD = open(__file__.replace('dashboard.py','dashboard.head.tsx')).read()
s=s.replace("""import { count } from '@/lib/blade';

export default function Body() {
  return (""", HEAD)
s=s.replace("{(current_day)}","{current_day}")
s=re.sub(r'defaultValue=\{\(date\(\'M Y\'\)\)\} readOnly="true" autoComplete="off" />','/>',s)
s=s.replace('<input type="text" id="datepicker" name="start_month" className="attendance_status_month proxima_nova_semibold" />','<MonthPicker id="datepicker" name="start_month" className="attendance_status_month proxima_nova_semibold" value={month} onChange={setMonth} maxMonth={monthStr()} />')
s=s.replace('<div id="chart"></div>',open(__file__.replace('dashboard.py','dashboard.chart.tsx')).read())
s=re.sub(r"\{/\* @php\s+// Handle date format.*?\*/\}","",s,flags=re.S)
s=re.sub(r"\{/\* @php\s+\$total = \$total_staff;\s+\$present = .*?\*/\}","",s,flags=re.S)
s=re.sub(r"\{/\* @php\s+\$total = \$total_staff;\s+\$absent = .*?\*/\}","",s,flags=re.S)
s=s.replace("{(percentage)}","{percentage}").replace("{(absent_percentage)}","{absent_percentage}")
s=s.replace("{(date.format('M'))}","{MONTH_NAMES[new Date(holidays.holiday_date + 'T00:00:00').getMonth()].slice(0, 3)}")
s=s.replace("{(date.format('d'))}","{holidays.holiday_date.slice(8, 10)}")
s=s.replace("{(date.format('l, F d, Y'))}","{(() => { const dt = new Date(holidays.holiday_date + 'T00:00:00'); return `${DAY_NAMES[dt.getDay()]}, ${MONTH_NAMES[dt.getMonth()]} ${String(dt.getDate()).padStart(2, '0')}, ${dt.getFullYear()}`; })()}")
s=s.replace("Object.entries(holiday ?? {}).map(([index, holidays], _i1) => (<Fragment key={_i1}>","(holiday ?? []).map((holidays, _i1) => (<Fragment key={_i1}>")
s=s.replace("""There are no holidays
                                        scheduled for December 2025.""","""There are no holidays
                                        scheduled for {MONTH_NAMES[today.getMonth()]} {today.getFullYear()}.""")
s=re.sub(r"src=\{\(asset\('assets/admin/images/staff_photos/' \+ staff\.staffPhoto\[0\]\.photo\)\)\}","src={staff.staffPhoto[0].photo}",s)
s=s.replace("/assets/admin/images/dummy/dummy-user.png","/assets/admin/images/dummy/dummy-user.svg")
s=re.sub(r'<a className="see_employee_status" data-status="([^"]+)">',r'<a className="see_employee_status" data-status="\1" onClick={() => goStatus("\1")}>',s)
s=re.sub(r'<div id="mapdiv".*?</button>\s*</div>','<LiveMap />',s,flags=re.S)
s=s.replace('"--tw-shadow-color": "rgb(233, 213, 255)"','"--tw-shadow-color": "rgb(233, 213, 255)" as never').replace('"--tw-shadow-color": "rgb(199, 210, 254)"','"--tw-shadow-color": "rgb(199, 210, 254)" as never')
open(p,'w').write(s)
