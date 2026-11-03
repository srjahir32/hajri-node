'use client';

import { Fragment } from 'react';
import { useRouter } from 'next/navigation';
import * as I from '@/components/icons';

/** The "← Title" button with a breadcrumb trail that tops every settings view in the Laravel admin. */
export function BackCrumb({ title, crumbs }: { title: string; crumbs: string[] }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-1">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit group">
        <I.I145b1c />
        <span className="font-semibold text-lg">{title}</span>
      </button>
      <div className="flex items-center gap-2 text-sm text-muted-foreground ml-1">
        {crumbs.map((c, i) => (
          <Fragment key={c + i}>
            {i > 0 && <I.I8b8a74 />}
            <span className={i === crumbs.length - 1 ? 'text-foreground font-medium' : undefined}>{c}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
