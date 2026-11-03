'use client';

import { useLayoutEffect, useState } from 'react';

interface Sheet { link: HTMLLinkElement; refs: number; loaded: Promise<void> }
const sheets = new Map<string, Sheet>();

export const resolveCss = (h: string) => (h.startsWith('/') || h.startsWith('http') ? h : h.startsWith('assets/') ? `/${h}` : `/assets/admin/css/${h}`);

/**
 * Loads a page's stylesheets while it is mounted and removes them when it unmounts. Laravel gave every view a fresh document,
 * so a page's global rules (the Tailwind `body{}` in dashboard.css, `.nav-link{}` overrides, ...) never touched other pages;
 * React keeps hoisted `<link precedence>` sheets forever, which would leak them across client-side navigations.
 * Returns true once every sheet has loaded, so the page can hold its content until then (no flash of unstyled content).
 */
export function usePageStylesheets(hrefs: string[]) {
  const key = hrefs.join('|');
  const [ready, setReady] = useState(hrefs.length === 0);
  useLayoutEffect(() => {
    if (!hrefs.length) return;
    let alive = true;
    const held = hrefs.map((h) => {
      const url = resolveCss(h);
      let s = sheets.get(url);
      if (!s) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        const loaded = new Promise<void>((res) => {
          link.onload = link.onerror = () => res();
        });
        document.head.appendChild(link);
        s = { link, refs: 0, loaded };
        sheets.set(url, s);
      }
      s.refs++;
      return { url, s };
    });
    void Promise.all(held.map((x) => x.s.loaded)).then(() => alive && setReady(true));
    return () => {
      alive = false;
      setReady(false);
      for (const { url, s } of held) {
        s.refs--;
        // next tick: the incoming page may need the very same sheet
        setTimeout(() => {
          if (s.refs <= 0 && sheets.get(url) === s) {
            s.link.remove();
            sheets.delete(url);
          }
        }, 0);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ready;
}
