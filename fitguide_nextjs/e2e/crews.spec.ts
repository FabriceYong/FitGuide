import { expect, test } from './fixtures';
import { API, newAccount, registerConfirmed, signUpAndSignIn, switchAccount } from './helpers';

test('a crew is made, joined by code, counts the week towards its goal and chats', async ({ page }) => {
  const joiner = newAccount('Jo Joiner');
  await registerConfirmed(page, joiner);
  const captain = await signUpAndSignIn(page, 'Cam Captain');

  await page.goto('/community');
  const crews = page.getByRole('region', { name: 'Crews' });
  await crews.getByRole('button', { name: 'New crew' }).click();
  await crews.getByLabel('Crew name').fill('Lunch Lifters');
  await crews.getByLabel('Workouts a week').fill('4');
  await crews.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('heading', { name: 'Lunch Lifters', level: 1 })).toBeVisible();
  const code = (await page.getByText(/^[A-Z2-9]{8}$/).textContent())!.trim();

  await switchAccount(page, joiner);
  const now = Date.now();
  expect((await page.request.post(`${API}/sessions`, {
    data: { workoutSlug: 'core-power-blast', startedAt: new Date(now - 30 * 60e3).toISOString(), completedAt: new Date(now - 60e3).toISOString(), durationSec: 1700 },
  })).status()).toBe(201);
  await page.goto('/community');
  await page.getByLabel('Crew invite code').fill(code);
  await page.getByRole('button', { name: 'Join crew' }).click();
  await expect(page.getByRole('heading', { name: 'Lunch Lifters', level: 1 })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: '1 of 4 workouts this week' })).toBeVisible();
  await page.getByLabel('Message your crew').fill('Done my first one!');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('log', { name: 'Crew chat' })).toContainText('Done my first one!');

  // The captain sees Jo's workout and message.
  await switchAccount(page, captain);
  await page.goto('/community');
  await page.getByRole('link', { name: /Lunch Lifters/ }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Jo J. · Core Strength Circuit' })).toBeVisible();
  await expect(page.getByRole('log', { name: 'Crew chat' })).toContainText('Jo J.');
});
