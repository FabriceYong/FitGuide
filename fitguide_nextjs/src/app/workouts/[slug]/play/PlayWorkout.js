'use client';

import { useRouter } from 'next/navigation';
import { EnhancedWorkoutExecution } from '../../../../features/workout/EnhancedWorkoutExecution';
import { categoryColor } from '../../../../features/workout/categoryColor';
import { PlusGate } from '../../../../components/PlusGate';

export function PlayWorkout({ workout, program }) {
  const router = useRouter();
  // Back to the program page when this was a program day, else to the workout.
  const returnTo = program?.programSlug ? `/programs/${program.programSlug}` : `/workouts/${workout.slug}`;

  return (
    <PlusGate workout={workout}>
      {(available) => (
        <EnhancedWorkoutExecution
          workout={available}
          tintColor={categoryColor(available.category)}
          program={program}
          onExit={() => router.push(returnTo)}
          onComplete={(result) => router.push(result && !program ? '/progress' : returnTo)}
        />
      )}
    </PlusGate>
  );
}
