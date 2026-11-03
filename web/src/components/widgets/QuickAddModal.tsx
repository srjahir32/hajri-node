'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { BsModal } from '@/components/widgets/BsModal';
import type { Envelope } from '@/lib/api';
import '@/styles/quick-add-modal.css';

const CLOSE_MS = 160;

/**
 * Puts a just-created row into every cached admin list for `path` (so a dropdown has the option before the refetch
 * lands), then refetches those lists.
 */
export function addToCachedList<T extends { id: number }>(qc: QueryClient, path: string, item: T, sort?: (a: T, b: T) => number) {
  const predicate = (q: { queryKey: readonly unknown[] }) => q.queryKey[0] === 'admin' && q.queryKey[2] === path;
  qc.setQueriesData<Envelope<T[]>>({ predicate }, (old) => {
    if (!old) return old;
    const rows = [...old.data.filter((r) => r.id !== item.id), item];
    return { ...old, data: sort ? rows.sort(sort) : rows };
  });
  void qc.invalidateQueries({ predicate });
}

/**
 * Frame shared by the staff form's "+ Add …" dialogs: icon header, close button, Cancel / Save footer, saving state and
 * open/close animation. `onSubmit` resolves true when the record was saved, which closes the dialog.
 */
export function QuickAddModal({
  title,
  subtitle,
  icon = 'fa-plus',
  saveLabel,
  canSave,
  onSubmit,
  onClose,
  wide,
  children,
}: {
  title: string;
  subtitle: string;
  icon?: string;
  saveLabel: string;
  canSave: boolean;
  onSubmit: () => Promise<boolean>;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const bodyRef = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    const t = setTimeout(() => bodyRef.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (!saving && !closing) close();
  }, [saving, closing, close]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    const done = await onSubmit().catch(() => false);
    setSaving(false);
    if (done) close();
  };

  return (
    <BsModal
      open
      onClose={requestClose}
      staticBackdrop={saving}
      className={`quick-add-modal${closing ? ' is-closing' : ''}`}
      dialogClassName={`modal-dialog-centered quick-add-dialog${wide ? ' quick-add-dialog-wide' : ''}`}
    >
      <form className="modal-content" onSubmit={submit} noValidate aria-label={title}>
        <div className="quick-add-header">
          <span className="quick-add-icon" aria-hidden="true">
            <i className={`fa-solid ${icon}`}></i>
          </span>
          <div className="quick-add-heading">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button" className="quick-add-close" onClick={requestClose} aria-label="Close" disabled={saving}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <fieldset className="quick-add-body" ref={bodyRef} disabled={saving}>
          {children}
        </fieldset>

        <div className="quick-add-footer">
          <button type="button" className="quick-add-btn quick-add-btn-secondary" onClick={requestClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="quick-add-btn quick-add-btn-primary" disabled={!canSave || saving}>
            {saving && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
            {saving ? 'Saving…' : saveLabel}
          </button>
        </div>
      </form>
    </BsModal>
  );
}
