/** Per-page stylesheet links (same files the Laravel views pull in). React hoists them into <head>. */
export function Css({ hrefs }: { hrefs: string[] }) {
  return (
    <>
      {hrefs.map((h) => (
        <link key={h} rel="stylesheet" href={h.startsWith('/') || h.startsWith('http') ? h : h.startsWith('assets/') ? `/${h}` : `/assets/admin/css/${h}`} precedence="page" />
      ))}
    </>
  );
}
