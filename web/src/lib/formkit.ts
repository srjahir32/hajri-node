'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Helpers that mimic how the Laravel pages report validation: a red `.error.error_message` span inserted right after the field.

export function clearErrors(root: ParentNode = document) {
  root.querySelectorAll('.error.error_message').forEach((e) => e.remove());
}

export function showError(selector: string, message: string, root: ParentNode = document) {
  const el = root.querySelector(selector);
  if (!el) return;
  const span = document.createElement('span');
  span.className = 'error error_message proxima_nova_semibold';
  span.textContent = message;
  el.insertAdjacentElement('afterend', span);
}

export const fieldValue = (id: string): string => {
  const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  return el?.value ?? '';
};

export const isChecked = (id: string) => !!(document.getElementById(id) as HTMLInputElement | null)?.checked;

/** intl-tel-input instance attached by <IntlPhoneInput /> */
export const itiOf = (id: string): any => (document.getElementById(id) as any)?.__iti;

/** FormData of a form with empty strings dropped */
export function formValues(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  new FormData(form).forEach((v, k) => {
    if (typeof v === 'string') out[k] = v;
  });
  return out;
}
