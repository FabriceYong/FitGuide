'use client';

import { useRouter } from 'next/navigation';
import { WorkoutDetails } from '../../../features/workout/WorkoutDetails';
import { categoryColor } from '../../../features/workout/categoryColor';

/** WorkoutDetails wired to routes: back goes to the previous page, Begin opens the player. */
export function WorkoutDetailsRoute({ workout }) {
  const router = useRouter();
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/workouts');
  };
  return (
    <WorkoutDetails
      initialWorkout={workout}
      workoutSlug={workout.slug}
      tintColor={categoryColor(workout.category)}
      onBack={goBack}
      onBegin={() => router.push(`/workouts/${workout.slug}/play`)}
    />
  );
}
