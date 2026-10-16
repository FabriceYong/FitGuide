'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Compass, Target, Award, ArrowRight } from 'lucide-react';
export const InteractiveFeatureShowcase = ({ onNavigateToPrograms, onNavigateToExplore, onNavigateToProgress, onNavigateToProfile, }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const autoPlayTimerRef = useRef(null);
    const features = [
        {
            id: 'learn',
            badge: 'LEARN',
            badgeColor: 'text-[#00C4B4] bg-[#00C4B4]/10 border-[#00C4B4]/30',
            accentColor: '#00C4B4',
            headline: 'Launch your fitness journey with expert guidance',
            description: "Access personalized workout plans designed by certified ACE trainers. Whether you're a beginner or an advanced athlete, our adaptive programs meet you exactly where you are and grow with you.",
            image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
            ctaText: 'Get Started',
            icon: BookOpen,
            actionKey: 'learn'
        },
        {
            id: 'expand',
            badge: 'EXPAND',
            badgeColor: 'text-[#3E25F5] bg-[#3E25F5]/10 border-[#3E25F5]/30',
            accentColor: '#3E25F5',
            headline: 'Expand your fitness knowledge',
            description: 'Explore our extensive exercise library with detailed video tutorials, form tips, and modification options. Learn proper technique to maximise results and prevent injuries — backed by sports science.',
            image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
            ctaText: 'Browse Library',
            icon: Compass,
            actionKey: 'expand'
        },
        {
            id: 'invest',
            badge: 'INVEST',
            badgeColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
            accentColor: '#10B981',
            headline: 'Invest in your long-term wellness',
            description: 'Track your progress with detailed analytics, body metrics, and performance insights. Set measurable goals, monitor your improvements week by week, and celebrate every milestone along the way.',
            image: 'https://images.unsplash.com/photo-1517963879433-celu62ibd3d?w=800&q=80',
            ctaText: 'View Progress',
            icon: Target,
            actionKey: 'invest'
        },
        {
            id: 'achieve',
            badge: 'ACHIEVE',
            badgeColor: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30',
            accentColor: '#EF4444',
            headline: 'Register your fitness milestones',
            description: 'Earn badges and unlock achievements as you complete workouts and hit personal records. Join a thriving community of fitness enthusiasts, share your story, and inspire others on their journey.',
            image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80',
            ctaText: 'My Achievements',
            icon: Award,
            actionKey: 'achieve'
        }
    ];
    // Auto-play feature rotation
    useEffect(() => {
        if (!isHovered) {
            autoPlayTimerRef.current = setInterval(() => {
                setActiveIndex((prevIndex) => (prevIndex + 1) % features.length);
            }, 7000); // Rotate every 7 seconds
        }
        return () => {
            if (autoPlayTimerRef.current) {
                clearInterval(autoPlayTimerRef.current);
            }
        };
    }, [isHovered, features.length]);
    const activeFeature = features[activeIndex];
    const handleCtaClick = (actionKey) => {
        switch (actionKey) {
            case 'learn':
                onNavigateToPrograms?.();
                break;
            case 'expand':
                onNavigateToExplore?.();
                break;
            case 'invest':
                onNavigateToProgress?.();
                break;
            case 'achieve':
                onNavigateToProfile?.();
                break;
        }
    };
    return (<div className="w-full" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Interactive Screen */}
        <div className="lg:col-span-7 flex flex-col justify-between relative rounded-3xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-500 min-h-[480px] lg:min-h-[520px]">
          
          {/* Animated Background Image */}
          <div key={activeFeature.image} className="absolute inset-0 bg-cover bg-center scale-100 animate-fade-in transition-all duration-1000" style={{
            backgroundImage: `url(${activeFeature.image})`,
        }}/>
          
          {/* Futuristic Color-Themed Radial Glowing Overlay */}
          <div className="absolute inset-0 transition-all duration-1000" style={{
            background: `radial-gradient(circle at 20% 50%, ${activeFeature.accentColor}1C 0%, rgba(10, 12, 16, 0.4) 60%, rgba(10, 12, 16, 0.94) 100%), 
                           linear-gradient(to bottom, rgba(10, 12, 16, 0.3) 0%, rgba(10, 12, 16, 0.85) 70%, #0A0C10 100%)`
        }}/>

          {/* Interactive Screen Header */}
          <div className="relative z-10 p-8 lg:p-12 flex justify-between items-start">
            <span className={`px-4 py-1 rounded-full text-xs font-black tracking-widest border transition-all duration-500 shadow-sm ${activeFeature.badgeColor}`}>
              {activeFeature.badge}
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-light animate-ping"/>
              <span className="text-[10px] text-white/60 font-semibold tracking-wider uppercase">Auto-playing</span>
            </div>
          </div>

          {/* Interactive Screen Content Block (Glassmorphic Container at Bottom) */}
          <div className="relative z-10 p-8 lg:p-12 pt-0">
            <div className="backdrop-blur-md bg-noir-eclipse/45 border border-white/10 rounded-2xl p-6 lg:p-8 hover:border-white/15 transition-all duration-500 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
              {/* Reset key on text to re-trigger slide-up animation */}
              <div key={activeFeature.id} className="animate-fade-in-up">
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-4 tracking-tight">
                  {activeFeature.headline}
                </h3>
                <p className="text-white/70 text-sm md:text-base leading-relaxed mb-6 font-medium">
                  {activeFeature.description}
                </p>
                <button onClick={() => handleCtaClick(activeFeature.actionKey)} className="flex items-center gap-2 px-6 py-3.5 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-all text-white" style={{
            background: `linear-gradient(to right, ${activeFeature.accentColor}, ${activeFeature.accentColor}DF)`,
            boxShadow: `0 0 20px ${activeFeature.accentColor}33`
        }}>
                  <span>{activeFeature.ctaText}</span>
                  <ArrowRight className="w-4 h-4"/>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Cards Selector Deck */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            const isActive = index === activeIndex;
            return (<div key={feat.id} onClick={() => setActiveIndex(index)} className={`relative flex items-center gap-5 p-5 rounded-2xl border cursor-pointer select-none transition-all duration-300 group ${isActive
                    ? 'bg-white/5 shadow-lg'
                    : 'bg-obsidian-wave/40 border-white/5 hover:border-white/15 hover:bg-obsidian-wave/60'}`} style={{
                    borderColor: isActive ? `${feat.accentColor}40` : '',
                    boxShadow: isActive ? `inset 0 0 15px ${feat.accentColor}11, 0 4px 20px rgba(0,0,0,0.15)` : ''
                }}>
                {/* Active Indicator Light */}
                {isActive && (<div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-full transition-all duration-300" style={{ backgroundColor: feat.accentColor }}/>)}

                {/* Left Side: Icon with styled bg */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`} style={{
                    background: isActive ? `linear-gradient(135deg, ${feat.accentColor}44, ${feat.accentColor}11)` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isActive ? `${feat.accentColor}55` : 'rgba(255,255,255,0.05)'}`
                }}>
                  <Icon className={`w-5 h-5 transition-transform duration-500 ${isActive ? 'rotate-12 scale-110' : 'group-hover:rotate-6'}`}/>
                </div>

                {/* Right Side: Label + Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black tracking-widest uppercase transition-colors`} style={{ color: isActive ? feat.accentColor : 'rgba(255,255,255,0.4)' }}>
                      {feat.badge}
                    </span>
                    {isActive && (<span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: feat.accentColor }}/>)}
                  </div>
                  <h4 className={`text-base font-bold truncate transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white/90'}`}>
                    {feat.headline}
                  </h4>
                </div>

                {/* Interactive Arrow Indicator on hover/active */}
                <div className="flex-shrink-0">
                  <ArrowRight className={`w-4 h-4 transition-all duration-300 ${isActive
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-40'}`} style={{ color: feat.accentColor }}/>
                </div>
              </div>);
        })}
        </div>

      </div>
    </div>);
};
