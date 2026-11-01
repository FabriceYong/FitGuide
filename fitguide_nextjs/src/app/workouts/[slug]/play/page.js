import { notFound } from 'next/navigation';
import { serverGet } from '../../../../lib/server-api';
import { PlayWorkout } from './PlayWorkout';
import { PlayOwnWorkout } from './PlayOwnWorkout';

export const metadata = { title: 'Workout in progress', robots: { index: false } };

const positiveInt = (value) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * /workouts/[slug]/play — the guided player.
 * From a program: ?enrollment=<id>&week=<n>&day=<n>, so the session counts
 * toward that program day.
 */
export default async function PlayPage({ params, searchParams }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const data = await serverGet(`/workouts/${encodeURIComponent(slug)}`, { revalidate: 300 });
  // Members' own workouts aren't in the catalog: the browser loads them with the session.
  if (!data?.workout) return slug.startsWith('my-') ? <PlayOwnWorkout slug={slug} /> : notFound();

  const week = positiveInt(query.week);
  const day = positiveInt(query.day);
  const program = typeof query.enrollment === 'string' && week && day
    ? { enrollmentId: query.enrollment, week, day, programSlug: typeof query.program === 'string' ? query.program : null }
    : null;

  return <PlayWorkout workout={data.workout} program={program} />;
}
