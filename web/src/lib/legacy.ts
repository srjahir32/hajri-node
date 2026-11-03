'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadJQuery } from '@/components/widgets/DataTable';

let installed = false;

/**
 * Re-creates the page-independent behaviour the Laravel layout (layout/main.blade.php + main.js) gives every view:
 * Bootstrap's data-attribute components (offcanvas, modal, collapse, dropdown, tooltip, tab) and the `.custom-dropdown`
 * widget. They are delegated listeners, so they also work on elements React renders later.
 */
export async function installLegacyBehaviors() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const $ = await loadJQuery();
  // the UMD bundle does not attach itself to window when loaded as a module, but helpers (lib/bs.ts) expect `window.bootstrap`
  const mod: any = await import('bootstrap/dist/js/bootstrap.bundle.min.js' as string);
  (window as any).bootstrap ??= mod.default ?? mod;

  // `.custom-dropdown` (trigger / options list / hidden <select>)
  $(document).on('click', '.dropdown-trigger', function (this: HTMLElement, e: Event) {
    e.stopPropagation();
    ($(this).siblings('.dropdown-options') as any).slideToggle(100);
  });
  $(document).on('click', '.dropdown-options li', function (this: HTMLElement) {
    const value = this.getAttribute('data-value');
    const text = this.textContent ?? '';
    const box = $(this).closest('.custom-dropdown');
    box.find('.selected-value').text(text);
    const sel = box.find('select')[0] as HTMLSelectElement | undefined;
    if (sel && value !== null) {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
      setter?.call(sel, value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    $(this).siblings().removeClass('selected');
    $(this).addClass('selected');
    ($(this).parent() as any).slideUp(100);
  });
  $(document).on('click', () => {
    ($('.dropdown-options') as any).slideUp(100);
  });

  // tooltips on [data-bs-toggle="tooltip"]
  const bs = (window as any).bootstrap;
  if (bs?.Tooltip) {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => new bs.Tooltip(el, { placement: 'bottom' }));
  }
}
