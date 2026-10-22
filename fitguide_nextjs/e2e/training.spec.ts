import { expect, test, type Page } from '@playwright/test';
import { API, signUpAndSignIn } from './helpers';

// Where finished-offline sessions wait (see src/services/trainingService.ts).
const QUEUE_KEY = 'fitguide_pending_sessions_v2';

const readQueue = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), QUEUE_KEY);
const sessionCount = async (page: Page) => (await (await page.request.get(`${API}/sessions`)).json()).count as number;

async function signOut(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByLabel('Email')).toBeVisible();
}

async function signIn(page: Page, account: { email: string; password: string }) {
  await page.goto('/');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByLabel('Email')).toHaveCount(0);
}

test('leaving a personal-plan workout goes back to the plan', async ({ page }) => {
  await signUpAndSignIn(page, 'Plan Player');
  const res = await page.request.post(`${API}/plan/generate`, {
    data: { goal: 'Vitality', level: 'Beginner', daysPerWeek: 2, minutesPerSession: 30, equipment: [], weeks: 1 },
  });
  expect(res.status()).toBe(201);
  const { plan } = await res.json();
  const playUrl = (day: { workoutSlug: string; week: number; day: number }) => `/workouts/${day.workoutSlug}/play?${new URLSearchParams({
    enrollment: plan.id, week: String(day.week), day: String(day.day), program: plan.programSlug,
  })}`;

  // Finish and save a day: Done returns to /plan, which shows the day as done.
  await page.goto(playUrl(plan.schedule[0]));
  await page.getByRole('button', { name: 'Mark Complete' }).click();
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(page.getByText('Saved to your progress')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole('heading', { name: /plan/i }).first()).toBeVisible();

  // Exiting without doing anything also returns to /plan.
  await page.goto(playUrl(plan.schedule[1]));
  await page.getByRole('button', { name: 'Exit workout' }).click();
  await expect(page).toHaveURL(/\/plan$/);
});

test('a workout finished offline syncs only to the account that finished it', async ({ page }) => {
  const owner = await signUpAndSignIn(page, 'Offline Owner');
  await page.goto('/workouts/morning-yoga-flow/play');
  // The save can't reach the API, as if the connection dropped.
  await page.route(`${API}/sessions`, (route) => route.abort('internetdisconnected'));
  await page.getByRole('button', { name: 'Mark Complete' }).click();
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(page.getByText(/saved on this device/)).toBeVisible();
  expect(await readQueue(page)).toHaveLength(1);

  // The owner signs out before the connection is back; then someone else
  // signs in on this device, online: the workout isn't sent for them.
  await signOut(page);
  expect(await readQueue(page)).toHaveLength(1);
  await page.unroute(`${API}/sessions`);
  await signUpAndSignIn(page, 'Offline Other');
  await page.waitForLoadState('networkidle');
  expect(await sessionCount(page)).toBe(0);
  expect(await readQueue(page)).toHaveLength(1);

  // Its owner signs in again: it's sent, once.
  await signOut(page);
  await signIn(page, owner);
  await expect(page.getByText('1 offline workout synced.')).toBeVisible();
  expect(await readQueue(page)).toHaveLength(0);
  expect(await sessionCount(page)).toBe(1);
});

test('syncing keeps what it can and reports what the API refused', async ({ page }) => {
  await signUpAndSignIn(page, 'Queue Tester');
  const userId = await page.evaluate(() => JSON.parse(localStorage.getItem('fitguide_user') || '{}').id);
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60e3).toISOString();
  const base = { startedAt: minutesAgo(30), completedAt: minutesAgo(5), durationSec: 1200, stepsCompleted: 3, totalSteps: 3, sets: [] };

  // Already saved before the response was lost: sending it again must not duplicate it.
  const saved = { ...base, workoutSlug: 'morning-yoga-flow', clientId: 'already-saved-1' };
  expect((await page.request.post(`${API}/sessions`, { data: saved })).status()).toBe(201);

  const queue = [
    { userId, session: saved },
    // The program ended while offline: saved without the program link.
    { userId, session: { ...base, workoutSlug: 'core-power-blast', clientId: 'old-program-1', enrollmentId: 'ended-enrollment', programWeek: 1, programDay: 1 } },
    // The workout no longer exists: dropped and reported.
    { userId, session: { ...base, workoutSlug: 'retired-workout', clientId: 'gone-1' } },
    // Another account's session stays queued for them.
    { userId: 'someone-else', session: { ...base, workoutSlug: 'morning-yoga-flow', clientId: 'not-mine-1' } },
  ];
  await page.evaluate(([key, items]) => localStorage.setItem(key as string, JSON.stringify(items)), [QUEUE_KEY, queue] as const);
  // Sessions from older builds (no owner) are discarded, never sent.
  await page.evaluate(() => localStorage.setItem('fitguide_pending_sessions', JSON.stringify([{ workoutSlug: 'morning-yoga-flow' }])));

  await page.reload();
  await expect(page.getByText(/2 offline workouts synced\. 1 offline workout couldn.t be saved/)).toBeVisible();
  expect(await sessionCount(page)).toBe(2);
  const left = await readQueue(page);
  expect(left.map((q: { userId: string }) => q.userId)).toEqual(['someone-else']);
  expect(await page.evaluate(() => localStorage.getItem('fitguide_pending_sessions'))).toBeNull();
});
