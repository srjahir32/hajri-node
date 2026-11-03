'use client';

import { useState, type ReactNode } from 'react';
import { ConfirmDialog } from './Modal';

/** Imperative-feeling confirm: `const [ask, dialog] = useConfirm(); ask({ ... , onConfirm })` and render `{dialog}`. */
export function useConfirm() {
  const [state, setState] = useState<{ title: string; message: ReactNode; confirmLabel?: string; tone?: 'danger' | 'primary'; onConfirm: () => Promise<unknown> | void } | null>(null);
  const [busy, setBusy] = useState(false);
  const dialog = (
    <ConfirmDialog
      open={!!state}
      title={state?.title ?? ''}
      message={state?.message}
      confirmLabel={state?.confirmLabel}
      tone={state?.tone}
      loading={busy}
      onClose={() => !busy && setState(null)}
      onConfirm={async () => {
        setBusy(true);
        try {
          await state?.onConfirm();
          setState(null);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
  return [setState, dialog] as const;
}
