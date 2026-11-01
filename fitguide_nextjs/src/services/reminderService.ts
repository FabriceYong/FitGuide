'use client';

/**
 * Workout and streak reminders. The settings are the account's (the app
 * uses them too); this browser gets the reminders by Web Push once it's
 * turned on here.
 */
import { apiRequest } from '../lib/api';

export interface ReminderSettings {
  /** Weekdays, 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** Local "HH:MM". */
  time: string;
  streak: boolean;
  timeZone: string | null;
}

/** This browser: can't show notifications, has them blocked, or reminders off/on here. */
export type BrowserReminders = 'unsupported' | 'blocked' | 'off' | 'on';

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export async function fetchReminders(): Promise<{ settings: ReminderSettings; publicKey: string | null }> {
  const data = await apiRequest('/reminders', { auth: true, query: { tzOffset: new Date().getTimezoneOffset() } });
  return { settings: data.settings, publicKey: data.push?.publicKey ?? null };
}

export async function saveReminders(settings: Pick<ReminderSettings, 'days' | 'time' | 'streak'>): Promise<ReminderSettings> {
  const data = await apiRequest('/reminders', { method: 'PUT', auth: true, body: { ...settings, timeZone: timeZone() } });
  return data.settings;
}

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/**
 * The service worker shows the reminders. Production builds register it for
 * offline use too (OfflineSupport); development registers it for push only,
 * so its page caching doesn't get in the way.
 */
async function serviceWorker() {
  const script = process.env.NODE_ENV === 'production' ? '/sw.js' : '/sw.js?push-only=1';
  await navigator.serviceWorker.register(script);
  return navigator.serviceWorker.ready;
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function browserReminders(): Promise<BrowserReminders> {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return (await currentSubscription()) ? 'on' : 'off';
}

/** The VAPID public key (base64url) as the bytes PushManager wants. */
function keyBytes(base64url: string) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Ask to show notifications, subscribe this browser and tell the API. */
export async function turnOnBrowserReminders(publicKey: string): Promise<BrowserReminders> {
  if (await Notification.requestPermission() !== 'granted') return Notification.permission === 'denied' ? 'blocked' : 'off';
  const registration = await serviceWorker();
  // A subscription made with an older server key can't be used: start again.
  await (await registration.pushManager.getSubscription())?.unsubscribe();
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  await apiRequest('/reminders/push', { method: 'POST', auth: true, body: { ...subscription.toJSON(), timeZone: timeZone() } });
  return 'on';
}

export async function turnOffBrowserReminders(): Promise<BrowserReminders> {
  const subscription = await currentSubscription();
  if (subscription) {
    await apiRequest('/reminders/push', { method: 'DELETE', auth: true, body: { endpoint: subscription.endpoint } }).catch(() => {});
    await subscription.unsubscribe();
  }
  return 'off';
}

/**
 * On sign-out: this browser stops getting the account's reminders. The API
 * forgets the subscription the next time a push to it fails.
 */
export function forgetBrowserReminders() {
  if (!supported()) return;
  currentSubscription().then((s) => s?.unsubscribe()).catch(() => {});
}
