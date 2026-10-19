import { notFound } from 'next/navigation';
import { serverGet } from '../../../lib/server-api';
import { WorkoutDetailsRoute } from './WorkoutDetailsRoute';

const getWorkout = async (slug) => (await serverGet(`/workouts/${encodeURIComponent(slug)}`))?.workout || null;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const workout = await getWorkout(slug).catch(() => null);
  if (!workout) return { title: 'Workout not found' };
  const description = workout.shortDescription || workout.description;
  return {
    title: workout.title,
    description,
    alternates: { canonical: `/workouts/${workout.slug}` },
    openGraph: { title: workout.title, description, type: 'article' },
  };
}

export default async function WorkoutPage({ params }) {
  const { slug } = await params;
  const workout = await getWorkout(slug);
  if (!workout) notFound();

  // Structured data so search engines understand the page is an exercise plan.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ExercisePlan',
    name: workout.title,
    description: workout.description,
    exerciseType: workout.category,
    activityDuration: `PT${workout.duration}M`,
    intensity: workout.intensity,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <WorkoutDetailsRoute workout={workout} />
    </>
  );
}
