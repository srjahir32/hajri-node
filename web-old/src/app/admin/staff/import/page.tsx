'use client';

import { Download, Upload } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, PageHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { adminApi } from '@/lib/api';
import { errMsg } from '@/lib/query';
import { useQueryClient } from '@tanstack/react-query';

export default function ImportStaffPage() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: { row: number; message: string }[] } | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminApi.form<{ created: number; failed: { row: number; message: string }[] }>('POST', '/admin/staff/import', fd);
      setResult(res.data);
      toast.success(res.message);
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Import staff from Excel" subtitle="Add many people at once." actions={<Link href="/admin/staff" className="text-sm text-brand hover:underline">← Back to staff</Link>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="1. Download the template" />
          <CardBody className="space-y-3 text-sm text-muted">
            <p>Fill in one row per person. Phone numbers must be unique; departments that don&apos;t exist yet are created automatically.</p>
            <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => void adminApi.download('/admin/staff/import-template', undefined, 'staff-import-template.xlsx').catch((e) => toast.error(errMsg(e)))}>
              Download template
            </Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="2. Upload the completed file" />
          <CardBody className="space-y-3">
            <Input type="file" accept=".xlsx" className="h-auto py-2" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} />
            <Button disabled={!file} loading={busy} icon={<Upload className="size-4" />} onClick={() => void upload()}>Import</Button>
          </CardBody>
        </Card>
      </div>
      {result && (
        <Card className="mt-6">
          <CardHeader title="Result" subtitle={`${result.created} imported · ${result.failed.length} failed`} />
          {result.failed.length > 0 && (
            <ul className="divide-y divide-line text-sm">
              {result.failed.map((f) => <li key={f.row} className="flex gap-3 px-5 py-2.5"><span className="w-16 text-muted">Row {f.row}</span><span className="text-danger">{f.message}</span></li>)}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
