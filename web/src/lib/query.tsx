'use client';

import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { toast } from './toast';
import ClientNav from '@/components/shell/ClientNav';
import { ApiError, adminApi, business, staffApi, superApi, type Envelope, type Role } from './api';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            refetchOnWindowFocus: false,
            retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ClientNav />
      {children}
    </QueryClientProvider>
  );
}

const apis = { admin: adminApi, staff: staffApi, super: superApi };
type Query = Record<string, string | number | boolean | null | undefined>;

/** GET with caching. The admin's active business is part of the key so switching businesses refetches. */
export function useApi<T = unknown>(role: Role, path: string | null, query?: Query, opts: { enabled?: boolean; refetchInterval?: number; keepPrevious?: boolean } = {}) {
  const biz = role === 'admin' ? business.get() : undefined;
  return useQuery<Envelope<T>, ApiError>({
    queryKey: [role, biz, path, query ?? {}] as QueryKey,
    queryFn: () => apis[role].get<T>(path!, query),
    enabled: !!path && (opts.enabled ?? true),
    refetchInterval: opts.refetchInterval,
    placeholderData: opts.keepPrevious ? (prev) => prev : undefined,
  });
}

export const useAdmin = <T = unknown>(path: string | null, query?: Query, opts?: Parameters<typeof useApi>[3]) => useApi<T>('admin', path, query, opts);
export const useStaff = <T = unknown>(path: string | null, query?: Query, opts?: Parameters<typeof useApi>[3]) => useApi<T>('staff', path, query, opts);
export const useSuper = <T = unknown>(path: string | null, query?: Query, opts?: Parameters<typeof useApi>[3]) => useApi<T>('super', path, query, opts);

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

/**
 * Mutation helper: toasts the server message (or `success`), and invalidates the given query prefixes.
 * `invalidate` entries are matched against the path part of the key, e.g. '/admin/staff'.
 */
export function useAction<TVars = void, TData = unknown>(
  fn: (vars: TVars) => Promise<Envelope<TData>>,
  opts: { success?: string | false; invalidate?: string[]; onSuccess?: (res: Envelope<TData>, vars: TVars) => void; onError?: (e: unknown) => void } = {},
) {
  const qc = useQueryClient();
  return useMutation<Envelope<TData>, ApiError, TVars>({
    mutationFn: fn,
    onSuccess: (res, vars) => {
      if (opts.success !== false) toast.success(opts.success ?? (typeof res.message === 'string' && res.message !== 'success' ? res.message : 'Saved'));
      for (const p of opts.invalidate ?? []) qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[2] === 'string' && (q.queryKey[2] as string).startsWith(p) });
      opts.onSuccess?.(res, vars);
    },
    onError: (e) => {
      toast.error(errMsg(e));
      opts.onError?.(e);
    },
  });
}

export const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries();
