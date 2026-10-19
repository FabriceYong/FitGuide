import Link from 'next/link';
import { Dumbbell } from 'lucide-react';
import { RoleLinks } from './RoleLinks';
import { navLinkClass } from './navLinkClass';

const LINKS = [
  { href: '/workouts', label: 'Workouts' },
  { href: '/programs', label: 'Programs' },
  { href: '/plan', label: 'My plan' },
  { href: '/nutrition', label: 'Nutrition' },
  { href: '/community', label: 'Community' },
  { href: '/progress', label: 'Progress' },
  { href: '/plus', label: 'PLUS' },
];

/** Header for the standalone pages (catalog, programs, progress). */
export function SiteHeader({ active }) {
  return (
    <header className="sticky top-0 z-30 bg-noir-eclipse/90 backdrop-blur-md border-b border-white-30/10">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-9 h-9 rounded-xl bg-lime-light flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-noir-eclipse" />
          </span>
          <span className="font-extrabold text-lg tracking-tight text-white">FitGuide</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={active === link.href ? 'page' : undefined} className={navLinkClass(active, link.href)}>
              {link.label}
            </Link>
          ))}
          <RoleLinks active={active} />
        </nav>
      </div>
    </header>
  );
}
