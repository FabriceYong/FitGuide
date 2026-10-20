'use client';

/**
 * First-party, cookie-free analytics sent to the FitGuide API. Nothing is
 * sent when the browser asks not to be tracked (Do Not Track or Global
 * Privacy Control). The visitor id is random and stays in this browser.
 */
import { API_BASE } from './api';

export type AnalyticsEvent =
  | 'page_view'
  | 'signup'
  | 'workout_started'
  | 'workout_completed'
  | 'plan_created'
  | 'coach_message'
  | 'food_logged'
  | 'challenge_joined'
  | 'checkout_started';

const VISITOR_KEY = 'fitguide_visitor';

function optedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === '1' || nav.globalPrivacyControl === true;
}

function visitorId(): string | null {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function track(name: AnalyticsEvent, props?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined' || optedOut()) return;
  const body = JSON.stringify({
    name,
    path: window.location.pathname,
    visitorId: visitorId(),
    device: window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop',
    ...(props && { props }),
  });
  // keepalive lets the request finish when the page is being left.
  fetch(`${API_BASE}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}
