import { SiteHeader } from '../../components/SiteHeader';
import { ProgramCard } from '../../features/programs/ProgramCard';
import { serverGetOrNull } from '../../lib/server-api';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Training programs',
  description: 'Multi-week training programs for strength, fat loss, mobility and general fitness, with a day-by-day schedule.',
  alternates: { canonical: '/programs' },
};

export default async function ProgramsPage() {
  const data = await serverGetOrNull('/programs');
  const programs = data?.programs || [];

  return (
    <div className="min-h-screen bg-noir-eclipse text-white font-poppins">
      <SiteHeader active="/programs" />
      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-10 space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold">Training programs</h1>
          <p className="text-white-70 mt-2 max-w-2xl">
            Follow a plan week by week. Each program schedules workouts on set days and tracks which ones you&apos;ve done.
          </p>
        </div>
        {!data && (
          <p className="bg-obsidian-wave border border-white-30/10 rounded-2xl p-6 text-white-70">
            Programs can&apos;t be loaded right now. Please try again in a moment.
          </p>
        )}
        <ul className="grid gap-5 md:grid-cols-2">
          {programs.map((p) => (
            <li key={p.slug}><ProgramCard program={p} /></li>
          ))}
        </ul>
      </main>
    </div>
  );
}
