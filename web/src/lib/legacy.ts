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

  // The header profile menus (`.header_user_dropdown`) are Bootstrap-styled `.dropdown-menu` lists that React opens and
  // closes, without a [data-bs-toggle="dropdown"] toggle. Bootstrap's dropdown keydown handler (delegated on document,
  // capture phase) still runs for Arrow/Escape inside them, finds no toggle and throws. Window capture sees the key
  // first: do exactly what that handler did before throwing (preventDefault + stopPropagation) so nothing else changes.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Escape') return;
    if (!(e.target instanceof Element) || (/input|textarea/i.test(e.target.tagName) && e.key !== 'Escape')) return;
    const menu = e.target.closest('.header_user_dropdown > .dropdown-menu');
    if (!menu || (e.key === 'Escape' && !menu.classList.contains('show'))) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // `.custom-dropdown` (trigger / options list / hidden <select>). Dropdowns React opens and closes itself carry
  // `data-react-dropdown`; toggling those here as well closed them again right after React opened them.
  const reactOwned = (el: Element) => !!el.closest('[data-react-dropdown]');
  $(document).on('click', '.dropdown-trigger', function (this: HTMLElement, e: Event) {
    if (reactOwned(this)) return;
    e.stopPropagation();
    ($(this).siblings('.dropdown-options') as any).slideToggle(100);
  });
  $(document).on('click', '.dropdown-options li', function (this: HTMLElement) {
    if (reactOwned(this)) return;
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
    ($('.dropdown-options').not('[data-react-dropdown] .dropdown-options') as any).slideUp(100);
  });

  // tooltips on [data-bs-toggle="tooltip"]
  const bs = (window as any).bootstrap;
  if (bs?.Tooltip) {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => new bs.Tooltip(el, { placement: 'bottom' }));
  }
}
