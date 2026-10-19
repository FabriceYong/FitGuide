'use client';

import { useRouter } from 'next/navigation';
import { WorkoutDetails } from '../../../features/workout/WorkoutDetails';
import { categoryColor } from '../../../features/workout/categoryColor';
import { PlusGate } from '../../../components/PlusGate';

/** WorkoutDetails wired to routes: back goes to the previous page, Begin opens the player. */
export function WorkoutDetailsRoute({ workout }) {
  const router = useRouter();
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/workouts');
  };
  return (
    <PlusGate workout={workout}>
      {(available) => (
        <WorkoutDetails
          initialWorkout={available}
          workoutSlug={available.slug}
          tintColor={categoryColor(available.category)}
          onBack={goBack}
          onBegin={() => router.push(`/workouts/${available.slug}/play`)}
        />
      )}
    </PlusGate>
  );
}
