'use client';

/** SweetAlert2 confirm in the style the Laravel pages use. Resolves true when the user confirms. */
export async function confirmSwal(opts: { title?: string; text?: string; confirmText?: string; cancelText?: string; icon?: 'warning' | 'question' | 'info' | 'error' | 'success' } = {}): Promise<boolean> {
  const Swal = (await import('sweetalert2')).default;
  const r = await Swal.fire({
    title: opts.title ?? 'Are you sure?',
    text: opts.text,
    icon: opts.icon ?? 'warning',
    showCancelButton: true,
    confirmButtonColor: '#2F8CFF',
    cancelButtonColor: '#6c757d',
    confirmButtonText: opts.confirmText ?? 'Yes',
    cancelButtonText: opts.cancelText ?? 'Cancel',
  });
  return r.isConfirmed;
}

export async function alertSwal(title: string, text?: string, icon: 'warning' | 'info' | 'error' | 'success' = 'info') {
  const Swal = (await import('sweetalert2')).default;
  await Swal.fire({ title, text, icon, confirmButtonColor: '#2F8CFF' });
}
