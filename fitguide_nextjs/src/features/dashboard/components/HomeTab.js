'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ArrowRight, Dumbbell, Clock, Target, Video, Flame, ExternalLink, RefreshCw, ShieldCheck, X, Star, Users, Award, TrendingUp, BookOpen, Zap, Heart, ChevronRight, Play, } from 'lucide-react';
import { HeroCarousel } from '../../../components/HeroCarousel';
import { EnhancedStatsCard } from '../../../components/EnhancedStatsCard';
import { InteractiveFeatureShowcase } from '../../../components/InteractiveFeatureShowcase';
import { useAuth } from '../../../contexts/AuthContext';
import { apiRequest } from '../../../lib/api';
import { useWorkouts } from '../../../context/WorkoutContext';
import { ParqModal, PARQ_STORAGE_KEY } from '../../../components/ParqModal';
import { ArticleDetailPage } from './ArticleDetailPage';
import { FULL_ARTICLES } from '../data/articlesData';

export const HomeTab = ({ onSelectWorkout, onHeroColorChange, heroColor = '#00C4B4', onNavigateToPrograms, onNavigateToExplore, onNavigateToProgress, onNavigateToProfile, onViewProgressDetail, }) => {
  const { user } = useAuth();
  const { workouts } = useWorkouts();
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showParqModal, setShowParqModal] = useState(false);
  const [showParqBanner, setShowParqBanner] = useState(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(PARQ_STORAGE_KEY) : null;
      return !stored;
    }
    catch {
      return true;
    }
  });
  const statsRef = useRef(null);
  const recommendedRef = useRef(null);
  const tipsRef = useRef(null);
  const featuresRef = useRef(null);
  const programsBridgeRef = useRef(null);
  const testimonialsRef = useRef(null);
  const editorialRef = useRef(null);
  const communityRef = useRef(null);
  // Memoize recommended workouts to prevent unnecessary re-renders
  const recommendedWorkouts = useMemo(() => workouts.slice(0, 3), [workouts]);
  // Intersection Observer for scroll-triggered animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px',
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('data-section');
          if (id) {
            setVisibleSections((prev) => new Set(prev).add(id));
            observer.unobserve(entry.target); // Stop observing once visible
          }
        }
      });
    }, observerOptions);
    const refs = [statsRef, recommendedRef, tipsRef, featuresRef, programsBridgeRef, testimonialsRef, editorialRef, communityRef];
    refs.forEach((ref) => {
      if (ref.current)
        observer.observe(ref.current);
    });
    return () => observer.disconnect();
  }, []);

  const handleOpenArticle = (article) => {
    const matched = FULL_ARTICLES.find(
      a => a.id === article?.id || (article?.title && a.title.toLowerCase().includes(article.title.toLowerCase().slice(0, 15)))
    );
    if (matched) {
      setSelectedArticle(matched);
    } else {
      setSelectedArticle({
        id: article?.id || 'custom-article',
        title: article?.title || 'Fitness Article',
        category: article?.category || 'HEALTH',
        author: article?.author || 'FitGuide Editorial Team',
        pubDate: article?.pubDate || new Date().toISOString(),
        readTime: article?.readTime || '5 min read',
        thumbnail: article?.thumbnail || article?.image || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
        description: article?.description || article?.summary || 'Expert fitness guide from FitGuide.',
        takeaways: [
          'Evidence-based health & fitness guidance.',
          'Practical habits for sustainable long-term performance.',
          'Optimized for strength, recovery, and overall wellbeing.'
        ],
        contentSections: [
          {
            heading: 'Article Overview',
            paragraphs: [
              article?.description || 'This article provides actionable guidelines based on recent sports science research.',
              'Integrating these principles into your daily workout routine helps optimize recovery, muscle adaptation, and daily performance.'
            ],
            callout: 'Consistency is key. Follow your personalized routine in FitGuide for best results.'
          }
        ]
      });
    }
  };

  if (selectedArticle) {
    return <ArticleDetailPage article={selectedArticle} onBack={() => setSelectedArticle(null)} />;
  }

  const handleCarouselAction = (action) => {
    switch (action) {
      case 'start-workout':
        if (recommendedWorkouts.length > 0) {
          onSelectWorkout(recommendedWorkouts[0].slug, '#00C4B4');
        }
        break;
      case 'explore':
        break;
      case 'progress':
        break;
      case 'profile':
        break;
      case 'community':
        break;
    }
  };
  return (<div className="space-y-0 -mt-8 md:-mt-10">
    {/* PAR-Q+ Screening Modal */}
    {showParqModal && (<ParqModal onClose={() => {
      setShowParqModal(false);
      setShowParqBanner(false);
    }} />)}

    {/* PAR-Q+ Health Screening Banner */}
    {showParqBanner && (<div className="-mx-6 md:-mx-12 px-6 md:px-12 py-3 bg-gradient-to-r from-[#00C4B4]/10 via-[#00C4B4]/5 to-transparent border-b border-[#00C4B4]/20 flex items-center gap-3">
      <ShieldCheck className="w-5 h-5 text-[#00C4B4] flex-shrink-0" />
      <p className="text-sm text-white/80 flex-1">
        <strong className="text-[#00C4B4]">Complete your ACE PAR-Q+ Health Screening</strong>{' '}
        — ensure you&apos;re safe to exercise before starting your program.
      </p>
      <button onClick={() => setShowParqModal(true)} className="text-xs font-bold text-[#0a0a0f] bg-[#00C4B4] px-3 py-1.5 rounded-full hover:scale-105 transition-transform cursor-pointer flex-shrink-0">
        Take Screening
      </button>
      <button onClick={() => setShowParqBanner(false)} className="text-white/30 hover:text-white/60 transition-colors cursor-pointer flex-shrink-0" aria-label="Dismiss banner">
        <X className="w-4 h-4" />
      </button>
    </div>)}

    {/* Hero Carousel - FULL WIDTH */}
    <div className="-mx-6 md:-mx-12 -mt-8 md:-mt-10">
      <HeroCarousel userName={user?.name} onAction={handleCarouselAction} onColorChange={onHeroColorChange} autoPlayInterval={6000} currentColor={heroColor} />
    </div>

    <div className="section-transition" />

    {/* Quick Stats Dashboard */}
    <section ref={statsRef} data-section="stats" className={`section-container section-reveal mb-8 py-6 md:py-8 ${visibleSections.has('stats') ? 'visible' : ''}`}>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-extrabold text-white">Your Progress</h2>
        <button
          onClick={onViewProgressDetail}
          className="text-sm font-semibold text-lime-light hover:underline cursor-pointer"
        >
          See All →
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <EnhancedStatsCard icon={<Dumbbell className="w-6 h-6" />} label="Total Workouts" value={47} change={12} color="#00C4B4" data={[30, 35, 38, 42, 44, 45, 47]} chartType="area" target={50} comparison={{ label: 'last month', value: 35 }} />
        <EnhancedStatsCard icon={<Clock className="w-6 h-6" />} label="Minutes This Week" value={320} suffix="min" change={8} color="#3E25F5" data={[280, 290, 295, 300, 305, 315, 320]} chartType="line" target={350} />
        <EnhancedStatsCard icon={<Flame className="w-6 h-6" />} label="Calories Today" value={1240} suffix="cal" change={-3} color="#EF4444" data={[1100, 1150, 1200, 1180, 1220, 1260, 1240]} chartType="bar" target={1500} />
        <EnhancedStatsCard icon={<Target className="w-6 h-6" />} label="Current Streak" value={12} suffix="days" color="#10B981" data={[5, 6, 7, 8, 9, 10, 11, 12]} chartType="area" target={30} comparison={{ label: 'best', value: 15 }} />
      </div>
    </section>

    <div className="section-transition" />

    {/* Today's Recommended Workouts */}
    <section ref={recommendedRef} data-section="recommended" className={`section-container section-reveal py-6 md:py-8 ${visibleSections.has('recommended') ? 'visible' : ''}`}>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-extrabold text-white">Recommended for You</h2>
        <button className="text-sm font-semibold text-lime-light hover:underline">See All →</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {recommendedWorkouts.map((workout) => {
          const imageUrl = workout.thumbnailUrl || `https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80&sig=${workout.id}`;
          return (<div key={workout.id} onClick={() => onSelectWorkout(workout.slug, '#00C4B4')} className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:border-lime-light/50 transition-all" style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            {/* Static dark gradient overlay — no canvas needed */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,15,0.25) 0%, rgba(10,10,15,0.6) 50%, rgba(10,10,15,0.96) 100%)' }} />
            <div className="absolute inset-0 bg-noir-eclipse/20 group-hover:bg-noir-eclipse/0 transition-all duration-500" />

            <div className="relative h-full p-6 flex flex-col justify-end z-10">
              <span className="inline-block w-fit px-3 py-1 rounded-full text-xs font-bold uppercase bg-lime-light text-noir-eclipse mb-3">
                {workout.category}
              </span>
              <h3 className="text-xl font-extrabold text-white mb-2">{workout.title}</h3>
              <p className="text-sm text-white/70 mb-4">
                {workout.duration} min • {workout.difficulty} • {workout.calories} cal
              </p>
              <button className="flex items-center gap-2 text-lime-light font-bold text-sm group-hover:gap-3 transition-all">
                <span>Start Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>);
        })}
      </div>
    </section>

    {/* Fitness Tips Strip + Live Articles */}
    <section ref={tipsRef} data-section="tips" className={`section-container section-reveal py-6 md:py-8 ${visibleSections.has('tips') ? 'visible' : ''}`}>
      <FitnessTipsStrip />
      <div className="mt-10">
        <LiveArticleCards onSelectArticle={handleOpenArticle} />
      </div>
    </section>

    {/* ─────────────── SECTION: WHY FITGUIDE ─────────────── */}

    {/* Feature Sections Intro */}
    <div ref={featuresRef} data-section="features" className={`section-reveal ${visibleSections.has('features') ? 'visible' : ''}`}>
      {/* Section Intro Header */}
      <div className="text-center mb-10">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase bg-lime-light/15 text-lime-light border border-lime-light/30 mb-4 tracking-widest">
          Why FitGuide Plus
        </span>
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
          Everything You Need to<br />
          <span className="text-lime-light">Reach Your Peak</span>
        </h2>
        <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
          A comprehensive fitness platform built around science, community, and your individual goals.
        </p>
      </div>

      {/* Interactive Feature Showcase replacing the old stacked full-width banners */}
      <InteractiveFeatureShowcase onNavigateToPrograms={onNavigateToPrograms} onNavigateToExplore={onNavigateToExplore} onNavigateToProgress={onNavigateToProgress} onNavigateToProfile={onNavigateToProfile} />
    </div>

    {/* Visual Separator */}
    <div className="py-8 md:py-12">
      <div className="relative">
        {/* Gradient Line */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {/* Center Ornament */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-2 bg-noir-eclipse px-6 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-lime-light/40"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-lime-light/60"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-lime-light"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-lime-light/60"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-lime-light/40"></div>
          </div>
        </div>
      </div>
    </div>

    {/* ─────────────── PROGRAMS BRIDGE ─────────────── */}
    <section ref={programsBridgeRef} data-section="programs-bridge" className={`section-container section-reveal py-6 md:py-10 ${visibleSections.has('programs-bridge') ? 'visible' : ''}`}>
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-royal-nebula/20 via-lime-light/5 to-royal-nebula/20 border border-white/10 p-12 md:p-16">
        <div className="absolute top-0 left-0 w-96 h-96 bg-lime-light/5 rounded-full blur-3xl -ml-48 -mt-48" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-royal-nebula/10 rounded-full blur-3xl -mr-40 -mb-40" />
        <div className="relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase bg-lime-light/20 text-lime-light border border-lime-light/30 mb-6">
                Structured Programs
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                Training Programs Built for Every Level
              </h2>
              <p className="text-lg text-white/70 mb-6">
                Discover structured workout programs designed to progress you from beginner fundamentals through advanced athletic training. Choose your level and start your transformation today.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Beginner programs for solid foundations',
                  'Intermediate programs to increase intensity',
                  'Advanced programs for peak performance',
                ].map((item, idx) => (<li key={idx} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-lime-light" />
                  <span className="text-white/70">{item}</span>
                </li>))}
              </ul>
              <button onClick={onNavigateToPrograms} className="px-8 py-4 bg-lime-light text-noir-eclipse font-extrabold rounded-xl hover:bg-lime-light/90 transition-all uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer">
                <span>Explore Programs</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { number: '3', label: 'Training Levels', icon: TrendingUp },
                { number: '50+', label: 'Programs', icon: BookOpen },
                { number: '100%', label: 'Customisable', icon: Zap },
                { number: '∞', label: 'Progression', icon: Award },
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (<div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center hover:border-lime-light/30 hover:bg-white/8 transition-all group">
                  <Icon className="w-6 h-6 text-lime-light mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-3xl font-extrabold text-lime-light mb-1">{stat.number}</div>
                  <div className="text-xs font-semibold text-white/60 uppercase tracking-wide">{stat.label}</div>
                </div>);
              })}
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ─────────────── TESTIMONIALS / SUCCESS STORIES ─────────────── */}
    <section ref={testimonialsRef} data-section="testimonials" className={`section-reveal py-6 md:py-10 ${visibleSections.has('testimonials') ? 'visible' : ''}`}>
      {/* Header */}
      <div className="text-center mb-14">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase bg-lime-light/15 text-lime-light border border-lime-light/30 mb-4 tracking-widest">
          Success Stories
        </span>
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
          Real People. Real Results.
        </h2>
        <p className="text-lg text-white/60 max-w-2xl mx-auto">
          Thousands of members have already transformed their lives with FitGuide Plus. Here's what they have to say.
        </p>
      </div>

      {/* Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {TESTIMONIALS.map((t, i) => (<div key={i} className="bg-obsidian-wave border border-white/10 rounded-2xl p-7 hover:border-lime-light/30 hover:shadow-[0_4px_30px_rgba(0, 196, 180,0.08)] transition-all group relative overflow-hidden">
          {/* Quote decoration */}
          <div className="absolute top-4 right-5 text-6xl font-black text-lime-light/10 leading-none select-none group-hover:text-lime-light/15 transition-colors">"</div>

          {/* Stars */}
          <div className="flex gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, s) => (<Star key={s} className="w-4 h-4 fill-lime-light text-lime-light" />))}
          </div>

          {/* Quote */}
          <p className="text-white/80 text-sm leading-relaxed mb-6 font-medium italic">
            "{t.quote}"
          </p>

          {/* Stats badge */}
          <div className="flex items-center gap-2 mb-5">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-lime-light/15 text-lime-light border border-lime-light/25 tracking-wider">
              {t.achievement}
            </span>
          </div>

          {/* Author */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold text-noir-eclipse flex-shrink-0" style={{ background: t.color }}>
              {t.initials}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{t.name}</p>
              <p className="text-xs text-white/50">{t.role}</p>
            </div>
          </div>
        </div>))}
      </div>

      {/* Aggregate Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: '12,400+', label: 'Active Members', icon: Users, color: '#00C4B4' },
          { value: '4.9 / 5', label: 'Average Rating', icon: Star, color: '#F59E0B' },
          { value: '98%', label: 'Completion Rate', icon: Award, color: '#10B981' },
          { value: '2.1M+', label: 'Workouts Logged', icon: Dumbbell, color: '#3E25F5' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (<div key={i} className="bg-obsidian-wave border border-white/10 rounded-2xl p-5 text-center hover:border-white/20 transition -all">
            <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
            <div className="text-2xl md:text-3xl font-extrabold text-white mb-1">{stat.value}</div>
            <div className="text-xs text-white/50 uppercase tracking-wider font-semibold">{stat.label}</div>
          </div>);
        })}
      </div>

      {/* Watch video CTA */}
      <div className="mt-10 text-center">
        <button className="inline-flex items-center gap-3 px-8 py-4 bg-white/8 backdrop-blur-sm text-white font-bold rounded-xl hover:bg-white/15 transition-all border border-white/20 group">
          <span className="w-10 h-10 rounded-full bg-lime-light flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play className="w-4 h-4 text-noir-eclipse fill-current ml-0.5" />
          </span>
          <span>Watch Member Transformations</span>
          <Video className="w-5 h-5 text-white/50" />
        </button>
      </div>
    </section>

    {/* ─────────────── EDITORIAL / LATEST NEWS & TOOLS ─────────────── */}
    <section ref={editorialRef} data-section="editorial" className={`section-reveal py-6 md:py-10 ${visibleSections.has('editorial') ? 'visible' : ''}`}>
      {/* Section Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase bg-royal-nebula/20 text-royal-nebula border border-royal-nebula/30 mb-3 tracking-widest">
            Knowledge Hub
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Fuel Your Knowledge
          </h2>
          <p className="text-white/55 mt-2 text-sm">Expert articles, research-backed guides, and practical tools</p>
        </div>
        <button className="hidden md:flex items-center gap-1.5 text-sm font-bold text-lime-light hover:text-lime-light/80 transition-colors">
          View All Articles <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Featured Article (large) + 2 side articles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Featured */}
        <div
          onClick={() => handleOpenArticle({
            id: 'progressive-overload',
            title: 'The Science of Progressive Overload: Why Your Muscles Need Constant Challenge',
            category: 'TRAINING',
            author: 'Dr. Marcus Vance, CSCS',
            readTime: '6 min read',
            thumbnail: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
            description: 'Progressive overload is the cornerstone of all strength training. Without continually increasing the stimulus, your body adapts and progress plateaus.'
          })}
          className="md:col-span-2 group relative rounded-2xl overflow-hidden border border-white/10 hover:border-lime-light/30 transition-all cursor-pointer bg-obsidian-wave"
        >
          <div className="relative h-64 md:h-80 overflow-hidden">
            <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80" alt="Progressive Overload" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian-wave via-obsidian-wave/40 to-transparent" />
            <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-lime-light text-noir-eclipse tracking-wider">
              Featured
            </span>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/25">Training</span>
              <span className="text-xs text-white/40">• 6 min read</span>
              <span className="text-xs text-white/40">• By Dr. Marcus Vance</span>
            </div>
            <h3 className="text-xl font-extrabold text-white mb-2 group-hover:text-lime-light transition-colors leading-snug">
              The Science of Progressive Overload: Why Your Muscles Need Constant Challenge
            </h3>
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              Progressive overload is the cornerstone of all strength training. Without continually increasing the stimulus, your body adapts and progress plateaus — here's exactly how to keep advancing.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/35">1 Aug 2026</span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-lime-light group-hover:gap-2.5 transition-all">
                Read Article <BookOpen className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Side articles */}
        <div className="flex flex-col gap-6">
          {SIDE_ARTICLES.map((article, i) => (<div key={i} onClick={() => handleOpenArticle(article)} className="group flex-1 bg-obsidian-wave border border-white/10 hover:border-lime-light/30 rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-[0_4px_20px_rgba(255,255,255,0.05)]">
            <div className="h-36 overflow-hidden relative">
              <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian-wave/90 to-transparent" />
              <span className="absolute bottom-2 left-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider" style={{ background: `${article.color}22`, color: article.color, border: `1px solid ${article.color}40` }}>
                {article.category}
              </span>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-white/40">{article.readTime}</span>
                <span className="text-white/20">•</span>
                <span className="text-[10px] text-white/40">{article.author}</span>
              </div>
              <h4 className="font-bold text-white text-sm leading-snug mb-1 group-hover:text-lime-light transition-colors line-clamp-2">
                {article.title}
              </h4>
              <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{article.description}</p>
            </div>
          </div>))}
        </div>
      </div>

      {/* Bottom 3 tools/articles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TOOL_ARTICLES.map((item, i) => (<div key={i} className="group bg-obsidian-wave border border-white/10 rounded-2xl p-6 hover:border-white/25 transition-all cursor-pointer hover:shadow-[0_4px_20px_rgba(255,255,255,0.04)]">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: `${item.color}18`, border: `1px solid ${item.color}30` }}>
            <item.icon className="w-5 h-5" style={{ color: item.color }} />
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mb-3" style={{ background: `${item.color}15`, color: item.color, border: `1px solid ${item.color}30` }}>
            {item.category}
          </span>
          <h4 className="font-extrabold text-white mb-2 leading-snug group-hover:text-lime-light transition-colors">{item.title}</h4>
          <p className="text-sm text-white/55 leading-relaxed mb-4">{item.description}</p>
          <div className="flex items-center justify-between pt-3 border-t border-white/8">
            <span className="text-xs text-white/35">{item.meta}</span>
            <span className="flex items-center gap-1 text-xs font-bold" style={{ color: item.color }}>
              {item.cta} <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>))}
      </div>
    </section>

    {/* ─────────────── COMMUNITY SECTION ─────────────── */}
    <section ref={communityRef} data-section="community" className={`section-reveal py-6 md:py-10 ${visibleSections.has('community') ? 'visible' : ''}`}>
      <div className="relative rounded-3xl overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80)' }} />
        <div className="absolute inset-0 bg-gradient-to-br from-noir-eclipse/95 via-noir-eclipse/80 to-noir-eclipse/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-royal-nebula/10 to-transparent" />

        {/* Glow orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-lime-light/8 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-royal-nebula/15 rounded-full blur-3xl -ml-16 -mb-16" />

        <div className="relative z-10 p-12 md:p-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Call to action */}
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase bg-lime-light/15 text-lime-light border border-lime-light/30 mb-6 tracking-widest">
                Community
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
                Join 12,400+ Fitness Enthusiasts Worldwide
              </h2>
              <p className="text-lg text-white/65 mb-8 leading-relaxed">
                Connect, share milestones, join challenges, and get inspired by people just like you. The FitGuide community is your support system on every step of the journey.
              </p>

              {/* Member Avatars Preview */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex -space-x-3">
                  {MEMBER_COLORS.map((color, i) => (<div key={i} className="w-10 h-10 rounded-full border-2 border-noir-eclipse flex items-center justify-center text-xs font-bold text-noir-eclipse" style={{ background: color }}>
                    {MEMBER_INITIALS[i]}
                  </div>))}
                  <div className="w-10 h-10 rounded-full border-2 border-noir-eclipse bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/70 backdrop-blur-sm">
                    +12k
                  </div>
                </div>
                <div>
                  <div className="flex gap-0.5 mb-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (<Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />))}
                  </div>
                  <p className="text-xs text-white/55">Trusted by members in 48 countries</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <button className="px-8 py-4 bg-lime-light text-noir-eclipse font-extrabold rounded-xl hover:bg-lime-light/90 transition-all uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer">
                  <Users className="w-5 h-5" />
                  <span>Join the Community</span>
                </button>
                <button className="px-6 py-4 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-all inline-flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-400" />
                  <span>View Challenges</span>
                </button>
              </div>
            </div>

            {/* Right: Community stats cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '12,400+', label: 'Active Members', icon: Users, color: '#00C4B4', sub: 'Growing daily' },
                { value: '340+', label: 'Live Challenges', icon: Zap, color: '#3E25F5', sub: 'This month' },
                { value: '48', label: 'Countries', icon: Award, color: '#10B981', sub: 'Worldwide reach' },
                { value: '96%', label: 'Would Recommend', icon: Heart, color: '#EF4444', sub: 'From surveys' },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (<div key={i} className="bg-white/8 backdrop-blur-sm border border-white/15 rounded-2xl p-5 hover:border-white/30 hover:bg-white/12 transition-all group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform" style={{ background: `${stat.color}20` }}>
                    <Icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                  <div className="text-2xl font-extrabold text-white mb-0.5">{stat.value}</div>
                  <div className="text-xs font-bold text-white/70 mb-1">{stat.label}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wide">{stat.sub}</div>
                </div>);
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>);
};
// ─── Fitness Tips Strip ────────────────────────────────────────────────────────
const FITNESS_TIPS = [
  { emoji: '💪', text: '150 min/week of moderate exercise reduces chronic disease risk by up to 35%.' },
  { emoji: '🥗', text: 'Eating 25–30g of protein per meal maximises muscle protein synthesis.' },
  { emoji: '😴', text: '7–9 hours of sleep per night can improve athletic performance by 20%.' },
  { emoji: '💧', text: 'Staying hydrated boosts workout performance — even 2% dehydration reduces output.' },
  { emoji: '🔥', text: 'HIIT burns up to 30% more calories than steady-state cardio in the same time.' },
  { emoji: '🧠', text: 'Exercise increases BDNF — the "brain fertiliser" that sharpens focus and memory.' },
  { emoji: '⏱️', text: 'Rest 48–72 hours between training the same muscle group for optimal recovery.' },
  { emoji: '🍌', text: "Carbohydrates are your muscles' primary fuel — don't cut them before workouts." },
  { emoji: '🏋️', text: 'Progressive overload — gradually increasing weight or reps — is the key to strength gains.' },
  { emoji: '🧘', text: 'Just 10 minutes of daily stretching improves flexibility and reduces injury risk.' },
];
const FitnessTipsStrip = () => {
  const [tipIndex, setTipIndex] = useState(0);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setTipIndex(prev => (prev + 1) % FITNESS_TIPS.length);
        setFading(false);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  const tip = FITNESS_TIPS[tipIndex];
  return (<div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-lime-light/10 via-lime-light/5 to-transparent border border-lime-light/20 px-6 py-4">
    <div className="absolute inset-0 bg-gradient-to-r from-lime-light/5 to-transparent pointer-events-none" />
    <div className="relative flex items-center gap-4">
      <span className="flex-shrink-0 px-3 py-1 bg-lime-light text-noir-eclipse text-[10px] font-black uppercase tracking-widest rounded-full">
        Did You Know
      </span>
      <p className="text-sm text-white font-medium transition-opacity duration-400" style={{ opacity: fading ? 0 : 1 }}>
        <span className="mr-2">{tip.emoji}</span>
        {tip.text}
      </p>
      <div className="flex-shrink-0 flex gap-1 ml-auto">
        {FITNESS_TIPS.map((_, i) => (<button key={i} onClick={() => { setTipIndex(i); setFading(false); }} className={`h-1.5 rounded-full transition-all cursor-pointer ${i === tipIndex ? 'bg-lime-light w-4' : 'bg-white/30 w-1.5'}`} />))}
      </div>
    </div>
  </div>);
};
const RSS_SOURCES = [
  // `feed` ids are the feeds the API proxies (fitguide_api/routes/articles.js).
  { label: 'Healthline Fitness', feed: 'healthline', color: '#00C4B4', category: 'HEALTH' },
  { label: 'Medical News Today', feed: 'mnt', color: '#60A5FA', category: 'WELLNESS' },
];
const FALLBACK_ARTICLES = [
  {
    title: 'The Science of Progressive Overload: Why Your Muscles Need Constant Challenge',
    link: '#',
    description: 'Progressive overload is the gradual increase of stress placed on the body during training. Without it, your body adapts and progress stalls.',
    pubDate: new Date().toISOString(),
    category: 'TRAINING',
    thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
  },
  {
    title: 'Protein Timing: Does It Really Matter When You Eat for Muscle Growth?',
    link: '#',
    description: 'Research shows total daily protein intake matters more than exact timing, but eating protein around workouts has added benefits.',
    pubDate: new Date().toISOString(),
    category: 'NUTRITION',
    thumbnail: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80',
  },
  {
    title: 'Active Recovery: How Low-Intensity Movement Helps You Bounce Back Faster',
    link: '#',
    description: 'Instead of complete rest, light activity like walking or yoga on recovery days can improve blood flow and reduce soreness.',
    pubDate: new Date().toISOString(),
    category: 'RECOVERY',
    thumbnail: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80',
  },
];
const ARTICLE_CATEGORY_COLORS = {
  TRAINING: '#00C4B4',
  NUTRITION: '#34D399',
  RECOVERY: '#60A5FA',
  WELLNESS: '#C084FC',
  HEALTH: '#FB923C',
};
const LiveArticleCards = ({ onSelectArticle }) => {
  const [articles, setArticles] = useState(FALLBACK_ARTICLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sourceIdx, setSourceIdx] = useState(0);
  const fetchArticles = async (idx) => {
    setLoading(true);
    setError(false);
    const source = RSS_SOURCES[idx];
    try {
      // Proxied through the API so the rss2json key stays server-side.
      const data = await apiRequest('/articles', { query: { feed: source.feed, count: 3 } });
      if (!data.articles?.length)
        throw new Error('No items');
      const mapped = data.articles.map((item) => ({
        ...item,
        description: item.description.slice(0, 120) + '...',
        category: source.category,
      }));
      setArticles(mapped);
    }
    catch {
      setArticles(FALLBACK_ARTICLES);
      setError(true);
    }
    finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchArticles(sourceIdx); }, [sourceIdx]);
  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    catch {
      return '';
    }
  };
  return (<div className="space-y-5">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-extrabold text-white">Fitness Insights</h2>
        <p className="text-sm text-white/50 mt-0.5">Latest articles to fuel your knowledge</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex bg-obsidian-wave border border-white/20 rounded-xl p-0.5">
          {RSS_SOURCES.map((s, i) => (<button key={i} onClick={() => setSourceIdx(i)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${sourceIdx === i ? 'bg-lime-light text-noir-eclipse' : 'text-white/50 hover:text-white'}`}>
            {s.label}
          </button>))}
        </div>
        {!loading && (<button onClick={() => fetchArticles(sourceIdx)} className="w-8 h-8 rounded-xl bg-obsidian-wave border border-white/20 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>)}
      </div>
    </div>

    {loading ? (<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {[1, 2, 3].map(i => <div key={i} className="h-64 bg-obsidian-wave rounded-2xl animate-pulse border border-white/10" />)}
    </div>) : (<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {articles.map((article, i) => {
        const catColor = ARTICLE_CATEGORY_COLORS[article.category || 'HEALTH'] || '#00C4B4';
        return (<div key={i} onClick={() => onSelectArticle && onSelectArticle(article)} className="group block bg-obsidian-wave border border-white/10 hover:border-lime-light/40 rounded-2xl overflow-hidden transition-all cursor-pointer" onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 24px ${catColor}20`; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>
          <div className="h-40 bg-noir-eclipse overflow-hidden relative">
            {article.thumbnail ? (<img src={article.thumbnail} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />) : (<div className="w-full h-full flex items-center justify-center" style={{ background: `${catColor}15` }}>
              <span className="text-4xl">📰</span>
            </div>)}
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian-wave/80 to-transparent" />
            <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase" style={{ background: `${catColor}25`, color: catColor, border: `1px solid ${catColor}40` }}>
              {article.category || 'HEALTH'}
            </span>
          </div>
          <div className="p-4 space-y-2">
            <h3 className="font-extrabold text-white text-sm leading-snug group-hover:text-lime-light transition-colors line-clamp-2">
              {article.title}
            </h3>
            <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{article.description}</p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-white/30">{formatDate(article.pubDate)}</span>
              <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: catColor }}>
                Read more <BookOpen className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>
        </div>);
      })}
    </div>)}

    {error && (<p className="text-[10px] text-white/30 text-center">Showing curated articles. Live feed unavailable.</p>)}
  </div>);
};
// ─── Static data ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "FitGuide completely changed how I approach fitness. The personalised programs and progress tracking kept me motivated through my entire 12-week transformation.",
    name: 'Marcus T.',
    role: 'Software Engineer · Lost 18 kg',
    initials: 'MT',
    color: '#00C4B4',
    achievement: '-18 kg in 12 weeks',
  },
  {
    quote: "I tried every app out there. FitGuide is the only one that actually adapts to me. The exercise library and form tips are next level — I've never felt stronger.",
    name: 'Priya S.',
    role: 'Teacher · Gained 8 kg muscle',
    initials: 'PS',
    color: '#3E25F5',
    achievement: '+8 kg lean muscle',
  },
  {
    quote: "Running my first half-marathon felt impossible until I started following the FitGuide training plan. The community kept me accountable every single day.",
    name: 'Jordan K.',
    role: 'Nurse · Completed first half-marathon',
    initials: 'JK',
    color: '#10B981',
    achievement: 'First half-marathon',
  },
];
const SIDE_ARTICLES = [
  {
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80',
    title: 'Protein Timing: Does It Really Matter When You Eat?',
    description: 'New research challenges conventional wisdom around the "anabolic window" — here is what the data actually shows.',
    category: 'NUTRITION',
    color: '#34D399',
    readTime: '5 min read',
    author: 'Dr. L. Park',
  },
  {
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80',
    title: 'Active Recovery: The Missing Piece in Your Training Week',
    description: 'Low-intensity movement on rest days accelerates repair, improves blood flow, and reduces DOMS significantly.',
    category: 'RECOVERY',
    color: '#60A5FA',
    readTime: '4 min read',
    author: 'Coach A. Mercer',
  },
];
const TOOL_ARTICLES = [
  {
    icon: Target,
    title: 'BMR & TDEE Calculator',
    description: 'Instantly calculate your Basal Metabolic Rate and daily calorie needs to hit your body composition goals with precision.',
    category: 'TOOL',
    color: '#00C4B4',
    meta: '2 min to complete',
    cta: 'Calculate Now',
  },
  {
    icon: Heart,
    title: 'Heart Rate Zone Training',
    description: 'Understand your five training zones and learn exactly how hard to push during every session to optimise fat burn and performance.',
    category: 'GUIDE',
    color: '#EF4444',
    meta: '6 min read',
    cta: 'Read Guide',
  },
  {
    icon: Dumbbell,
    title: 'One-Rep Max (1RM) Calculator',
    description: 'Estimate your maximum strength across all major lifts using your recent workout data — no risky max-effort testing required.',
    category: 'TOOL',
    color: '#3E25F5',
    meta: '1 min to complete',
    cta: 'Try It Now',
  },
];
const MEMBER_COLORS = ['#00C4B4', '#3E25F5', '#10B981', '#EF4444', '#F59E0B'];
const MEMBER_INITIALS = ['MT', 'PS', 'JK', 'AR', 'LB'];
