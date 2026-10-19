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

export interface HealthSummary {
  days: HealthDay[];
  today: HealthDay | null;
  weekAverage: { steps: number | null; sleepMinutes: number | null; activeCalories: number | null };
  latestRestingHr: { value: number; date: string } | null;
}

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

export const fetchIntegrations = async (): Promise<Integration[]> => (await apiRequest('/integrations', { auth: true })).integrations;

export const connectIntegration = async (id: string): Promise<string> =>
  (await apiRequest(`/integrations/${id}/connect`, { method: 'POST', auth: true })).url;

export const syncIntegration = (id: string) => apiRequest(`/integrations/${id}/sync`, { method: 'POST', auth: true });

export const disconnectIntegration = (id: string) => apiRequest(`/integrations/${id}`, { method: 'DELETE', auth: true });
