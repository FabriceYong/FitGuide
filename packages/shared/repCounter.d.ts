/** Counting reps from the camera's pose landmarks (repCounter.js). */
export interface PosePoint { x: number; y: number; visibility?: number }
export type RepExerciseId = 'squat' | 'pushup';
export interface RepExercise { name: string; down: number; up: number; shallowCue: string; setup: string }
export interface RepUpdate { reps: number; event: 'rep' | 'shallow' | 'form' | null; cue: string | null; angle: number | null }
export declare const POSE_LANDMARKS: Record<string, number>;
export declare const REP_EXERCISES: Record<RepExerciseId, RepExercise>;
export declare function repExerciseFor(name: string): RepExerciseId | null;
export declare function angleAt(a: PosePoint, b: PosePoint, c: PosePoint): number;
export declare function jointAngle(landmarks: PosePoint[], sides: number[][], minVisibility?: number): number | null;
export declare function createRepCounter(exercise: RepExerciseId): { update(landmarks: PosePoint[]): RepUpdate; readonly reps: number };
