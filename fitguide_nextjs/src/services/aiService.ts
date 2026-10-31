'use client';

/** FitGuide's small AI helpers (routes/ai.js): exercise swap, workout feedback, weekly check-in, writing help. */
import { apiRequest } from '../lib/api';
import type { ArticleSection } from './articleService';

export interface Allowance { used: number; max: number; left: number }
export type AiKind = 'meal_photo' | 'meal_text' | 'swap' | 'feedback' | 'checkin' | 'writing';
export interface AiStatus { available: boolean; allowance: Record<AiKind, Allowance> }

const tz = () => ({ tzOffset: new Date().getTimezoneOffset() });

export const fetchAiStatus = (): Promise<AiStatus> => apiRequest('/ai', { auth: true });

export type SwapReason = 'pain' | 'space' | 'equipment' | 'harder' | 'easier' | 'other';
export interface Swap { name: string; instruction: string; why: string; formCues: string[]; safetyNote: string | null }

export const suggestSwap = (input: {
  step: { instruction: string; exerciseName?: string };
  reason: SwapReason;
  details?: string;
  workout: { title: string; category: string; difficulty: string; equipment: string[] };
}): Promise<{ swap: Swap; allowance: Allowance }> => apiRequest('/ai/swap', { method: 'POST', auth: true, body: input });

export interface Feedback { headline: string; notes: string[]; nextTime: string }
export const fetchWorkoutFeedback = (sessionId: string): Promise<{ feedback: Feedback; allowance: Allowance }> =>
  apiRequest('/ai/feedback', { method: 'POST', auth: true, query: tz(), body: { sessionId } });

export interface Checkin {
  summary: string;
  wins: string[];
  focus: string;
  planChange: 'easier' | 'harder' | 'keep' | null;
  week: { workouts: number; minutes: number; averageSteps: number | null; daysFoodLogged: number };
}
export const fetchCheckin = (): Promise<{ checkin: Checkin; allowance: Allowance }> => apiRequest('/ai/checkin', { method: 'POST', auth: true, query: tz() });

export interface ArticleDraft { description: string; takeaways: string[]; sections: ArticleSection[] }
export const draftArticle = (input: { title: string; notes?: string; category: string }): Promise<{ draft: ArticleDraft; allowance: Allowance }> =>
  apiRequest('/ai/writing', { method: 'POST', auth: true, body: { mode: 'outline', ...input } });
export const polishText = (input: { heading: string; text: string }): Promise<{ text: string; allowance: Allowance }> =>
  apiRequest('/ai/writing', { method: 'POST', auth: true, body: { mode: 'polish', ...input } });
