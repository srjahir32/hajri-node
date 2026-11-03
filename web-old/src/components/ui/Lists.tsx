'use client';

import { useState, type ReactNode } from 'react';
import { Card } from './Card';
import { EmptyState, ErrorState, Pagination, SearchInput, TableSkeleton } from './Misc';
import { Table, TableWrap, Th, THead } from './Table';
import { useDebounced } from '@/lib/hooks';
import { useSuper } from '@/lib/query';
import type { Pagination as Pg } from '@/lib/types';

/** Searchable, paginated table backed by a super-admin list endpoint. */
export function SuperList<T>({
  path,
  columns,
  row,
  extraQuery,
  toolbar,
  searchPlaceholder = 'Search…',
  empty = 'Nothing found',
}: {
  path: string;
  columns: { label: string; align?: 'right' | 'center' }[];
  row: (item: T) => ReactNode;
  extraQuery?: Record<string, string | number | undefined>;
  toolbar?: ReactNode;
  searchPlaceholder?: string;
  empty?: string;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const list = useSuper<T[]>(path, { search: q, page, per_page: 20, ...extraQuery }, { keepPrevious: true });
  const meta = list.data as unknown as Pg | undefined;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={searchPlaceholder} className="w-full sm:w-80" />
        {toolbar}
      </div>
      {list.error ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> : !list.data ? <TableSkeleton cols={columns.length} /> : list.data.data.length === 0 ? <EmptyState title={empty} /> : (
        <>
          <TableWrap>
            <Table>
              <THead><tr>{columns.map((c) => <Th key={c.label} align={c.align}>{c.label}</Th>)}</tr></THead>
              <tbody>{list.data.data.map((item) => row(item))}</tbody>
            </Table>
          </TableWrap>
          <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} total={meta?.total} onChange={setPage} />
        </>
      )}
    </Card>
  );
}
