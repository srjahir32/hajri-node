'use client';

// toastr (same look & options as the Laravel admin layout). It is a jQuery plugin, so jQuery is attached to window first.
type Kind = 'success' | 'error' | 'info' | 'warning';

let loader: Promise<typeof import('toastr')> | null = null;
function load() {
  loader ??= (async () => {
    const jq = (await import('jquery')).default;
    const w = window as unknown as { jQuery?: unknown; $?: unknown };
    w.jQuery = w.$ = jq;
    const t = (await import('toastr')).default;
    t.options = {
      closeButton: true,
      debug: false,
      newestOnTop: false,
      progressBar: true,
      positionClass: 'toast-top-right',
      preventDuplicates: false,
      onclick: undefined,
      showDuration: 300,
      hideDuration: 1000,
      timeOut: 2000,
      extendedTimeOut: 1000,
      showEasing: 'swing',
      hideEasing: 'linear',
      showMethod: 'fadeIn',
      hideMethod: 'fadeOut',
    };
    return t;
  })();
  return loader;
}

async function show(kind: Kind, message: string) {
  const t = await load();
  t[kind](message);
}

export const toast = {
  success: (m: string) => void show('success', m),
  error: (m: string) => void show('error', m),
  info: (m: string) => void show('info', m),
  warning: (m: string) => void show('warning', m),
};
