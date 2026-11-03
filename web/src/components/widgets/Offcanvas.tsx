'use client';

import { useEffect, type ReactNode } from 'react';

/** Bootstrap 5 offcanvas (end side) driven by React state. Markup/classes as in the Laravel views. */
export function Offcanvas({ open, onClose, className = '', children, id }: { open: boolean; onClose: () => void; className?: string; children: ReactNode; id?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <>
      <div
        className={`offcanvas offcanvas-end daily-work-data-download ${className} ${open ? 'show' : ''}`}
        tabIndex={-1}
        id={id}
        style={{ visibility: open ? 'visible' : 'hidden' }}
        aria-hidden={!open}
      >
        {children}
      </div>
      {open && <div className="offcanvas-backdrop fade show" onClick={onClose} />}
    </>
  );
}

export function OffcanvasHeader({ onClose, closeIcon }: { onClose: () => void; closeIcon: ReactNode }) {
  return (
    <div className="offcanvas-header">
      <div className="popup-close-btns" onClick={onClose} aria-label="Close">
        {closeIcon}
      </div>
    </div>
  );
}
