'use client';

import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { navLinkClass } from './navLinkClass';
import { useT } from '../i18n/client';

/** Header links only coaches (the creator role) and admins see. The admin dashboard has its own AdminButton. */
export function RoleLinks({ active }: { active?: string }) {
  const { user } = useAuth();
  const t = useT();
  const links = [
    ...(user?.role === 'creator' || user?.role === 'admin' ? [{ href: '/studio', label: t('nav.studio') }] : []),
  ];
  return (
    <>
      {links.map((link) => (
        <Link key={link.href} href={link.href} aria-current={active === link.href ? 'page' : undefined} className={navLinkClass(active, link.href)}>
          {link.label}
        </Link>
      ))}
    </>
  );
}
