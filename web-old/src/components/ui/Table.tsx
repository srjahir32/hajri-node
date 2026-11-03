import clsx from 'clsx';
import type { ReactNode } from 'react';

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('overflow-x-auto', className)}>{children}</div>;
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return <table className={clsx('w-full min-w-max border-collapse text-sm', className)}>{children}</table>;
}

export const THead = ({ children }: { children: ReactNode }) => <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted">{children}</thead>;
export const Th = ({ children, className, align }: { children?: ReactNode; className?: string; align?: 'right' | 'center' }) => (
  <th className={clsx('whitespace-nowrap px-4 py-3 font-medium', align === 'right' && 'text-right', align === 'center' && 'text-center', className)}>{children}</th>
);
export const Tr = ({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) => (
  <tr onClick={onClick} className={clsx('border-t border-line transition-colors', onClick && 'cursor-pointer hover:bg-surface2/70', className)}>{children}</tr>
);
export const Td = ({ children, className, align, colSpan, title }: { children?: ReactNode; className?: string; align?: 'right' | 'center'; colSpan?: number; title?: string }) => (
  <td colSpan={colSpan} title={title} className={clsx('px-4 py-3 align-middle', align === 'right' && 'text-right', align === 'center' && 'text-center', className)}>{children}</td>
);
