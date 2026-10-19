'use client';

import { useRouter } from 'next/navigation';
import { EnhancedWorkoutExecution } from '../../../../features/workout/EnhancedWorkoutExecution';
import { categoryColor } from '../../../../features/workout/categoryColor';

export function PlayWorkout({ workout, program }) {
  const router = useRouter();
  // Back to the program page when this was a program day, else to the workout.
  const returnTo = program?.programSlug ? `/programs/${program.programSlug}` : `/workouts/${workout.slug}`;

  return (
    <EnhancedWorkoutExecution
      workout={workout}
      tintColor={categoryColor(workout.category)}
      program={program}
      onExit={() => router.push(returnTo)}
      onComplete={(result) => router.push(result && !program ? '/progress' : returnTo)}
    />
  );
}
