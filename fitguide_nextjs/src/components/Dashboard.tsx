'use client';

import { useCallback, useState } from 'react';
import {
  AlertTriangle, BarChart3, BookOpen, Calculator, Compass, Heart, Home, LogOut, RefreshCw, Star, User,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkouts } from '../context/WorkoutContext';
import { HomeTab } from '../features/dashboard/components/HomeTab';
import { ExploreTab } from '../features/dashboard/components/ExploreTab';
import { FavoritesTab } from '../features/dashboard/components/FavoritesTab';
import { ReviewsTab } from '../features/dashboard/components/ReviewsTab';
import { CalculatorsTab } from '../features/dashboard/components/CalculatorsTab';
import { ProgramsTab } from '../features/programs/ProgramsTab';
import { ProgressView } from '../features/progress/ProgressView';
import { HealthPanel } from '../features/progress/HealthPanel';
import { WeeklyCheckin } from '../features/progress/WeeklyCheckin';
import { ProfileTab } from '../features/profile/components/ProfileTab';
import { isTab, type TabId } from '../features/dashboard/tabs';
import { ConfirmDialog } from './ConfirmDialog';
import { ImageAttribution } from './ImageAttribution';
import { SiteNav } from './SiteNav';

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

// The dashboard renders only in the browser (behind AuthWrapper), so it can
// read the tab from the URL on first render.
const tabFromUrl = (): TabId => {
  const tab = new URLSearchParams(window.location.search).get('tab');
  return isTab(tab) ? tab : 'home';
};

/** The signed-in home page: a tabbed dashboard, linked to the rest of the site. */
export default function Dashboard() {
  const { isGuest, logout } = useAuth();
  const { error, savedAt, reload, workouts } = useWorkouts();
  const [tab, setTabState] = useState<TabId>(tabFromUrl);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Keep the tab in the URL (?tab=) so Back from a workout page returns to it.
  const setTab = useCallback((next: TabId) => {
    setTabState(next);
    window.history.replaceState(null, '', next === 'home' ? '/' : `/?tab=${next}`);
    window.scrollTo({ top: 0 });
  }, []);

  const content = {
    home: <HomeTab onNavigate={setTab} />,
    explore: <ExploreTab />,
    programs: <ProgramsTab />,
    favorites: <FavoritesTab onExplore={() => setTab('explore')} />,
    progress: <div className="space-y-12"><ProgressView /><WeeklyCheckin /><HealthPanel /></div>,
    reviews: <ReviewsTab />,
    tools: <CalculatorsTab />,
    profile: <ProfileTab onLogout={() => setConfirmLogout(true)} onNavigate={setTab} />,
  }[tab];

  return (
    <div className="min-h-screen bg-noir-eclipse text-white flex flex-col font-poppins">
      <SiteNav
        active="/"
        onHome={() => setTab('home')}
        onProfile={() => setTab('profile')}
        bottomBar={false}
        menuExtra={(close) => (
          <nav aria-label="Dashboard sections">
            <ul className="grid grid-cols-2 gap-2">
              {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => { close(); setTab(id); }}
                    aria-current={tab === id ? 'page' : undefined}
                    className={`w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-bold ${tab === id ? 'bg-lime-light text-noir-eclipse' : 'bg-white/5 text-white'}`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" /> {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      >
        <nav aria-label="Dashboard" className="hidden md:block max-w-[1600px] mx-auto px-8 pb-3">
          <ul className="flex items-center gap-0.5 lg:gap-1 overflow-x-auto">
            {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={tab === id ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-2.5 lg:px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-wider whitespace-nowrap ${tab === id ? 'bg-lime-light text-noir-eclipse' : 'text-white-70 hover:text-white hover:bg-white/5'}`}
                >
                  {/* Text only on tablets, so all the tabs fit in one row. */}
                  <Icon className="hidden lg:block w-3.5 h-3.5" aria-hidden="true" /> {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </SiteNav>

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
