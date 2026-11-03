'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { setRouter } from '@/lib/navigate';

/**
 * The Laravel views are full of plain `<a href="/page">` links. This turns clicks on same-origin ones into
 * client-side navigations (no document reload) and registers the router for `navigate()`.
 */
export default function ClientNav() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setRouter(router);
    return () => setRouter(null);
  }, [router]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (document.documentElement.dataset.portal === 'auth') return; // login screens load their own stylesheet set
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a) return;
      const raw = a.getAttribute('href');
      if (!raw || raw.startsWith('#') || raw.startsWith('javascript:') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return;
      if ((a.target && a.target !== '_self') || a.hasAttribute('download') || a.getAttribute('rel')?.includes('external')) return;
      if (a.dataset.bsToggle || a.dataset.noClientNav !== undefined) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // files served by the web app itself (exports, images, assets) must stay real downloads/loads
      if (/^\/(assets|api|storage|uploads)\//.test(url.pathname) || /\.(pdf|xlsx?|csv|zip|png|jpe?g|svg)$/i.test(url.pathname)) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
      e.preventDefault();
      router.push(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [router]);

  // what a full reload used to clean up: open mobile sidebar, Bootstrap modal/offcanvas leftovers
  useEffect(() => {
    if (window.innerWidth < 992) document.querySelectorAll('.page-wrapper, body').forEach((el) => el.classList.remove('nav_responsive'));
    document.querySelectorAll('.modal-backdrop, .offcanvas-backdrop').forEach((el) => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }, [pathname]);

  return null;
}
