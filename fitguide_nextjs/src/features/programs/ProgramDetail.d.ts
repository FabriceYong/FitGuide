// Types for the helpers ProgramDetail.js shares with TypeScript components.
import type { ReactElement } from 'react';
import type { DayStatus } from '../../services/planService';

export declare const STATUS_STYLES: Record<DayStatus, { label: string; className: string }>;
export declare function formatDate(ymd: string): string;
export declare function playHref(enrollment: { id: string; programSlug: string }, day: { workoutSlug: string; week: number; day: number }): string;
export declare function ProgramDetail(props: { program: unknown; workouts: Record<string, unknown> }): ReactElement;
