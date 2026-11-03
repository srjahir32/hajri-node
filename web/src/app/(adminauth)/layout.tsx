import type { ReactNode } from 'react';
import { Providers } from '@/lib/query';

export const metadata = { title: 'Hajri | Login', icons: { icon: '/assets/admin/images/favicon/fav.png' } };
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-portal="auth" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/assets/admin/css/login.css" precedence="base" />
        <link rel="stylesheet" href="/assets/admin/css/font.css" precedence="base" />
        <link rel="stylesheet" href="/assets/admin/css/bootstrap.min.css" precedence="base" />
        <link rel="stylesheet" href="/assets/vendor/toastr/toastr.min.css" precedence="base" />
        <link rel="stylesheet" href="/assets/vendor/fontawesome/css/all.min.css" precedence="base" />
        <link rel="stylesheet" href="/assets/vendor/intl-tel-input/css/intlTelInput.css" precedence="base" />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
