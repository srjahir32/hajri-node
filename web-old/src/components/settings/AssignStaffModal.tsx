'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Avatar, ErrorState, PageLoader, SearchInput } from '@/components/ui/Misc';
import { adminApi } from '@/lib/api';
import { useAction, useAdmin } from '@/lib/query';

interface Row {
  id: number;
  name: string;
  phone_number: string;
  department?: string | null;
  photo: string | null;
  assigned: boolean;
  current_department?: string | null;
  current_shift?: string | null;
}

/** Shared "pick staff for this template/rule/department" dialog. */
export function AssignStaffModal({
  open,
  onClose,
  title,
  listPath,
  savePath,
  invalidate,
  extra,
  header,
  saveLabel = 'Apply',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  listPath: string;
  savePath: string;
  invalidate: string[];
  /** extra body fields (e.g. rotation settings) merged into the save request */
  extra?: Record<string, unknown>;
  /** extra controls shown above the staff list (e.g. rotation settings) */
  header?: ReactNode;
  saveLabel?: string;
}) {
  const q = useAdmin<Row[]>(open ? listPath : null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const initial = useMemo(() => new Set((q.data?.data ?? []).filter((r) => r.assigned).map((r) => r.id)), [q.data]);

  useEffect(() => setPicked(new Set(initial)), [initial]);

  const save = useAction(
    () => {
      const all = q.data?.data ?? [];
      return adminApi.post(savePath, {
        ...extra,
        selected_ids: [...picked],
        unselected_ids: all.filter((r) => !picked.has(r.id) && initial.has(r.id)).map((r) => r.id),
        staff_ids: [...picked],
      });
    },
    { invalidate, onSuccess: onClose },
  );

  const rows = (q.data?.data ?? []).filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.phone_number.includes(search));
  const allVisible = rows.length > 0 && rows.every((r) => picked.has(r.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <span className="mr-auto self-center text-sm text-muted">{picked.size} selected</span>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>{saveLabel}</Button>
        </>
      }
    >
      {q.error ? <ErrorState message={q.error.message} /> : !q.data ? <PageLoader /> : (
        <div className="space-y-3">
          {header}
          <div className="flex items-center justify-between gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search staff" className="flex-1" />
            <Checkbox
              label="Select all"
              checked={allVisible}
              onChange={(e) => setPicked((p) => {
                const n = new Set(p);
                rows.forEach((r) => (e.target.checked ? n.add(r.id) : n.delete(r.id)));
                return n;
              })}
            />
          </div>
          <ul className="max-h-96 divide-y divide-line overflow-y-auto rounded-lg border border-line">
            {rows.map((r) => (
              <li key={r.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface2">
                  <input type="checkbox" className="size-4 accent-brand" checked={picked.has(r.id)} onChange={(e) => setPicked((p) => { const n = new Set(p); if (e.target.checked) n.add(r.id); else n.delete(r.id); return n; })} />
                  <Avatar name={r.name} src={r.photo} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.name}</span>
                    <span className="block truncate text-xs text-muted">{[r.department ?? r.current_department, r.current_shift].filter(Boolean).join(' · ') || r.phone_number}</span>
                  </span>
                </label>
              </li>
            ))}
            {rows.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">No staff found.</li>}
          </ul>
        </div>
      )}
    </Modal>
  );
}
