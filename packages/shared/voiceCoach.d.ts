/** What the workout player says beyond the step itself (voiceCoach.js). */
type Units = 'metric' | 'imperial';
interface SetValues { reps?: number | null; weightKg?: number | null }
export declare function spokenWeight(kg: number, units?: Units): string;
export declare function spokenSet(set: SetValues | null | undefined, units?: Units): string | null;
export declare function stepCoaching(p: { index: number; total: number; last?: SetValues | null; suggestion?: SetValues | null; units?: Units }): string;
export declare function setPraise(p: { logged?: SetValues | null; last?: SetValues | null; units?: Units }): string | null;
