'use client';

/**
 * Personal plans and the AI coach. Calendar-dependent calls send the
 * browser's UTC offset so the API works in the user's local dates.
 */
import { apiRequest } from '../lib/api';
import type { FitnessLevel, Goal } from '@fitguide/shared';

const tz = () => ({ tzOffset: new Date().getTimezoneOffset() });

export type DayStatus = 'done' | 'missed' | 'today' | 'upcoming';

export interface PlanDay {
  week: number;
  day: number;
  title: string;
  workoutSlug: string;
  date: string;
  status: DayStatus;
  sessionId: string | null;
}

/** An enrollment described with its schedule (see the API's describeEnrollment). */
export interface Plan {
  id: string;
  programSlug: string;
  programTitle: string;
  level: string | null;
  weeks: number | null;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'abandoned';
  totalDays: number;
  completedCount: number;
  percentComplete: number;
  adherencePct: number | null;
  currentWeek: number;
  nextDay: PlanDay | null;
  schedule: PlanDay[];
}

export interface PlanOptions {
  goals: Goal[];
  levels: FitnessLevel[];
  equipment: string[];
  limits: { daysPerWeek: [number, number]; minutesPerSession: [number, number]; weeks: [number, number] };
}

export interface PlanRequest {
  goal: Goal;
  level: FitnessLevel;
  daysPerWeek: number;
  minutesPerSession: number;
  weeks: number;
  equipment: string[];
}

export interface AdaptResult {
  direction: 'easier' | 'harder' | 'keep';
  reason: string;
  changes: { week: number; day: number; from: string; to: string }[];
  plan: Plan;
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

export const fetchPlanOptions = (): Promise<PlanOptions> => apiRequest('/plan/options', { auth: true });

export const fetchPlan = async (): Promise<Plan | null> => (await apiRequest('/plan', { auth: true, query: tz() })).plan;

export const generatePlan = (answers: PlanRequest): Promise<{ plan: Plan; warnings: string[] }> =>
  apiRequest('/plan/generate', { method: 'POST', auth: true, query: tz(), body: answers });

export const adaptPlan = (): Promise<AdaptResult> => apiRequest('/plan/adapt', { method: 'POST', auth: true, query: tz() });

export const fetchCoach = (): Promise<{ available: boolean; maxMessages: number; messages: CoachMessage[] }> =>
  apiRequest('/coach', { auth: true });

export const sendCoachMessage = (text: string): Promise<{ reply: CoachMessage; changedPlan: boolean }> =>
  apiRequest('/coach/messages', { method: 'POST', auth: true, query: tz(), body: { text } });

export const resetCoach = () => apiRequest('/coach/messages', { method: 'DELETE', auth: true });
