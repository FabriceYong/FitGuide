'use client';

/** Admin CMS, coach studio and coach application API calls. */
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
  pendingWorkouts: number;
  pendingCoaches: number;
  coaches: number;
  pendingArticles: number;
  publishedArticles: number;
}

export type ReviewStatus = 'draft' | 'pending' | 'published' | 'rejected';

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
  inPerson?: boolean;
  days: ProgramDayInput[];
}

export interface CatalogProgram extends ProgramInput {
  slug: string;
  status: ReviewStatus;
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
  steps: WorkoutStep[];
  isPublished: boolean;
  isPremium: boolean;
  status?: ReviewStatus;
  reviewNote?: string | null;
  creator?: { id: string; name: string } | null;
}

export interface WorkoutStep {
  instruction: string;
  duration?: number;
  exerciseName?: string;
  gifUrl?: string;
  imageUrl?: string;
}

/** A step's demonstration: the matched movement and its picture frames. */
export interface StepDemo {
  name: string | null;
  media: { frames: string[]; source?: string; title?: string; license?: string } | null;
}

export interface CoachWorkoutInput {
  title: string;
  description: string;
  shortDescription?: string | null;
  category: string;
  difficulty: string;
  duration: number;
  calories?: number | null;
  intensity: string;
  equipment: string[];
  targetMuscles: string[];
  steps: WorkoutStep[];
}

export interface CoachWorkout extends CoachWorkoutInput {
  slug: string;
  status: ReviewStatus;
  reviewNote: string | null;
  isPublished: boolean;
  demos: (StepDemo | null)[];
  updatedAt: string;
}

export interface CoachProfileInput {
  bio: string;
  specialties: string[];
  contactEmail: string | null;
  phone: string | null;
  location: string | null;
}

export interface CoachApplication extends CoachProfileInput {
  status: 'pending' | 'approved' | 'declined';
  reviewNote: string | null;
}

export interface AdminCoach extends CoachApplication {
  userId: string;
  name: string;
  email: string;
  role: AdminUser['role'];
  updatedAt: string;
}

export interface DashboardProgram {
  slug: string;
  title: string;
  status: ReviewStatus;
  level: string;
  weeks: number;
  inPerson: boolean;
  totalDays: number;
  enrolled: { total: number; active: number; completed: number; left: number };
  /** Fitness level of the people following it now. */
  levels: Record<string, number>;
  /** How many of them are in each program week. */
  weekCounts: { week: number; people: number }[];
  averageProgressPct: number | null;
}

export interface CoachDashboard {
  totals: { programs: number; published: number; enrolled: number; active: number; completed: number; levels: Record<string, number> };
  programs: DashboardProgram[];
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
export const fetchAdminWorkouts = async (search = '', status?: string): Promise<AdminWorkout[]> =>
  (await apiRequest('/admin/workouts', { auth: true, query: { search, status } })).workouts;
export const saveWorkout = (workout: AdminWorkout, isNew: boolean) => (isNew
  ? apiRequest('/admin/workouts', { method: 'POST', auth: true, body: workout })
  : apiRequest(`/admin/workouts/${workout.slug}`, { method: 'PUT', auth: true, body: workout }));
export const setWorkoutFlags = (slug: string, flags: { isPublished?: boolean; isPremium?: boolean; status?: string; reviewNote?: string | null }) =>
  apiRequest(`/admin/workouts/${slug}`, { method: 'PATCH', auth: true, body: flags });
export const fetchUsers = async (search = ''): Promise<{ total: number; users: AdminUser[] }> => apiRequest('/admin/users', { auth: true, query: { search } });
export const setUserRole = (id: string, role: AdminUser['role']) => apiRequest(`/admin/users/${id}`, { method: 'PATCH', auth: true, body: { role } });
export const createOfficialChallenge = (input: { title: string; description?: string; metric: string; startDate: string; endDate: string; target?: number | null }) =>
  apiRequest('/admin/challenges', { method: 'POST', auth: true, body: input });
export const fetchAdminCoaches = async (status?: string): Promise<AdminCoach[]> => (await apiRequest('/admin/coaches', { auth: true, query: { status } })).coaches;
export const reviewCoach = (userId: string, change: { status: 'approved' | 'declined'; reviewNote?: string | null }) =>
  apiRequest(`/admin/coaches/${userId}`, { method: 'PATCH', auth: true, body: change });
export const fetchAdminReviews = async (): Promise<AdminReview[]> => (await apiRequest('/admin/reviews', { auth: true })).reviews;
export const deleteReview = (id: string) => apiRequest(`/admin/reviews/${id}`, { method: 'DELETE', auth: true });

export interface Analytics {
  days: { date: string; pageViews: number; visitors: number }[];
  visitors: number;
  topPages: { path: string; count: number }[];
  devices: { device: string; count: number }[];
  events: { name: string; count: number }[];
}
export const fetchAnalytics = (days = 30): Promise<Analytics> => apiRequest('/admin/analytics', { auth: true, query: { days } });

// Coach studio
export const fetchMyPrograms = async (): Promise<CatalogProgram[]> => (await apiRequest('/creator/programs', { auth: true })).programs;
export const createProgram = async (input: ProgramInput): Promise<CatalogProgram> =>
  (await apiRequest('/creator/programs', { method: 'POST', auth: true, body: input })).program;
export const updateProgram = async (slug: string, input: ProgramInput): Promise<CatalogProgram> =>
  (await apiRequest(`/creator/programs/${slug}`, { method: 'PUT', auth: true, body: input })).program;
export const submitProgram = (slug: string) => apiRequest(`/creator/programs/${slug}/submit`, { method: 'POST', auth: true });
export const deleteProgram = (slug: string) => apiRequest(`/creator/programs/${slug}`, { method: 'DELETE', auth: true });

export const fetchCoachDashboard = async (): Promise<CoachDashboard> => {
  const data = await apiRequest('/creator/dashboard', { auth: true, query: { tzOffset: new Date().getTimezoneOffset() } });
  return { totals: data.totals, programs: data.programs.map(({ weeks, ...p }: { weeks: { week: number; people: number }[] }) => ({ ...p, weeks: weeks.length, weekCounts: weeks })) };
};
/** A member following one of the coach's programs who shares their progress with them. */
export interface CoachClient {
  enrollmentId: string;
  name: string;
  programSlug: string;
  programTitle: string;
  currentWeek: number;
  weeks: number | null;
  completedCount: number;
  totalDays: number;
  adherencePct: number | null;
  missedInARow: number;
  lastWorkoutDate: string | null;
  daysSinceWorkout: number | null;
  slipping: boolean;
  reasons: string[];
  lastNoteAt: string | null;
}
export const fetchClients = async (): Promise<CoachClient[]> =>
  (await apiRequest('/creator/clients', { auth: true, query: { tzOffset: new Date().getTimezoneOffset() } })).clients;
/** A short note to a client, at most one a day; they see it on their home page. */
export const sendClientNote = (enrollmentId: string, text: string) =>
  apiRequest(`/creator/clients/${encodeURIComponent(enrollmentId)}/notes`, { method: 'POST', auth: true, body: { text } });
export const fetchCoachProfile = async (): Promise<CoachApplication | null> => (await apiRequest('/creator/profile', { auth: true })).profile;
export const saveCoachProfile = async (input: CoachProfileInput): Promise<CoachApplication> =>
  (await apiRequest('/creator/profile', { method: 'PUT', auth: true, body: input })).profile;
export const fetchMyWorkouts = async (): Promise<CoachWorkout[]> => (await apiRequest('/creator/workouts', { auth: true })).workouts;
export const saveMyWorkout = async (input: CoachWorkoutInput, slug: string | null): Promise<CoachWorkout> => (await (slug
  ? apiRequest(`/creator/workouts/${slug}`, { method: 'PUT', auth: true, body: input })
  : apiRequest('/creator/workouts', { method: 'POST', auth: true, body: input }))).workout;
export const submitMyWorkout = (slug: string) => apiRequest(`/creator/workouts/${slug}/submit`, { method: 'POST', auth: true });
export const deleteMyWorkout = (slug: string) => apiRequest(`/creator/workouts/${slug}`, { method: 'DELETE', auth: true });

/** Published workouts for the schedule builder. */
export const fetchWorkoutOptions = async (): Promise<{ slug: string; title: string; category: string; duration: number }[]> =>
  (await apiRequest('/workouts')).workouts;
