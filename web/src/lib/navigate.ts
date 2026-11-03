type Nav = { push: (href: string) => void; replace: (href: string) => void; refresh: () => void };

let router: Nav | null = null;

/** Called by <ClientNav /> so non-React code (timeouts, mutation callbacks) can navigate without a full page load. */
export const setRouter = (r: Nav | null) => {
  router = r;
};

const sameOrigin = (href: string) => {
  try {
    return new URL(href, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
};

/** Client-side replacement for `window.location.href = url`. Falls back to a hard navigation for external URLs. */
export function navigate(href: string, opts: { replace?: boolean } = {}) {
  if (!router || !sameOrigin(href)) {
    if (opts.replace) window.location.replace(href);
    else window.location.href = href;
    return;
  }
  const u = new URL(href, window.location.href);
  const path = u.pathname + u.search + u.hash;
  if (opts.replace) router.replace(path);
  else router.push(path);
}
