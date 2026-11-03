import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/lib/query';

export const metadata: Metadata = {
  title: { default: 'Hajri – Attendance & Payroll', template: '%s · Hajri' },
  description: 'Staff attendance, leave, shifts and payroll for growing businesses.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
