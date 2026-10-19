'use client';

/** Friends, challenges and leaderboards. */
import { apiRequest } from '../lib/api';

const tz = () => ({ tzOffset: new Date().getTimezoneOffset() });

export type Metric = 'sessions' | 'minutes' | 'activeDays' | 'steps';

export interface Person {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface FriendEntry extends Person {
  friendshipId: string;
}

export interface Friends {
  friendCode: string;
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
}

export interface LeaderboardRow extends Person {
  score: number;
  rank: number;
  isYou: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  metric: Metric;
  metricLabel: string;
  unit: string;
  target: number | null;
  startDate: string;
  endDate: string;
  visibility: 'public' | 'friends' | 'private';
  status: 'upcoming' | 'active' | 'finished';
  memberCount: number;
  joined: boolean;
  isCreator: boolean;
  joinCode?: string;
  leaderboard?: LeaderboardRow[];
}

export interface NewChallenge {
  title: string;
  description?: string;
  metric: Metric;
  target?: number | null;
  startDate: string;
  endDate: string;
  visibility: 'friends' | 'private';
}

export const fetchFriends = (): Promise<Friends> => apiRequest('/social/friends', { auth: true });
export const addFriend = (code: string): Promise<{ result: 'requested' | 'accepted' }> =>
  apiRequest('/social/friends', { method: 'POST', auth: true, body: { code } });
export const acceptFriend = (friendshipId: string) => apiRequest(`/social/friends/${friendshipId}/accept`, { method: 'POST', auth: true });
export const removeFriend = (friendshipId: string) => apiRequest(`/social/friends/${friendshipId}`, { method: 'DELETE', auth: true });

export const fetchLeaderboard = (metric: Metric = 'minutes'): Promise<{ metric: Metric; startDate: string; endDate: string; rows: LeaderboardRow[] }> =>
  apiRequest('/social/leaderboard', { auth: true, query: { metric, ...tz() } });

export const fetchChallenges = async (): Promise<Challenge[]> => (await apiRequest('/social/challenges', { auth: true, query: tz() })).challenges;
export const fetchChallenge = async (id: string): Promise<Challenge> => (await apiRequest(`/social/challenges/${id}`, { auth: true, query: tz() })).challenge;
export const createChallenge = async (input: NewChallenge): Promise<Challenge> =>
  (await apiRequest('/social/challenges', { method: 'POST', auth: true, query: tz(), body: input })).challenge;
export const joinChallenge = async (id: string): Promise<Challenge> =>
  (await apiRequest(`/social/challenges/${id}/join`, { method: 'POST', auth: true, query: tz() })).challenge;
export const joinChallengeByCode = async (code: string): Promise<Challenge> =>
  (await apiRequest('/social/challenges/join', { method: 'POST', auth: true, query: tz(), body: { code } })).challenge;
export const leaveChallenge = (id: string) => apiRequest(`/social/challenges/${id}/membership`, { method: 'DELETE', auth: true });
export const deleteChallenge = (id: string) => apiRequest(`/social/challenges/${id}`, { method: 'DELETE', auth: true });
