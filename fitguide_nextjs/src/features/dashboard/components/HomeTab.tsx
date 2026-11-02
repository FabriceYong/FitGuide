'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, ArrowRight, BookOpen, CalendarDays, Calculator, Check, Clock, Crown, Dumbbell, ExternalLink, Flame, Lightbulb,
  RefreshCw, ShieldCheck, Sparkles, Star, Target, TrendingUp, Users, Utensils, X, type LucideIcon,
} from 'lucide-react';
import { personalCalories, rankWorkouts } from '@fitguide/shared';
import { useAuth, type AuthUser } from '../../../contexts/AuthContext';
import { useWorkouts } from '../../../context/WorkoutContext';
import { fetchFeedArticles, fetchReviews, type FeedId } from '../../../services/contentService';
import { fetchProgressSummary, fetchPrograms, type ProgressSummary, type SessionRecord } from '../../../services/trainingService';
import type { FeedArticle, Review, Workout } from '../../../types/catalog';
import { ParqModal, hasParqResult } from '../../../components/ParqModal';
import { playHref } from '../../programs/ProgramDetail';
import { formatDay, scheduleHref } from '../../progress/format';
import { useStartSignUp } from '../../auth/AuthWrapper';
import { ARTICLES, CATEGORY_COLORS, builtInView, unsplashUrl, writtenView, type ArticleView } from '../articles';
import { fetchPublishedArticles } from '../../../services/articleService';
import { Modal } from '../../../components/Modal';
import type { TabId } from '../tabs';
import { HeroCarousel, type HeroSlide } from './HeroCarousel';
import { StatCard } from './StatCard';
import { TodayPanel } from './TodayPanel';
import { PlanSuggestionCard } from '../../plan/PlanSuggestionCard';
import { CoachNotes } from './CoachNotes';
import { ReadinessCard } from './ReadinessCard';
import { WorkoutCard } from './WorkoutCard';

/** Days since 1970, used to rotate daily picks. */
const dayNumber = () => Math.floor(Date.now() / 864e5);

/**
 * Three workouts for this user, from their whole profile (goal, level, focus
 * areas, equipment, time, limitations; see @fitguide/shared tailoring), each
 * with the reasons it fits. Workouts done in the last week drop back, and
 * the pick rotates daily so the list doesn't go stale.
 */
function recommend(workouts: Workout[], user: AuthUser | null, recent: SessionRecord[]) {
  const recentSlugs = recent.filter((s) => Date.now() - new Date(s.completedAt).getTime() < 7 * 864e5).map((s) => s.workoutSlug);
  return rankWorkouts(workouts, user, { recentSlugs, day: dayNumber(), limit: 3 });
}

/** "Matched to your level (Beginner), goal (Weight) and focus areas", naming what the profile has. */
function matchedTo(user: AuthUser | null) {
  const parts = [
    user?.fitnessLevel && `level (${user.fitnessLevel})`,
    user?.goal && `goal (${user.goal})`,
    user?.focusAreas?.length && 'focus areas',
    user?.equipment?.length && 'equipment',
    user?.workoutMinutes && 'time',
    user?.limitations?.length && 'limitations',
  ].filter(Boolean) as string[];
  if (!parts.length) return null;
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return `Matched to your ${list}.`;
}

const TIPS = [
  'Adults benefit from at least 150 minutes of moderate activity a week, plus muscle-strengthening work on two days (WHO).',
  'Some activity is better than none. Even short walks count toward your weekly minutes (WHO).',
  'Warm up for 5–10 minutes before hard efforts: easy cardio and the movements you are about to load.',
  'Long static stretches of a minute or more right before lifting can briefly lower strength. Warm up with movement and stretch afterwards.',
  'Progress gradually: change one thing at a time, such as a little more weight or one more rep.',
  'Light weights build muscle too, as long as you take your sets close to failure.',
  'Resting 2–3 minutes between heavy sets lets you lift more than resting one minute does.',
  'Give a muscle group a day or two to recover after a hard session before training it hard again.',
  'Soreness that peaks a day or two after a new workout is normal. Sharp pain or joint pain is not: stop and get it checked.',
  'Most adults need 7–9 hours of sleep. It is when much of your recovery happens.',
  'Caffeine can boost performance, but it stays in your body for hours. Skip it within about 6 hours of bedtime.',
  'For people who lift, about 1.6 g of protein per kg of body weight a day covers what muscles can use for growth.',
  'Spread your protein over the day: 20–40 g per meal supports muscle repair better than one big serving.',
  'Most adults should aim for about 30 g of fibre a day. It keeps you full and helps digestion (NHS).',
  'Pale yellow urine is a simple sign that you are drinking enough.',
  'Thirsty during long or hot sessions? Drink regularly; you don’t need sports drinks for workouts under an hour.',
  'Breathe out as you push or lift, and breathe in as you lower, instead of holding your breath on every rep.',
  'Good form beats heavy weight. If your form breaks down, lower the load.',
  'You can’t burn fat from one spot. Crunches strengthen your abs, but fat loss happens across the whole body.',
  'Muscle doesn’t turn into fat when you stop training. They are different tissues: you lose one and may gain the other.',
  'Muscles you trained before grow back faster than they first grew. Muscle memory is real.',
  'A week or two off won’t erase your strength. Endurance fades sooner than strength does.',
  'Lifting weights helps keep your bones strong as you age.',
  'Balance exercises, such as standing on one leg, lower the risk of falls in older adults.',
  'Regular aerobic exercise strengthens your heart and can lower your resting heart rate.',
  'The 10,000-step goal began as a marketing slogan. Studies find big health benefits from around 7,000 steps a day.',
  'Sitting for hours? Getting up for a few minutes every half hour helps your body control blood sugar.',
  'Short sessions count. Ten minutes of movement is better than skipping a day.',
];

const FEEDS: { id: FeedId; label: string }[] = [
  { id: 'healthline', label: 'Healthline' },
  { id: 'mnt', label: 'Medical News Today' },
];

/** The dashboard's start page: what to do next, your numbers, and ways into the rest of FitGuide. */
export function HomeTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { user, hasAccount, isGuest } = useAuth();
  const startSignUp = useStartSignUp();
  const { workouts, loading: workoutsLoading } = useWorkouts();
  const [progress, setProgress] = useState<{ summary: ProgressSummary; recentSessions: SessionRecord[] } | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [programCount, setProgramCount] = useState<number | null>(null);
  const [written, setWritten] = useState<ArticleView[]>([]);
  const [showParq, setShowParq] = useState(false);
  const [parqDone, setParqDone] = useState(hasParqResult);

  useEffect(() => {
    if (!hasAccount) return;
    fetchProgressSummary().then(setProgress).catch((err: Error) => setProgressError(err.message));
  }, [hasAccount]);
  useEffect(() => {
    fetchPrograms().then((d) => setProgramCount(d.programs.length)).catch(() => setProgramCount(null));
    // Coaches' and admins' articles, newest first; the built-in guides show without them.
    fetchPublishedArticles().then((list) => setWritten(list.map(writtenView))).catch(() => setWritten([]));
  }, []);

  const summary = progress?.summary;
  const picks = useMemo(() => recommend(workouts, user, progress?.recentSessions || []), [workouts, user, progress]);
  const recommended = useMemo(() => picks.map((p) => p.workout), [picks]);
  const enrollment = summary?.activeEnrollment || null;
  const nextDay = enrollment?.nextDay || null;

  const slides: HeroSlide[] = useMemo(() => {
    const first = recommended[0];
    return [
      nextDay && enrollment
        ? {
          id: 'next',
          title: `Up next: ${nextDay.title}`,
          subtitle: `Week ${nextDay.week}, day ${nextDay.day} of ${enrollment.programTitle}${nextDay.date ? `, scheduled for ${formatDay(nextDay.date)}` : ''}.`,
          photo: '1517836357463-d25dfeac3438',
          primary: { label: 'Start session', href: playHref(enrollment, nextDay) },
          secondary: { label: 'See the schedule', href: scheduleHref(enrollment) },
        }
        : {
          id: 'start',
          title: 'Ready for today’s workout?',
          subtitle: `${workouts.length || 'Dozens of'} guided workouts with step-by-step instructions, a timer and form tips.`,
          photo: '1517836357463-d25dfeac3438',
          primary: first ? { label: `Start ${first.title}`, href: `/workouts/${first.slug}` } : { label: 'Browse workouts', href: '/workouts' },
          secondary: { label: 'Explore all workouts', onClick: () => onNavigate('explore') },
        },
      {
        id: 'plan',
        title: 'A plan built around you',
        subtitle: 'Answer a few questions and FitGuide schedules your weeks. The AI coach can adjust the plan as you go.',
        photo: '1534438327276-14e5300c3a48',
        primary: { label: enrollment ? 'Open my plan' : 'Build my plan', href: '/plan' },
        secondary: { label: 'Browse programs', onClick: () => onNavigate('programs') },
      },
      {
        id: 'nutrition',
        title: 'Eat for your goal',
        subtitle: 'Daily calorie and macro targets from your profile, a food log and simple meal plans.',
        photo: '1490645935967-10de6ba17061',
        primary: { label: 'Open nutrition', href: '/nutrition' },
        secondary: { label: 'Calculators', onClick: () => onNavigate('tools') },
      },
      {
        id: 'community',
        title: 'Train with friends',
        subtitle: 'Add friends with a code, start a challenge and see who’s ahead on the leaderboard.',
        photo: '1571019614242-c5c5dee9f50b',
        primary: { label: 'Go to community', href: '/community' },
        secondary: { label: 'Read reviews', onClick: () => onNavigate('reviews') },
      },
    ];
  }, [recommended, nextDay, enrollment, workouts.length, onNavigate]);

  const lastWeek = summary?.days.slice(-7) || [];
  const weeklySessions = summary
    ? Array.from({ length: 12 }, (_, i) => summary.days.slice(i * 7, i * 7 + 7).reduce((n, d) => n + d.sessions, 0))
    : [];

  return (
    <div className="space-y-14 -mt-8 md:-mt-10">
      {showParq && <ParqModal onClose={() => { setShowParq(false); setParqDone(hasParqResult()); }} />}

      <div className="-mx-6 md:-mx-12">
        {isGuest && (
          <div className="px-6 md:px-12 py-3 bg-royal-nebula/20 border-b border-royal-nebula/40 flex flex-wrap items-center gap-3">
            <p className="text-sm text-white flex-1 min-w-48">You’re browsing as a guest. Create a free account to save workouts, favorites and progress.</p>
            <button type="button" onClick={startSignUp} className="text-xs font-bold bg-white text-noir-eclipse px-4 py-2 rounded-full">Create account</button>
          </div>
        )}
        {!parqDone && (
          <div className="px-6 md:px-12 py-3 bg-lime-light/10 border-b border-lime-light/20 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-lime-light shrink-0" aria-hidden="true" />
            <p className="text-sm text-white flex-1">
              <strong className="text-lime-light">New to exercise or returning after a break?</strong> Take the one-minute PAR-Q health check first.
            </p>
            <button type="button" onClick={() => setShowParq(true)} className="text-xs font-bold text-noir-eclipse bg-lime-light px-3 py-1.5 rounded-full shrink-0">Take the check</button>
            <button type="button" onClick={() => setParqDone(true)} className="p-2 -m-2 text-white-70 hover:text-white shrink-0" aria-label="Hide the health check reminder">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <HeroCarousel slides={slides} greeting={user?.name ? `Hello, ${user.name.split(' ')[0]}` : undefined} />
      </div>

      {hasAccount && <CoachNotes />}

      {hasAccount && <ReadinessCard onPlanChanged={() => fetchProgressSummary().then(setProgress).catch(() => {})} />}

      {hasAccount && enrollment && (
        <PlanSuggestionCard onApplied={() => fetchProgressSummary().then(setProgress).catch(() => {})} />
      )}

      {hasAccount && <TodayPanel summary={summary} suggestion={recommended[0]} />}

      {/* Your numbers */}
      <section aria-labelledby="home-progress">
        <div className="flex justify-between items-center mb-6">
          <h2 id="home-progress" className="text-2xl font-extrabold text-white">Your progress</h2>
          {hasAccount && <button type="button" onClick={() => onNavigate('progress')} className="py-2 -my-2 text-sm font-semibold text-lime-light hover:underline">See all →</button>}
        </div>
        {!hasAccount ? (
          <div className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-white-70">With an account, your sessions, streaks and personal records appear here.</p>
            <button type="button" onClick={startSignUp} className="px-5 py-2.5 rounded-xl bg-lime-light text-noir-eclipse font-bold text-sm">Create an account</button>
          </div>
        ) : progressError && !summary ? (
          <p role="alert" className="flex items-center gap-2 text-red-300"><AlertCircle className="w-5 h-5" aria-hidden="true" /> {progressError}</p>
        ) : !summary ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-40 sm:h-48 bg-obsidian-wave rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard icon={<Dumbbell className="w-6 h-6" />} label="Total workouts" value={summary.totals.sessions} color="#00C4B4" data={weeklySessions} chartLabel="Workouts per week over the last 12 weeks" />
            <StatCard icon={<Clock className="w-6 h-6" />} label="Minutes this week" value={summary.thisWeek.minutes} suffix="min" color="#8B7CF6" data={lastWeek.map((d) => d.minutes)} chartType="line" chartLabel="Minutes per day over the last 7 days" />
            <StatCard icon={<Flame className="w-6 h-6" />} label="Calories this week" value={summary.thisWeek.calories} suffix="kcal" color="#EF4444" data={lastWeek.map((d) => d.calories)} chartType="bar" chartLabel="Calories per day over the last 7 days" />
            <StatCard
              icon={<Target className="w-6 h-6" />}
              label="Day streak"
              value={summary.streak.current}
              suffix={summary.streak.current === 1 ? 'day' : 'days'}
              footnote={summary.streak.current && !summary.streak.trainedToday ? 'Train today to keep it going' : `Best: ${summary.streak.longest}`}
              color="#10B981"
              data={lastWeek.map((d) => d.sessions)}
              chartType="bar"
              chartLabel="Sessions per day over the last 7 days"
            />
          </div>
        )}
        {hasAccount && summary && !enrollment && (
          <Link href="/plan" className="mt-4 flex items-center justify-between gap-3 p-4 rounded-2xl bg-obsidian-wave border border-lime-light/30 hover:border-lime-light text-sm">
            <span className="flex items-center gap-3 text-white"><CalendarDays className="w-5 h-5 text-lime-light" aria-hidden="true" /> No plan yet. Build one in a minute and get a weekly schedule.</span>
            <ArrowRight className="w-4 h-4 text-lime-light shrink-0" aria-hidden="true" />
          </Link>
        )}
      </section>

      {/* Recommended */}
      <section aria-labelledby="home-recommended">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 id="home-recommended" className="text-2xl font-extrabold text-white">Recommended for you</h2>
            {matchedTo(user) && (
              <p className="text-sm text-white-70 mt-1">
                {matchedTo(user)}{' '}
                <button type="button" onClick={() => onNavigate('profile')} className="underline hover:text-white">Change these in your profile</button>.
              </p>
            )}
          </div>
          <button type="button" onClick={() => onNavigate('explore')} className="text-sm font-semibold text-lime-light hover:underline shrink-0">See all →</button>
        </div>
        {workoutsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-hidden="true">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-72 bg-obsidian-wave rounded-[24px] animate-pulse" />)}
          </div>
        ) : picks.length === 0 ? (
          <p className="text-white-70">No workouts to recommend yet.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-label="Recommended workouts">
            {picks.map((p) => (
              <li key={p.workout.slug} className="space-y-2">
                <WorkoutCard workout={p.workout} tall calories={personalCalories(p.workout.calories, user)} />
                {p.reasons.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5" aria-label={`Why ${p.workout.title} suits you`}>
                    {p.reasons.map((r) => (
                      <li key={r} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-lime-light/10 border border-lime-light/25 text-[11px] font-semibold text-white">
                        <Check className="w-3 h-3 text-lime-light" aria-hidden="true" /> {r}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <TipOfTheDay />

      {/* Ways into the rest of FitGuide, for visitors finding their way around (members have "Today"). */}
      {!hasAccount && <section aria-labelledby="home-features">
        <h2 id="home-features" className="text-2xl font-extrabold text-white mb-2">Everything in FitGuide</h2>
        <p className="text-sm text-white-70 mb-6">
          {workouts.length ? `${workouts.length} workouts` : 'Guided workouts'}
          {programCount ? `, ${programCount} multi-week programs` : ''}, personal plans, nutrition tracking and more.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Feature icon={Sparkles} color="#00C4B4" title="Personal plan & AI coach" text="A weekly schedule for your goal, level and equipment. Ask the coach to change it." href="/plan" />
          <Feature icon={CalendarDays} color="#8B7CF6" title="Programs" text="Multi-week programs that track how well you stick to the schedule." onClick={() => onNavigate('programs')} />
          <Feature icon={Utensils} color="#34D399" title="Nutrition" text="Calorie and macro targets, a food log and meal plans." href="/nutrition" />
          <Feature icon={TrendingUp} color="#FB923C" title="Progress" text="Streaks, personal records, body measurements and wearable data." onClick={() => onNavigate('progress')} />
          <Feature icon={Users} color="#F472B6" title="Community" text="Friends, challenges and leaderboards." href="/community" />
          <Feature icon={BookOpen} color="#60A5FA" title="Exercise library" text="How to do each exercise, with form cues and common mistakes." onClick={() => onNavigate('explore')} />
          <Feature icon={Calculator} color="#FBBF24" title="Calculators" text="One-rep max, daily calories, heart rate zones and more." onClick={() => onNavigate('tools')} />
          {user?.plan === 'plus'
            ? <Feature icon={Crown} color="#FCD34D" title="Your PLUS membership" text="Manage your subscription and see what’s included." href="/plus" />
            : <Feature icon={Crown} color="#FCD34D" title="FitGuide PLUS" text="Every PLUS workout and program, and unlimited coach messages." href="/plus" />}
        </ul>
      </section>}

      {/* Reading */}
      <section aria-labelledby="home-articles" className="space-y-6">
        <div>
          <h2 id="home-articles" className="text-2xl font-extrabold text-white">Articles &amp; guides</h2>
          <p className="text-sm text-white-70 mt-1">Short reads by FitGuide coaches and the editorial team.</p>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...written, ...ARTICLES.map(builtInView)].map((a) => {
            const color = CATEGORY_COLORS[a.category];
            // Built-in guides use a smaller picture on the card than on the page.
            const builtIn = ARTICLES.find((g) => g.id === a.slug);
            const image = builtIn ? unsplashUrl(builtIn.photo, 600) : a.imageUrl;
            return (
              <li key={a.slug}>
                <Link href={`/articles/${a.slug}`} className="block w-full h-full text-left bg-obsidian-wave border border-white/10 hover:border-lime-light/40 rounded-2xl overflow-hidden group">
                  {image
                    ? <span className="block h-40 bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />
                    : <span className="block h-40" style={{ background: `linear-gradient(135deg, ${color}40, transparent)` }} aria-hidden="true" />}
                  <span className="block p-4 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color }}>{a.category} · {a.readMinutes} min</span>
                    <span className="block font-extrabold text-white leading-snug group-hover:text-lime-light">{a.title}</span>
                    <span className="block text-xs text-white-70 line-clamp-2">{a.description}</span>
                    <span className="block text-[11px] text-white-70">By {a.author.name}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <LiveFeed />
      </section>

      <CommunityHighlights onNavigate={onNavigate} />
    </div>
  );
}

function Feature({ icon: Icon, color, title, text, href, onClick }: {
  icon: LucideIcon; color: string; title: string; text: string; href?: string; onClick?: () => void;
}) {
  const body = (
    <>
      <span className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}1F`, color }} aria-hidden="true"><Icon className="w-5 h-5" /></span>
      <span className="block font-extrabold text-white mb-1 group-hover:text-lime-light">{title}</span>
      <span className="block text-sm text-white-70">{text}</span>
    </>
  );
  const className = 'block h-full w-full text-left bg-obsidian-wave border border-white/10 hover:border-white/25 rounded-2xl p-5 group';
  return (
    <li>
      {href ? <Link href={href} className={className}>{body}</Link> : <button type="button" onClick={onClick} className={className}>{body}</button>}
    </li>
  );
}

// How long each tip stays before the next one.
const TIP_MS = 7000;

/**
 * Starts on the day's tip and moves to the next every few seconds. It pauses
 * while the pointer or keyboard focus is on it, so it can be read in full.
 */
function TipOfTheDay() {
  const [index, setIndex] = useState(() => dayNumber() % TIPS.length);
  const [paused, setPaused] = useState(false);

  // Restarts after every change, so "Next tip" gives the new tip its full time.
  useEffect(() => {
    if (paused) return undefined;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % TIPS.length), TIP_MS);
    return () => clearTimeout(timer);
  }, [index, paused]);

  return (
    <section
      aria-label="Tip of the day"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="rounded-2xl bg-gradient-to-r from-lime-light/10 to-transparent border border-lime-light/20 px-6 py-4 flex flex-wrap items-center gap-4"
    >
      <span className="flex items-center gap-1.5 px-3 py-1 bg-lime-light text-noir-eclipse text-[10px] font-black uppercase tracking-widest rounded-full">
        <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" /> Tip
      </span>
      <p className="text-sm text-white font-medium flex-1 min-w-56">{TIPS[index]}</p>
      <button type="button" onClick={() => setIndex((i) => (i + 1) % TIPS.length)} className="py-2 -my-2 text-xs font-bold text-lime-light hover:underline">Next tip</button>
    </section>
  );
}

/**
 * Latest health news from two RSS feeds (fetched through the API). A story
 * opens as a preview here (the feed's summary); the full text stays on the
 * publisher's site, which the preview links to.
 */
function LiveFeed() {
  const [feed, setFeed] = useState<FeedId>('healthline');
  const [articles, setArticles] = useState<FeedArticle[] | null>(null);
  const [preview, setPreview] = useState<FeedArticle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    fetchFeedArticles(feed, 3)
      .then((list) => { if (current) { setArticles(list); setError(null); } })
      .catch((err: Error) => { if (current) setError(err.message); });
    return () => { current = false; };
  }, [feed, attempt]);

  const source = FEEDS.find((f) => f.id === feed)?.label || '';

  const choose = (id: FeedId) => {
    setFeed(id);
    setArticles(null);
    setError(null);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold text-white">Health news</h3>
        <div className="flex bg-obsidian-wave border border-white/20 rounded-xl p-0.5" role="group" aria-label="News source">
          {FEEDS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => choose(f.id)}
              aria-pressed={feed === f.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${feed === f.id ? 'bg-lime-light text-noir-eclipse' : 'text-white-70 hover:text-white'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-obsidian-wave border border-white/10 rounded-2xl p-4">
          <p className="text-sm text-white-70">The news feed is unavailable right now.</p>
          <button type="button" onClick={() => { setError(null); setAttempt((n) => n + 1); }} className="flex items-center gap-1.5 text-xs font-bold text-lime-light">
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
          </button>
        </div>
      ) : !articles ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-28 bg-obsidian-wave rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {articles.map((a) => (
            <li key={a.link}>
              <button type="button" onClick={() => setPreview(a)} aria-haspopup="dialog" className="block w-full h-full text-left bg-obsidian-wave border border-white/10 hover:border-lime-light/40 rounded-2xl p-4 group">
                <span className="block font-bold text-white text-sm leading-snug group-hover:text-lime-light line-clamp-3">{a.title}</span>
                <span className="flex items-center justify-between mt-3 text-xs text-white-70">
                  {a.pubDate ? new Date(a.pubDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''}
                  <span>{source}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {preview && (
        <Modal title={source} onClose={() => setPreview(null)} size="md">
          <div className="space-y-4">
            {preview.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.thumbnail} alt="" className="w-full h-48 object-cover rounded-xl border border-white/10" />
            )}
            <h3 className="text-xl font-extrabold text-white leading-snug">{preview.title}</h3>
            <p className="text-xs text-white-70">
              {[preview.author, preview.pubDate && new Date(preview.pubDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })].filter(Boolean).join(' · ')}
            </p>
            {preview.description && <p className="text-sm text-white-70 leading-relaxed">{preview.description}</p>}
            <a href={preview.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-lime-light text-noir-eclipse font-extrabold text-sm">
              Read the full story on {source} <ExternalLink className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <p className="text-[11px] text-white-70">The full article is published by {source}. FitGuide shows its headline and summary from their news feed.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Real member reviews (verified first), and the way into the community page. */
function CommunityHighlights({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { workouts } = useWorkouts();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  useEffect(() => {
    fetchReviews().then(setReviews).catch(() => setReviews([]));
  }, []);
  const titles = new Map(workouts.map((w) => [w.slug, w.title]));
  const best = (reviews || [])
    .filter((r) => r.rating >= 4)
    .sort((a, b) => Number(b.verified) - Number(a.verified) || b.likes - a.likes)
    .slice(0, 3);

  return (
    <section aria-labelledby="home-community" className="rounded-3xl bg-gradient-to-br from-royal-nebula/25 via-obsidian-wave to-obsidian-wave border border-white/10 p-8 md:p-12 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="home-community" className="text-3xl font-extrabold text-white">From the community</h2>
          <p className="text-white-70 mt-2 max-w-xl">Train with friends, join a challenge, and read what members say about the workouts.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/community" className="px-6 py-3 bg-lime-light text-noir-eclipse font-extrabold rounded-xl text-sm flex items-center gap-2">
            <Users className="w-4 h-4" aria-hidden="true" /> Friends & challenges
          </Link>
          <button type="button" onClick={() => onNavigate('reviews')} className="px-6 py-3 border border-white/25 text-white font-bold rounded-xl text-sm">All reviews</button>
        </div>
      </div>
      {reviews && best.length === 0 && <p className="text-sm text-white-70">No reviews yet. Finish a workout and share how it went.</p>}
      {best.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {best.map((r) => (
            <li key={r.id} className="bg-noir-eclipse/60 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
              <span className="flex gap-0.5" role="img" aria-label={`${r.rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-amber-300 text-amber-300' : 'text-white-70'}`} aria-hidden="true" />)}
              </span>
              <blockquote className="text-sm text-white leading-relaxed line-clamp-5 flex-1">{r.comment}</blockquote>
              <p className="text-xs text-white-70">
                <span className="font-bold text-white">{r.name}</span>
                {r.verified && <span className="ml-2 text-emerald-300 font-bold">Verified</span>}
                {r.workoutId && titles.has(r.workoutId) && (
                  <> · <Link href={`/workouts/${r.workoutId}`} className="underline hover:text-white">{titles.get(r.workoutId)}</Link></>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="flex items-center gap-2 text-xs text-white-70"><ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Reviews marked verified come from members who completed that workout in FitGuide.</p>
    </section>
  );
}
