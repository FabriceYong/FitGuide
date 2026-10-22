import { expect, test, type Page } from '@playwright/test';
import { API, newAccount } from './helpers';

/** The sticky button at the bottom of the sign-up wizard (last in the page). */
const next = (page: Page, name: RegExp = /^continue$/i) => page.getByRole('button', { name }).last().click();
const recommendations = (page: Page) => page.getByRole('list', { name: 'Recommended workouts' });

test('sign-up answers tailor the home recommendations', async ({ page }) => {
  const account = newAccount('Tailor Tester');
  await page.goto('/?signup=1');
  await next(page, /get started/i);
  await next(page, /continue to personalization/i);

  // Biometrics: gender, then the goal.
  await page.getByRole('button', { name: /^Female/ }).click();
  await next(page);
  await next(page); // activity level: keep Beginner / Active
  await page.getByRole('button', { name: /Fat Loss & Conditioning/ }).click();
  await next(page);
  await next(page); // target weight
  await next(page, /choose my diet/i);

  // Focus areas arrive suggested from the goal and gender, and can be changed.
  const focus = page.getByRole('group', { name: 'Focus areas' });
  for (const area of ['Full Body', 'Core', 'Legs', 'Glutes']) {
    await expect(focus.getByRole('button', { name: new RegExp(`^${area}`) })).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(focus.getByRole('button', { name: /^Chest/ })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText(/We picked a starting point/)).toBeVisible();
  await focus.getByRole('button', { name: /^Legs/ }).click();
  await expect(page.getByText(/Pick as many as you like/)).toBeVisible();
  await next(page);

  // Setup: bodyweight only, 30 minutes, 3 a week, easy on the knees.
  await page.getByRole('button', { name: 'No equipment' }).click();
  await page.getByRole('button', { name: '30 min' }).click();
  await page.getByRole('button', { name: '3 per week' }).click();
  await page.getByRole('button', { name: 'Knees' }).click();
  await next(page);

  await expect(page.getByText('Full Body, Core, Glutes')).toBeVisible();
  await page.getByPlaceholder('Sarah Connor').fill(account.name);
  await page.getByPlaceholder('sarah@example.com').fill(account.email);
  await page.getByPlaceholder('••••••••').fill(account.password);
  await page.getByRole('button', { name: /finish & enter fitguide/i }).click();

  // The account holds the answers.
  await expect(page.getByText('Recommended for you')).toBeVisible();
  const { user } = await (await page.request.get(`${API}/auth/me`)).json();
  expect(user).toMatchObject({
    gender: 'Female', goal: 'Weight', focusAreas: ['Full Body', 'Core', 'Glutes'], equipment: ['none'], workoutMinutes: 30, daysPerWeek: 3, limitations: ['knees'],
  });

  // Home explains its picks, and every pick fits the answers.
  await expect(page.getByText('Matched to your level (Beginner), goal (Weight), focus areas, equipment, time and limitations.')).toBeVisible();
  const picks = recommendations(page);
  await expect(picks.getByRole('link')).toHaveCount(3);
  await expect(picks.getByText('No equipment needed')).toHaveCount(3);
  await expect(picks.getByText(/Works your/).first()).toBeVisible();

  const { workouts } = await (await page.request.get(`${API}/workouts`)).json();
  const byTitle = new Map(workouts.map((w: { title: string }) => [w.title, w]));
  for (const link of await picks.getByRole('link').all()) {
    const title = (await link.locator('span.line-clamp-2').textContent())?.trim() || '';
    const workout = byTitle.get(title) as { duration: number; cautions: string[] } | undefined;
    expect(workout, title).toBeTruthy();
    expect(workout!.duration).toBeLessThanOrEqual(35);
    expect(workout!.cautions.join(' ')).not.toMatch(/knee|joint/i);
  }
});

test('changing training preferences in the profile changes the picks', async ({ page }) => {
  const account = { ...newAccount('Gym Goer'), focusAreas: ['Chest', 'Back'], equipment: ['none'], fitnessLevel: 'Intermediate' };
  expect((await page.request.post(`${API}/auth/register`, { data: account })).status()).toBe(201);
  await page.context().clearCookies();
  await page.goto('/');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(recommendations(page).getByText('No equipment needed').first()).toBeVisible();

  await page.goto('/?tab=profile');
  await page.getByRole('button', { name: 'Edit profile' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'A gym' }).click();
  await expect(dialog.getByRole('button', { name: 'No equipment' })).toHaveAttribute('aria-pressed', 'false');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('A gym', { exact: true })).toBeVisible();

  await page.goto('/?tab=home');
  await expect(recommendations(page).getByText(/Uses your/).first()).toBeVisible();
  await expect(recommendations(page).getByText(/Works your (chest|back)/).first()).toBeVisible();
});
