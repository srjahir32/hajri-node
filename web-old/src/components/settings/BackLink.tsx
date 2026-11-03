import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const BackToSettings = ({ href = '/admin/settings', label = 'Settings' }: { href?: string; label?: string }) => (
  <Link href={href} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> {label}</Link>
);
