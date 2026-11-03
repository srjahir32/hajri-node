'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardBody, CardHeader, PageHeader } from '@/components/ui/Card';
import { ErrorState, Skeleton } from '@/components/ui/Misc';
import { Table, TableWrap, Td, Th, THead, Tr } from '@/components/ui/Table';
import { fmtMoney } from '@/lib/format';
import { useSuper } from '@/lib/query';

interface Row { month: string; label: string; revenue: number; new_businesses: number }

export default function SuperReportsPage() {
  const q = useSuper<Row[]>('/super-admin/reports', { months: 12 });
  if (q.error) return <ErrorState message={q.error.message} />;
  return (
    <>
      <PageHeader title="Reports" subtitle="Revenue and new businesses by month" />
      <Card>
        <CardHeader title="Last 12 months" />
        <CardBody>
          {!q.data ? <Skeleton className="h-72" /> : (
            <div className="h-72" role="img" aria-label="Revenue and signups by month">
              <ResponsiveContainer>
                <BarChart data={q.data.data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted)" />
                  <YAxis yAxisId="l" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted)" />
                  <YAxis yAxisId="r" orientation="right" allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted)" />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="l" dataKey="revenue" name="Revenue" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="r" dataKey="new_businesses" name="New businesses" fill="var(--success)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
        {q.data && (
          <TableWrap>
            <Table>
              <THead><tr><Th>Month</Th><Th align="right">Revenue</Th><Th align="right">New businesses</Th></tr></THead>
              <tbody>{[...q.data.data].reverse().map((r) => <Tr key={r.month}><Td>{r.label}</Td><Td align="right" className="tnum">{fmtMoney(r.revenue)}</Td><Td align="right" className="tnum">{r.new_businesses}</Td></Tr>)}</tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
