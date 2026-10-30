'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, BookOpen, Compass, Dumbbell, Home, LogIn, LogOut, Menu, User, type LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../i18n/client';
import type { MessageKey } from '../i18n/messages';
import { assetUrl } from '../lib/api';
import { AdminButton } from './AdminButton';
import { ConfirmDialog } from './ConfirmDialog';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Modal } from './Modal';
import { ProfileMenu } from './ProfileMenu';
import { RoleLinks } from './RoleLinks';
import { navLinkClass } from './navLinkClass';

export const SITE_LINKS: { href: string; key: MessageKey }[] = [
  { href: '/workouts', key: 'nav.workouts' },
  { href: '/programs', key: 'nav.programs' },
  { href: '/plan', key: 'nav.plan' },
  { href: '/nutrition', key: 'nav.nutrition' },
  { href: '/community', key: 'nav.community' },
  { href: '/progress', key: 'nav.progress' },
  { href: '/plus', key: 'nav.plus' },
];

/** The phone tab bar, the same on every page (the dashboard's own tabs on the home page). */
export const BOTTOM_ITEMS: { tab: string; href: string; label: string; icon: LucideIcon }[] = [
  { tab: 'home', href: '/', label: 'Home', icon: Home },
  { tab: 'explore', href: '/?tab=explore', label: 'Explore', icon: Compass },
  { tab: 'programs', href: '/programs', label: 'Programs', icon: BookOpen },
  { tab: 'progress', href: '/progress', label: 'Progress', icon: BarChart3 },
  { tab: 'profile', href: '/?tab=profile', label: 'Profile', icon: User },
];

export function Avatar({ url }: { url?: string | null }) {
  return (
    <span className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-light/20 to-royal-nebula/30 border-2 border-white-30/40 flex items-center justify-center overflow-hidden shrink-0">
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={assetUrl(url) || ''} alt="" className="w-full h-full object-cover" />
        : <User className="w-5 h-5 text-white" aria-hidden="true" />}
    </span>
  );
}

/**
 * The header on every page: logo, the main links, language, the admin
 * shortcut and the account menu, with a menu sheet and a tab bar on phones.
 * The home dashboard passes its own handlers and puts its tab row in
 * `children`; other pages link to the dashboard instead.
 */
export function SiteNav({ active, onHome, onProfile, children, menuExtra, bottomBar = true }: {
  active?: string;
  onHome?: () => void;
  onProfile?: () => void;
  children?: ReactNode;
  /** Extra items at the top of the phone menu (the dashboard's sections). */
  menuExtra?: (close: () => void) => ReactNode;
  bottomBar?: boolean;
}) {
  const { user, isAuthenticated, isGuest, logout } = useAuth();
  const t = useT();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const profile = onProfile || (() => router.push('/?tab=profile'));
  const firstName = (user?.name || '').trim().split(/\s+/)[0] || 'Profile';
  const logo = (
    <>
      <span className="w-9 h-9 rounded-xl bg-lime-light flex items-center justify-center" aria-hidden="true">
        <Dumbbell className="w-5 h-5 text-noir-eclipse" />
      </span>
      <span className="font-extrabold text-lg tracking-tight text-white">FitGuide</span>
      {user?.plan === 'plus' && <span className="text-[10px] font-bold text-amber-300 tracking-widest px-1.5 py-0.5 rounded bg-amber-400/15">PLUS</span>}
    </>
  );
  const links = (
    <>
      {SITE_LINKS.map((link) => (
        <Link key={link.href} href={link.href} aria-current={active === link.href ? 'page' : undefined} className={navLinkClass(active, link.href)}>
          {t(link.key)}
        </Link>
      ))}
      <RoleLinks active={active} />
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-30 bg-noir-eclipse/90 backdrop-blur-md border-b border-white-30/10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          {onHome
            ? <button type="button" onClick={onHome} className="flex items-center gap-2 shrink-0" aria-label="FitGuide home">{logo}</button>
            : <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="FitGuide home">{logo}</Link>}

          <div className="hidden md:flex items-center gap-3 min-w-0">
            <nav aria-label={t('nav.label')} className="flex items-center gap-1 overflow-x-auto">{links}</nav>
            <LanguageSwitcher />
            <AdminButton active={active === '/admin'} />
            {isAuthenticated ? (
              <ProfileMenu
                name={firstName}
                fullName={user?.name || ''}
                detail={isGuest ? 'Guest' : user?.email || ''}
                avatar={<Avatar url={user?.avatarUrl} />}
                isGuest={isGuest}
                onProfile={profile}
                onSignOut={() => setConfirmLogout(true)}
              />
            ) : (
              <Link href="/" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lime-light text-noir-eclipse text-xs font-extrabold uppercase tracking-wider">
                <LogIn className="w-4 h-4" aria-hidden="true" /> Sign in
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="md:hidden w-10 h-10 rounded-xl border border-white-30/30 flex items-center justify-center"
            aria-label="Open menu"
            aria-haspopup="dialog"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </header>

      {bottomBar && (
        <nav aria-label="Sections" className="site-bottom-nav md:hidden fixed bottom-0 inset-x-0 h-16 bg-noir-eclipse/95 backdrop-blur-md border-t border-white-30/10 z-30">
          <ul className="h-full flex justify-around items-stretch px-1">
            {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => {
              const current = active === href;
              return (
                <li key={href} className="flex-1">
                  <Link href={href} aria-current={current ? 'page' : undefined} className="w-full h-full flex flex-col items-center justify-center">
                    <Icon className={`w-6 h-6 ${current ? 'text-lime-light' : 'text-white-70'}`} aria-hidden="true" />
                    <span className={`text-[10px] mt-1 font-bold tracking-wider uppercase ${current ? 'text-white' : 'text-white-70'}`}>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {menuOpen && (
        <Modal title="Menu" onClose={() => setMenuOpen(false)} placement="sheet">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Avatar url={user?.avatarUrl} />
              <span className="flex-1 min-w-0">
                <span className="block font-bold truncate">{isAuthenticated ? user?.name : 'Not signed in'}</span>
                {isAuthenticated && <span className="block text-xs text-white-70 truncate">{isGuest ? 'Guest' : user?.email}</span>}
              </span>
              <AdminButton />
            </div>
            {menuExtra?.(() => setMenuOpen(false))}
            {/* Each page renders its own header, so following a link closes the menu. */}
            <nav aria-label={t('nav.label')} className="flex flex-wrap gap-2">{links}</nav>
            <div className="flex items-center justify-between">
              <LanguageSwitcher />
              {isAuthenticated ? (
                <button type="button" onClick={() => { setMenuOpen(false); setConfirmLogout(true); }} className="flex items-center gap-2 text-sm font-bold text-red-300">
                  <LogOut className="w-4 h-4" aria-hidden="true" /> {isGuest ? 'Leave guest mode' : 'Sign out'}
                </button>
              ) : (
                <Link href="/" className="flex items-center gap-2 text-sm font-bold text-lime-light"><LogIn className="w-4 h-4" aria-hidden="true" /> Sign in</Link>
              )}
            </div>
          </div>
        </Modal>
      )}

      {confirmLogout && (
        <ConfirmDialog
          title={isGuest ? 'Leave guest mode?' : 'Sign out?'}
          message={isGuest
            ? 'Your guest profile is only saved on this device and will be cleared.'
            : 'You’ll need to sign in again to see your plan, progress and favorites.'}
          confirmText={isGuest ? 'Leave' : 'Sign out'}
          danger
          icon={<LogOut className="w-8 h-8 text-red-300" />}
          onClose={() => setConfirmLogout(false)}
          onConfirm={() => {
            logout();
            if (onHome) window.history.replaceState(null, '', '/');
            else router.push('/');
          }}
        />
      )}
    </>
  );
}
