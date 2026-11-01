'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '../../../../lib/analytics';
import { EnhancedWorkoutExecution } from '../../../../features/workout/EnhancedWorkoutExecution';
import { categoryColor } from '../../../../features/workout/categoryColor';
import { PlusGate } from '../../../../components/PlusGate';
import { scheduleHref } from '../../../../features/progress/format';

/** `returnTo` overrides where Back goes (your own workouts go back to them). */
export function PlayWorkout({ workout, program, returnTo: back }) {
  const router = useRouter();
  useEffect(() => {
    track('workout_started', { program: Boolean(program) });
  }, [program]);
  // Back to the schedule (program page, or /plan for a personal plan) when
  // this was a program day, else to the workout.
  const returnTo = back || (program?.programSlug ? scheduleHref(program) : `/workouts/${workout.slug}`);

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
