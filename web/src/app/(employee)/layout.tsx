import type { ReactNode } from 'react';
import { Providers } from '@/lib/query';
import { StaffShell } from '@/components/shell/StaffPage';

export const metadata = { title: 'Hajri', icons: { icon: '/assets/admin/images/favicon/fav.png' } };
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false };

const base = ['bootstrap.min.css', 'font.css', 'sidebar.css', 'header.css', 'media.css', 'bootstrap-datepicker.min.css', 'dropzone.css', 'style.css'];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-portal="employee" suppressHydrationWarning>
      <head>
        {base.slice(0, 2).map((f) => <link key={f} rel="stylesheet" href={`/assets/admin/css/${f}`} precedence="base" />)}
        <link rel="stylesheet" href="/assets/vendor/fontawesome/css/all.min.css" precedence="base" />
        {base.slice(2).map((f) => <link key={f} rel="stylesheet" href={`/assets/admin/css/${f}`} precedence="base" />)}
        <link rel="stylesheet" href="/assets/vendor/datatables/css/jquery.dataTables.min.css" precedence="base" />
        <link rel="stylesheet" href="/assets/vendor/datatables/css/responsive.dataTables.min.css" precedence="base" />
        <link rel="stylesheet" href="/assets/vendor/toastr/toastr.min.css" precedence="base" />
        <link rel="stylesheet" href="/assets/vendor/intl-tel-input/css/intlTelInput.css" precedence="base" />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <StaffShell>{children}</StaffShell>
        </Providers>
      </body>
    </html>
  );
}
