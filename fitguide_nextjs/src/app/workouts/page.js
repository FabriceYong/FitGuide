import Link from 'next/link';
import { Clock, Flame, TrendingUp } from 'lucide-react';
import { SiteHeader } from '../../components/SiteHeader';
import { serverGetOrNull } from '../../lib/server-api';

// Rendered per request (data cached for 5 minutes in serverGet), so a build
// doesn't need the API to be running.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Workouts',
  description: 'Browse guided workouts by category: HIIT, strength, yoga, cardio, pilates and more, with step-by-step instructions.',
  alternates: { canonical: '/workouts' },
};

export default async function WorkoutsPage() {
  const data = await serverGetOrNull('/workouts');
  const workouts = data?.workouts || [];
  const byCategory = new Map();
  for (const w of workouts) {
    if (!byCategory.has(w.category)) byCategory.set(w.category, []);
    byCategory.get(w.category).push(w);
  }

  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins">
      <SiteHeader active="/workouts" />
      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-10 space-y-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold">Workouts</h1>
          <p className="text-white-70 mt-2">{workouts.length} guided workouts across {byCategory.size} categories.</p>
        </div>

        {!data && (
          <p className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 text-white-70">
            The workout catalog can&apos;t be loaded right now. Please try again in a moment.
          </p>
        )}

        {[...byCategory.entries()].map(([category, items]) => (
          <section key={category} className="space-y-4">
            <h2 className="text-lg font-bold">{category}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((w) => (
                <li key={w.slug}>
                  <Link
                    href={`/workouts/${w.slug}`}
                    className="block h-full bg-obsidian-wave border border-white-30/10 hover:border-lime-light/50 rounded-2xl p-5 transition-colors"
                  >
                    <h3 className="font-bold text-white">{w.title}</h3>
                    <p className="text-sm text-white-70 mt-1 line-clamp-2">{w.shortDescription || w.description}</p>
                    <div className="flex flex-wrap gap-4 mt-4 text-xs text-white-70">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{w.duration} min</span>
                      <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />{w.difficulty}</span>
                      {w.isPremium && <span className="font-extrabold text-amber-300">PLUS</span>}
                      {w.calories ? <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5" />{w.calories} kcal</span> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
