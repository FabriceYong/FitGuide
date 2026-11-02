'use client';

/** Crews: small invite-only groups with a weekly goal (the API's services/crews.js). */
import { apiRequest } from '../lib/api';

const tz = () => ({ tzOffset: new Date().getTimezoneOffset() });

export interface CrewSummary {
  id: string;
  name: string;
  weeklyGoal: number;
  memberCount: number;
  thisWeek: number;
}

export interface Crew {
  id: string;
  name: string;
  weeklyGoal: number;
  inviteCode: string;
  weekStart: string;
  thisWeek: number;
  isOwner: boolean;
  members: { id: string; name: string; role: 'owner' | 'member'; isYou: boolean; workoutsThisWeek: number }[];
  activity: { id: string; name: string; isYou: boolean; workoutTitle: string; completedAt: string; durationSec: number }[];
  messages: CrewMessage[];
}

export interface CrewMessage {
  id: string;
  name: string;
  isYou: boolean;
  text: string;
  createdAt: string;
}

export const fetchCrews = (): Promise<{ crews: CrewSummary[]; limits: { members: number; crews: number } }> => apiRequest('/crews', { auth: true, query: tz() });
export const fetchCrew = async (id: string): Promise<Crew> => (await apiRequest(`/crews/${encodeURIComponent(id)}`, { auth: true, query: tz() })).crew;
export const createCrew = async (name: string, weeklyGoal: number): Promise<Crew> =>
  (await apiRequest('/crews', { method: 'POST', auth: true, query: tz(), body: { name, weeklyGoal } })).crew;
export const joinCrew = async (code: string): Promise<Crew> => (await apiRequest('/crews/join', { method: 'POST', auth: true, query: tz(), body: { code } })).crew;
export const updateCrew = async (id: string, changes: { name?: string; weeklyGoal?: number }): Promise<Crew> =>
  (await apiRequest(`/crews/${encodeURIComponent(id)}`, { method: 'PATCH', auth: true, query: tz(), body: changes })).crew;
export const sendCrewMessage = async (id: string, text: string): Promise<CrewMessage> =>
  (await apiRequest(`/crews/${encodeURIComponent(id)}/messages`, { method: 'POST', auth: true, body: { text } })).message;
export const leaveCrew = (id: string) => apiRequest(`/crews/${encodeURIComponent(id)}/membership`, { method: 'DELETE', auth: true });
export const removeCrewMember = (id: string, userId: string) =>
  apiRequest(`/crews/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE', auth: true });
