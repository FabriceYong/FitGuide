'use client';

/** Daily health numbers and wearable connections. */
import { apiRequest } from '../lib/api';

const tz = () => ({ tzOffset: new Date().getTimezoneOffset() });

export interface HealthDay {
  date: string;
  steps: number | null;
  restingHr: number | null;
  sleepMinutes: number | null;
  activeCalories: number | null;
  sources: string[];
}

export type BpCategory = 'normal' | 'elevated' | 'high_1' | 'high_2' | 'crisis';

export interface BloodPressureReading {
  id: string;
  measuredAt: string;
  date: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  source: string;
  category: BpCategory;
}

export interface HealthSummary {
  days: HealthDay[];
  today: HealthDay | null;
  weekAverage: { steps: number | null; sleepMinutes: number | null; activeCalories: number | null };
  latestRestingHr: { value: number; date: string } | null;
  /** Newest first, the last 90 days. */
  bloodPressure: { latest: BloodPressureReading | null; readings: BloodPressureReading[] };
}

/** Where a number came from, as people know it. */
export const SOURCE_LABELS: Record<string, string> = {
  manual: 'entered by you',
  apple_health: 'Apple Health',
  health_connect: 'Health Connect',
  fitbit: 'Fitbit',
  csv: 'CSV import',
  strava: 'Strava',
};

/** The American Heart Association's names for each category (adults). */
export const BP_CATEGORIES: Record<BpCategory, { label: string; className: string }> = {
  normal: { label: 'Normal', className: 'text-lime-light' },
  elevated: { label: 'Elevated', className: 'text-amber-300' },
  high_1: { label: 'High, stage 1', className: 'text-orange-300' },
  high_2: { label: 'High, stage 2', className: 'text-red-300' },
  crisis: { label: 'Very high: get medical help if it stays this high', className: 'text-red-400' },
};

export interface Integration {
  id: string;
  name: string;
  description: string;
  available: boolean;
  connected: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
}

export type DayValues = Partial<Pick<HealthDay, 'steps' | 'restingHr' | 'sleepMinutes' | 'activeCalories'>>;

export const fetchHealth = (days = 30): Promise<HealthSummary> => apiRequest('/health-data', { auth: true, query: { days, ...tz() } });

export const saveHealthDay = (date: string, values: DayValues) =>
  apiRequest(`/health-data/${date}`, { method: 'PUT', auth: true, query: tz(), body: values });

export const importHealthCsv = (csv: string): Promise<{ imported: number; skipped: number; errors: string[] }> =>
  apiRequest('/health-data/import', { method: 'POST', auth: true, query: tz(), body: { csv } });

export const addBloodPressure = async (reading: { systolic: number; diastolic: number; pulse?: number }): Promise<BloodPressureReading> =>
  (await apiRequest('/health-data/blood-pressure', { method: 'POST', auth: true, query: tz(), body: reading })).reading;

export const deleteBloodPressure = (id: string) => apiRequest(`/health-data/blood-pressure/${id}`, { method: 'DELETE', auth: true });

export const fetchIntegrations = async (): Promise<Integration[]> => (await apiRequest('/integrations', { auth: true })).integrations;

export const connectIntegration = async (id: string): Promise<string> =>
  (await apiRequest(`/integrations/${id}/connect`, { method: 'POST', auth: true })).url;

export const syncIntegration = (id: string) => apiRequest(`/integrations/${id}/sync`, { method: 'POST', auth: true });

export const disconnectIntegration = (id: string) => apiRequest(`/integrations/${id}`, { method: 'DELETE', auth: true });
