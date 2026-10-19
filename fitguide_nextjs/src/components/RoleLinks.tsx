'use client';

import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { navLinkClass } from './navLinkClass';

/** Header links only creators and admins see. */
export function RoleLinks({ active }: { active?: string }) {
  const { user } = useAuth();
  const links = [
    ...(user?.role === 'creator' || user?.role === 'admin' ? [{ href: '/studio', label: 'Studio' }] : []),
    ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
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
