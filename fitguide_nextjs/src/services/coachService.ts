'use client';

/** Coach profiles and applications to coach. */
import { apiRequest } from '../lib/api';
import type { CoachApplication, CoachProfileInput } from './adminService';

export interface CoachContact {
  email: string | null;
  phone: string | null;
  location: string | null;
}

export interface PublicCoach {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string;
  specialties: string[];
  /** null when not signed in: contact details are for members. */
  contact: CoachContact | null;
}

export interface CoachProgram {
  slug: string;
  title: string;
  description: string;
  level: string;
  goal: string;
  weeks: number;
  daysPerWeek: number;
  inPerson: boolean;
  totalDays: number;
}

export const fetchCoach = async (id: string): Promise<{ coach: PublicCoach; programs: CoachProgram[] }> =>
  // Works signed out too; the cookie, when there is one, unlocks the contact details.
  apiRequest(`/coaches/${encodeURIComponent(id)}`);

export const fetchMyApplication = async (): Promise<CoachApplication | null> => (await apiRequest('/coaches/application', { auth: true })).application;
export const applyToCoach = async (input: CoachProfileInput): Promise<CoachApplication> =>
  (await apiRequest('/coaches/application', { method: 'POST', auth: true, body: input })).application;

/** Links that open the member's mail, phone or WhatsApp app with a spot request. */
export function contactLinks(contact: CoachContact, programTitle?: string) {
  const subject = programTitle ? `Spot in ${programTitle}` : 'Training with you';
  const message = programTitle
    ? `Hi! I found your program "${programTitle}" on FitGuide and would like to request a spot.`
    : 'Hi! I found you on FitGuide and would like to train with you.';
  const digits = contact.phone?.replace(/[^0-9]/g, '') || '';
  return {
    email: contact.email ? `mailto:${contact.email}?${new URLSearchParams({ subject, body: message }).toString().replace(/\+/g, '%20')}` : null,
    call: contact.phone ? `tel:${contact.phone.replace(/[^0-9+]/g, '')}` : null,
    // WhatsApp needs the number with its country code.
    whatsapp: contact.phone?.trim().startsWith('+') && digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null,
  };
}
