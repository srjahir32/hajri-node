'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Point { day: number; date: string; count: number }

/** Present / absent / half-day staff per day for a month. */
export function MonthChart({ data }: { data: { present: Point[]; absent: Point[]; half_day: Point[] } }) {
  const rows = data.present.map((p, i) => ({ day: p.day, Present: p.count, Absent: data.absent[i]?.count ?? 0, 'Half day': data.half_day[i]?.count ?? 0 }));
  return (
    <div className="h-72 w-full" role="img" aria-label="Daily attendance chart">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted)" />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted)" />
          <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Present" stackId="a" fill="var(--success)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Half day" stackId="a" fill="var(--warning)" />
          <Bar dataKey="Absent" stackId="a" fill="var(--danger)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
