/** Laravel's Request::is('a*', 'b') — patterns are matched against the path without the leading slash. */
export function pathIs(pathname: string, ...patterns: string[]) {
  const p = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  return patterns.some((pat) => {
    if (pat.endsWith('*')) return p.startsWith(pat.slice(0, -1));
    return p === pat;
  });
}
