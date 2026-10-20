'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HomeTab } from '../features/dashboard/components/HomeTab';
import { ExploreTab } from '../features/dashboard/components/ExploreTab';
import { ProgressView } from '../features/progress/ProgressView';
import { ProfileTab } from '../features/profile/components/ProfileTab';
import { FavoritesTab } from '../features/dashboard/components/FavoritesTab';
import { ProgramsTab } from '../features/programs/ProgramsTab';
import { Home, Compass, BarChart3, User, Dumbbell, LogOut, Heart, Calculator, Star, BookOpen } from 'lucide-react';
import { ReviewsTab } from '../features/dashboard/components/ReviewsTab';
import { CalculatorsTab } from '../features/dashboard/components/CalculatorsTab';
import { ConfirmDialog } from './ConfirmDialog';
import { LoadingScreen } from './LoadingScreen';
import { ImageAttribution } from './ImageAttribution';
import { useAuth } from '../contexts/AuthContext';
import { useWorkouts } from '../context/WorkoutContext';
const TABS = ['home', 'explore', 'programs', 'favorites', 'progress', 'reviews', 'tools', 'profile'];

// The dashboard only renders in the browser (behind AuthWrapper), so it can
// read the tab from the URL on first render.
const tabFromUrl = () => {
    const tab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
    return TABS.includes(tab) ? tab : 'home';
};

const Dashboard = () => {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { loading, error, initialized } = useWorkouts();
    const [activeTab, setActiveTabState] = useState(tabFromUrl);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    // Keep the tab in the URL (?tab=) so Back from a workout page returns to it.
    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        window.history.replaceState(null, '', tab === 'home' ? '/' : `/?tab=${tab}`);
    };
    const [heroColor, setHeroColor] = useState('#00C4B4'); // Track hero dominant color
    // Show loading screen while initializing workouts (but only briefly)
    if (!initialized && loading) {
        return <LoadingScreen message="Loading workouts..."/>;
    }
    // Don't block the UI if there's an error - just log it and show empty state
    if (error) {
        console.warn('⚠️ Workout loading error:', error);
    }
    const handleLogout = () => {
        logout();
        setActiveTab('home');
    };

    const handleLogoutClick = () => {
        setShowLogoutDialog(true);
    };
    // Workouts have their own pages (/workouts/[slug]); the player is /workouts/[slug]/play.
    const handleSelectWorkout = (slug) => {
        router.push(`/workouts/${slug}`);
    };
    const renderTabContent = () => {
        switch (activeTab) {
            case 'home':
                return (<HomeTab onSelectWorkout={handleSelectWorkout} onHeroColorChange={setHeroColor} heroColor={heroColor} onNavigateToPrograms={() => setActiveTab('programs')} onNavigateToExplore={() => setActiveTab('explore')} onNavigateToProgress={() => setActiveTab('progress')} onNavigateToProfile={() => setActiveTab('profile')} onViewProgressDetail={() => setActiveTab('progress')}/>);
            case 'explore':
                return <ExploreTab onSelectWorkout={handleSelectWorkout}/>;
            case 'programs':
                return <ProgramsTab onSelectWorkout={handleSelectWorkout} heroColor={heroColor}/>;
            case 'favorites':
                return <FavoritesTab onSelectWorkout={handleSelectWorkout}/>;
            case 'progress':
                return <ProgressView />;
            case 'profile':
                return <ProfileTab onLogout={handleLogoutClick}/>;
            case 'reviews':
                return <ReviewsTab />;
            case 'tools':
                return <CalculatorsTab />;
        }
    };
    const navigationItems = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'explore', label: 'Explore', icon: Compass },
        { id: 'programs', label: 'Programs', icon: BookOpen },
        { id: 'favorites', label: 'Favorites', icon: Heart },
        { id: 'progress', label: 'Progress', icon: BarChart3 },
        { id: 'reviews', label: 'Reviews', icon: Star },
        { id: 'tools', label: 'Tools', icon: Calculator },
        { id: 'profile', label: 'Profile', icon: User },
    ];
    return (<div className="min-h-screen bg-noir-eclipse text-white flex flex-col font-poppins">

      {/* Desktop Top Navigation Bar - ENLARGED & PROFESSIONAL - TRANSPARENT BLEND WITH DYNAMIC COLOR */}
      <header className="hidden md:block bg-transparent sticky top-0 z-30 select-none backdrop-blur-md transition-all duration-1000" style={{
            background: activeTab === 'home'
                ? `linear-gradient(to bottom, ${heroColor}15, transparent)`
                : 'transparent'
        }}>
        {/* Top Section: Logo, Brand Legend, and User Actions */}
        <div className="px-8 py-5 flex items-center justify-between border-b border-white-30/5">
          {/* Logo & Legend - DYNAMIC COLOR */}
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-noir-eclipse transition-all duration-1000" style={{
            background: activeTab === 'home'
                ? `linear-gradient(to bottom right, ${heroColor}, ${heroColor}CC)`
                : 'linear-gradient(to bottom right, #00C4B4, #00C4B4CC)',
            boxShadow: activeTab === 'home'
                ? `0 0 25px ${heroColor}55`
                : '0 0 25px rgba(0, 196, 180, 0.35)'
        }}>
              <Dumbbell className="w-7 h-7 fill-current"/>
            </div>
            <div>
              <div className="flex items-baseline space-x-2">
                <span className="font-extrabold text-3xl tracking-tight text-white">FitGuide</span>
                <span className="text-xs font-bold text-lime-light tracking-[0.2em] px-2 py-0.5 rounded-md bg-lime-light/10 border border-lime-light/30">PLUS</span>
              </div>
              <p className="text-xs text-white-50 mt-1 font-medium tracking-wide">Your Personal Fitness Companion</p>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <button onClick={() => setActiveTab('profile')} className="flex items-center space-x-3 px-4 py-2 rounded-xl hover:bg-white-30/10 transition-all">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-bold text-white">{user?.name || 'User'}</p>
                <p className="text-[10px] text-white-50 tracking-wide">{user?.email || 'user@example.com'}</p>
              </div>
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-lime-light/20 to-royal-nebula/20 flex items-center justify-center border-2 border-white-30/30 hover:border-lime-light/50 transition-all">
                <User className="w-5 h-5 text-white"/>
              </div>
            </button>

            {/* Logout Button */}
            <button onClick={handleLogoutClick} className="flex items-center gap-2 px-4 py-2.5 border border-red-500/30 hover:border-red-500 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-xl font-semibold text-xs uppercase tracking-wider transition-all">
              <LogOut className="w-4 h-4"/>
              <span className="hidden lg:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Bottom Section: Navigation Tabs - SMALLER & COMPACT WITH DYNAMIC COLOR BLEND */}
        <nav className="px-8 py-3 backdrop-blur-md transition-all duration-1000" style={{
            background: activeTab === 'home'
                ? `linear-gradient(to right, ${heroColor}20, ${heroColor}10, transparent)`
                : 'rgba(19, 25, 33, 0.4)'
        }}>
          <div className="flex items-center space-x-1">
            {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (<button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all ${isActive
                    ? 'text-noir-eclipse'
                    : 'text-white-50 hover:text-white hover:bg-white-30/10'}`} style={isActive
                    ? {
                        background: activeTab === 'home' ? heroColor : '#00C4B4',
                        boxShadow: activeTab === 'home'
                            ? `0 2px 10px ${heroColor}33`
                            : '0 2px 10px rgba(0, 196, 180, 0.2)',
                    }
                    : undefined}>
                  <Icon className="w-3.5 h-3.5"/>
                  <span>{item.label}</span>
                </button>);
        })}
          </div>
        </nav>
      </header>

      {/* Mobile Top Header */}
      <header className="md:hidden flex justify-between items-center p-5 bg-obsidian-wave/50 backdrop-blur-md border-b border-white-30/10 sticky top-0 z-30 select-none">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-lime-light flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-noir-eclipse fill-current"/>
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight">FitGuide</span>
            <span className="text-[8px] block font-bold text-lime-light tracking-widest leading-none">PLUS</span>
          </div>
        </div>
        <button onClick={() => setActiveTab('profile')} className="w-9 h-9 rounded-full bg-gradient-to-br from-lime-light/20 to-royal-nebula/20 flex items-center justify-center border border-white-30 hover:border-lime-light transition-colors">
          <User className="w-4 h-4 text-white"/>
        </button>
      </header>

      {/* Main Tab Content - PROFESSIONAL CONTAINER */}
      <main id="main" className="flex-1 w-full pb-24 md:pb-10">
        <div className="max-w-[1600px] mx-auto px-6 py-8 md:px-12 md:py-10">
          {renderTabContent()}
        </div>
      </main>

      {/* Image Attribution Footer - Desktop only */}
      <div className="hidden md:block">
        <ImageAttribution />
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-noir-eclipse border-t border-white-30/10 flex justify-around items-center z-30 px-2 select-none">
        {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (<button key={item.id} onClick={() => setActiveTab(item.id)} className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center">
              <Icon className={`w-6 h-6 transition-colors duration-200 ${isActive ? 'text-lime-light' : 'text-white-30'}`}/>
              <span className={`text-[9px] mt-1 font-bold tracking-wider uppercase ${isActive ? 'text-white' : 'text-white-30'}`}>
                {item.label}
              </span>
            </button>);
        })}
      </nav>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog isOpen={showLogoutDialog} onClose={() => setShowLogoutDialog(false)} onConfirm={handleLogout} title="Log Out" message="Are you sure you want to log out? You'll need to sign in again to access your workouts and progress." confirmText="Log Out" cancelText="Cancel" confirmButtonClass="bg-red-500 hover:bg-red-600 text-white" icon={<LogOut className="w-8 h-8 text-red-400"/>}/>

    </div>);
};

export default Dashboard;
