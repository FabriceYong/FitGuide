'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../i18n/client';

/** Shortcut to the admin dashboard, shown next to the profile for admins only. */
export function AdminButton({ active = false }: { active?: boolean }) {
  const { user } = useAuth();
  const t = useT();
  if (user?.role !== 'admin') return null;
  return (
    <Link
      href="/admin"
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
        active ? 'bg-lime-light text-noir-eclipse border-lime-light' : 'border-lime-light/40 text-lime-light hover:bg-lime-light/10'
      }`}
    >
      <ShieldCheck className="w-4 h-4" aria-hidden="true" /> {t('nav.admin')}
    </Link>
  );
}
