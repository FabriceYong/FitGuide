import { SiteHeader } from '../../components/SiteHeader';
import { WorkoutCatalog } from '../../features/workout/WorkoutCatalog';
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
      <main id="main" className="max-w-[1400px] mx-auto px-4 md:px-8 py-10 space-y-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold">Workouts</h1>
          <p className="text-white-70 mt-2">{workouts.length} guided workouts across {byCategory.size} categories.</p>
        </div>

        {!data && (
          <p className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 text-white-70">
            The workout catalog can&apos;t be loaded right now. Please try again in a moment.
          </p>
        )}

        {workouts.length > 0 && <WorkoutCatalog workouts={workouts} />}
      </main>
    </div>
  );
}
