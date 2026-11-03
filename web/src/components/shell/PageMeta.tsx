'use client';

import { createContext, useContext, useEffect, useLayoutEffect, type ReactNode } from 'react';
import { usePageStylesheets } from '@/lib/pageCss';

/** The portal shell (sidebar + header) lives in the route-group layout so it stays mounted between pages; each page only reports its title. */
export const SetTitleContext = createContext<(title: string) => void>(() => {});

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function PageMeta({ title, css = [], children }: { title: string; css?: string[]; children: ReactNode }) {
  const setTitle = useContext(SetTitleContext);
  useIsoLayoutEffect(() => setTitle(title), [title, setTitle]);
  const ready = usePageStylesheets(css);
  return <>{ready ? children : null}</>;
}
