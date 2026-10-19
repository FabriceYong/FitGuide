'use client';

/** Admin CMS and creator studio API calls. */
import { apiRequest } from '../lib/api';

export interface Stats {
  users: number;
  newUsers: number;
  sessionsWeek: number;
  activeUsers: number;
  reviews: number;
  pendingPrograms: number;
  workouts: number;
  plusMembers: number;
}

export interface ProgramDayInput {
  week: number;
  day: number;
  title: string;
  workoutSlug: string;
  notes?: string | null;
}

export interface ProgramInput {
  title: string;
  description: string;
  level: string;
  goal: string;
  weeks: number;
  daysPerWeek: number;
  days: ProgramDayInput[];
}

export interface CatalogProgram extends ProgramInput {
  slug: string;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  reviewNote: string | null;
  isPremium: boolean;
  isPublished: boolean;
  creator: { id: string; name: string } | null;
  updatedAt: string;
}

export interface AdminWorkout {
  slug: string;
  title: string;
  description: string;
  shortDescription: string | null;
  category: string;
  difficulty: string;
  duration: number;
  calories: number | null;
  intensity: string;
  equipment: string[];
  targetMuscles: string[];
  benefits: string[];
  tags: string[];
  steps: { instruction: string; duration?: number }[];
  isPublished: boolean;
  isPremium: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'creator' | 'admin';
  createdAt: string;
  sessions: number;
}

export interface AdminReview {
  id: string;
  name: string;
  rating: number;
  comment: string;
  workoutSlug: string | null;
  createdAt: string;
}

// Admin
export const fetchStats = async (): Promise<Stats> => (await apiRequest('/admin/stats', { auth: true })).stats;
export const fetchActivity = async (): Promise<{ date: string; signups: number; sessions: number }[]> => (await apiRequest('/admin/activity', { auth: true })).days;
export const fetchAdminPrograms = async (status?: string): Promise<CatalogProgram[]> => (await apiRequest('/admin/programs', { auth: true, query: { status } })).programs;
export const reviewProgram = (slug: string, change: { status?: string; reviewNote?: string | null; isPremium?: boolean }) =>
  apiRequest(`/admin/programs/${slug}`, { method: 'PATCH', auth: true, body: change });
export const fetchAdminWorkouts = async (search = ''): Promise<AdminWorkout[]> => (await apiRequest('/admin/workouts', { auth: true, query: { search } })).workouts;
export const saveWorkout = (workout: AdminWorkout, isNew: boolean) => (isNew
  ? apiRequest('/admin/workouts', { method: 'POST', auth: true, body: workout })
  : apiRequest(`/admin/workouts/${workout.slug}`, { method: 'PUT', auth: true, body: workout }));
export const setWorkoutFlags = (slug: string, flags: { isPublished?: boolean; isPremium?: boolean }) =>
  apiRequest(`/admin/workouts/${slug}`, { method: 'PATCH', auth: true, body: flags });
export const fetchUsers = async (search = ''): Promise<{ total: number; users: AdminUser[] }> => apiRequest('/admin/users', { auth: true, query: { search } });
export const setUserRole = (id: string, role: AdminUser['role']) => apiRequest(`/admin/users/${id}`, { method: 'PATCH', auth: true, body: { role } });
export const createOfficialChallenge = (input: { title: string; description?: string; metric: string; startDate: string; endDate: string; target?: number | null }) =>
  apiRequest('/admin/challenges', { method: 'POST', auth: true, body: input });
export const fetchAdminReviews = async (): Promise<AdminReview[]> => (await apiRequest('/admin/reviews', { auth: true })).reviews;
export const deleteReview = (id: string) => apiRequest(`/admin/reviews/${id}`, { method: 'DELETE', auth: true });

// Creator studio
export const fetchMyPrograms = async (): Promise<CatalogProgram[]> => (await apiRequest('/creator/programs', { auth: true })).programs;
export const createProgram = async (input: ProgramInput): Promise<CatalogProgram> =>
  (await apiRequest('/creator/programs', { method: 'POST', auth: true, body: input })).program;
export const updateProgram = async (slug: string, input: ProgramInput): Promise<CatalogProgram> =>
  (await apiRequest(`/creator/programs/${slug}`, { method: 'PUT', auth: true, body: input })).program;
export const submitProgram = (slug: string) => apiRequest(`/creator/programs/${slug}/submit`, { method: 'POST', auth: true });
export const deleteProgram = (slug: string) => apiRequest(`/creator/programs/${slug}`, { method: 'DELETE', auth: true });

/** Published workouts for the schedule builder. */
export const fetchWorkoutOptions = async (): Promise<{ slug: string; title: string; category: string; duration: number }[]> =>
  (await apiRequest('/workouts')).workouts;
