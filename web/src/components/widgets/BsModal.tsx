'use client';

import { useEffect, type ReactNode } from 'react';

/** Bootstrap 5 modal driven by React state (backdrop + centered dialog). */
export function BsModal({ open, onClose, className = '', dialogClassName = 'modal-dialog-centered', children, id, staticBackdrop }: { open: boolean; onClose: () => void; className?: string; dialogClassName?: string; children: ReactNode; id?: string; staticBackdrop?: boolean }) {
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('modal-open');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !staticBackdrop && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, staticBackdrop]);
  if (!open) return null;
  return (
    <>
      <div className={`modal fade show ${className}`} id={id} tabIndex={-1} style={{ display: 'block' }} role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && !staticBackdrop && onClose()}>
        <div className={`modal-dialog ${dialogClassName}`}>{children}</div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
