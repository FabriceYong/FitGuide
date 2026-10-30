'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, BarChart3, BookOpen, Calculator, Compass, Dumbbell, Heart, Home, LogOut, Menu, RefreshCw, Star, User,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkouts } from '../context/WorkoutContext';
import { useT } from '../i18n/client';
import type { MessageKey } from '../i18n/messages';
import { assetUrl } from '../lib/api';
import { HomeTab } from '../features/dashboard/components/HomeTab';
import { ExploreTab } from '../features/dashboard/components/ExploreTab';
import { FavoritesTab } from '../features/dashboard/components/FavoritesTab';
import { ReviewsTab } from '../features/dashboard/components/ReviewsTab';
import { CalculatorsTab } from '../features/dashboard/components/CalculatorsTab';
import { ProgramsTab } from '../features/programs/ProgramsTab';
import { ProgressView } from '../features/progress/ProgressView';
import { HealthPanel } from '../features/progress/HealthPanel';
import { ProfileTab } from '../features/profile/components/ProfileTab';
import { isTab, type TabId } from '../features/dashboard/tabs';
import { ConfirmDialog } from './ConfirmDialog';
import { ImageAttribution } from './ImageAttribution';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Modal } from './Modal';
import { RoleLinks } from './RoleLinks';
import { AdminButton } from './AdminButton';
import { navLinkClass } from './navLinkClass';

const TAB_ITEMS: { id: TabId; label: string; icon: LucideIcon; mobileBar?: boolean }[] = [
  { id: 'home', label: 'Home', icon: Home, mobileBar: true },
  { id: 'explore', label: 'Explore', icon: Compass, mobileBar: true },
  { id: 'programs', label: 'Programs', icon: BookOpen, mobileBar: true },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'progress', label: 'Progress', icon: BarChart3, mobileBar: true },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'tools', label: 'Calculators', icon: Calculator },
  { id: 'profile', label: 'Profile', icon: User, mobileBar: true },
];

// Pages outside the dashboard (the dashboard's own tabs cover workouts, programs and progress).
const SITE_LINKS: { href: string; key: MessageKey }[] = [
  { href: '/plan', key: 'nav.plan' },
  { href: '/nutrition', key: 'nav.nutrition' },
  { href: '/community', key: 'nav.community' },
  { href: '/plus', key: 'nav.plus' },
];

// The dashboard renders only in the browser (behind AuthWrapper), so it can
// read the tab from the URL on first render.
const tabFromUrl = (): TabId => {
  const tab = new URLSearchParams(window.location.search).get('tab');
  return isTab(tab) ? tab : 'home';
};

/** The signed-in home page: a tabbed dashboard, linked to the rest of the site. */
export default function Dashboard() {
  const { user, isGuest, logout } = useAuth();
  const { error, savedAt, reload, workouts } = useWorkouts();
  const t = useT();
  const [tab, setTabState] = useState<TabId>(tabFromUrl);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Keep the tab in the URL (?tab=) so Back from a workout page returns to it.
  const setTab = useCallback((next: TabId) => {
    setTabState(next);
    setMenuOpen(false);
    window.history.replaceState(null, '', next === 'home' ? '/' : `/?tab=${next}`);
    window.scrollTo({ top: 0 });
  }, []);

  const content = {
    home: <HomeTab onNavigate={setTab} />,
    explore: <ExploreTab />,
    programs: <ProgramsTab />,
    favorites: <FavoritesTab onExplore={() => setTab('explore')} />,
    progress: <div className="space-y-12"><ProgressView /><HealthPanel /></div>,
    reviews: <ReviewsTab />,
    tools: <CalculatorsTab />,
    profile: <ProfileTab onLogout={() => setConfirmLogout(true)} onNavigate={setTab} />,
  }[tab];

  const avatar = (
    <span className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-light/20 to-royal-nebula/30 border-2 border-white-30/40 flex items-center justify-center overflow-hidden">
      {user?.avatarUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={assetUrl(user.avatarUrl) || ''} alt="" className="w-full h-full object-cover" />
        : <User className="w-5 h-5 text-white" aria-hidden="true" />}
    </span>
  );

  return (
    <div className="min-h-screen bg-noir-eclipse text-white flex flex-col font-poppins">
      <header className="sticky top-0 z-30 bg-noir-eclipse/90 backdrop-blur-md border-b border-white-30/10">
        <div className="px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <button type="button" onClick={() => setTab('home')} className="flex items-center gap-2 shrink-0" aria-label="FitGuide home">
            <span className="w-9 h-9 rounded-xl bg-lime-light flex items-center justify-center" aria-hidden="true">
              <Dumbbell className="w-5 h-5 text-noir-eclipse" />
            </span>
            <span className="font-extrabold text-lg tracking-tight text-white">FitGuide</span>
            {user?.plan === 'plus' && <span className="text-[10px] font-bold text-amber-300 tracking-widest px-1.5 py-0.5 rounded bg-amber-400/15">PLUS</span>}
          </button>

          <div className="hidden md:flex items-center gap-3 min-w-0">
            <nav aria-label={t('nav.label')} className="flex items-center gap-1">
              {SITE_LINKS.map((link) => <Link key={link.href} href={link.href} className={navLinkClass('/', link.href)}>{t(link.key)}</Link>)}
              <RoleLinks active="/" />
            </nav>
            <LanguageSwitcher />
            <AdminButton />
            <button type="button" onClick={() => setTab('profile')} className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-xl hover:bg-white/5">
              <span className="sr-only lg:hidden">Your profile</span>
              <span className="text-right hidden lg:block">
                <span className="block text-sm font-bold text-white">{user?.name || 'Profile'}</span>
                <span className="block text-[11px] text-white-70">{isGuest ? 'Guest' : user?.email}</span>
              </span>
              {avatar}
            </button>
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              aria-label={isGuest ? 'Leave guest mode' : 'Sign out'}
              className="flex items-center gap-2 px-3 py-2 border border-red-500/30 hover:border-red-500 hover:bg-red-500/10 text-red-300 rounded-xl font-semibold text-xs uppercase tracking-wider"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" /> <span className="hidden lg:inline" aria-hidden="true">{isGuest ? 'Leave' : 'Sign out'}</span>
            </button>
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

        <nav aria-label="Dashboard" className="hidden md:block px-8 pb-3">
          <ul className="flex items-center gap-1 overflow-x-auto">
            {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={tab === id ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-wider whitespace-nowrap ${tab === id ? 'bg-lime-light text-noir-eclipse' : 'text-white-70 hover:text-white hover:bg-white/5'}`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {(error || savedAt) && (
        <div role="status" className="px-4 md:px-8 py-3 bg-amber-500/10 border-b border-amber-500/30 flex flex-wrap items-center gap-3 text-sm text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            {savedAt
              ? `Can’t reach FitGuide right now. Showing the ${workouts.length} workouts saved on this device on ${new Date(savedAt).toLocaleDateString()}.`
              : `Workouts couldn’t be loaded: ${error}`}
          </span>
          <button type="button" onClick={reload} className="flex items-center gap-1.5 font-bold text-white">
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      <main id="main" className="flex-1 w-full pb-24 md:pb-10">
        <div className="max-w-[1600px] mx-auto px-6 py-8 md:px-12 md:py-10">{content}</div>
      </main>

      <div className="pb-16 md:pb-0">
        <ImageAttribution />
      </div>

      <nav aria-label="Dashboard" className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-noir-eclipse border-t border-white-30/10 z-30">
        <ul className="h-full flex justify-around items-stretch px-1">
          {TAB_ITEMS.filter((item) => item.mobileBar).map(({ id, label, icon: Icon }) => (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => setTab(id)}
                aria-current={tab === id ? 'page' : undefined}
                className="w-full h-full flex flex-col items-center justify-center"
              >
                <Icon className={`w-6 h-6 ${tab === id ? 'text-lime-light' : 'text-white-70'}`} aria-hidden="true" />
                <span className={`text-[10px] mt-1 font-bold tracking-wider uppercase ${tab === id ? 'text-white' : 'text-white-70'}`}>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {menuOpen && (
        <Modal title="Menu" onClose={() => setMenuOpen(false)} placement="sheet">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              {avatar}
              <span className="flex-1 min-w-0">
                <span className="block font-bold">{user?.name}</span>
                <span className="block text-xs text-white-70">{isGuest ? 'Guest' : user?.email}</span>
              </span>
              <AdminButton />
            </div>
            <nav aria-label="Dashboard sections">
              <ul className="grid grid-cols-2 gap-2">
                {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setTab(id)}
                      aria-current={tab === id ? 'page' : undefined}
                      className={`w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-bold ${tab === id ? 'bg-lime-light text-noir-eclipse' : 'bg-white/5 text-white'}`}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" /> {label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label={t('nav.label')} className="flex flex-wrap gap-2">
              {SITE_LINKS.map((link) => <Link key={link.href} href={link.href} className={navLinkClass('/', link.href)}>{t(link.key)}</Link>)}
              <RoleLinks active="/" />
            </nav>
            <div className="flex items-center justify-between">
              <LanguageSwitcher />
              <button type="button" onClick={() => { setMenuOpen(false); setConfirmLogout(true); }} className="flex items-center gap-2 text-sm font-bold text-red-300">
                <LogOut className="w-4 h-4" aria-hidden="true" /> {isGuest ? 'Leave guest mode' : 'Sign out'}
              </button>
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
            window.history.replaceState(null, '', '/');
          }}
        />
      )}
    </div>
  );
}
