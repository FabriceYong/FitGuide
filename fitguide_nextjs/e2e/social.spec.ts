import { expect, test } from './fixtures';
import { API, newAccount, registerConfirmed, signUpAndSignIn, switchAccount } from './helpers';

test("a friend's workout shows in the feed with its record, and can be cheered", async ({ page }) => {
  // Ana works out; Ben, her friend, sees it and cheers.
  const ben = newAccount('Ben Cheers');
  await registerConfirmed(page, ben);
  const ana = await signUpAndSignIn(page, 'Ana Lifts');
  const { friendCode } = await (await page.request.get(`${API}/social/friends`)).json();
  const now = Date.now();
  expect((await page.request.post(`${API}/sessions`, {
    data: {
      workoutSlug: 'core-power-blast',
      startedAt: new Date(now - 40 * 60e3).toISOString(),
      completedAt: new Date(now - 5 * 60e3).toISOString(),
      durationSec: 35 * 60,
      sets: [{ exerciseName: 'Goblet Squat', setNumber: 1, reps: 8, weightKg: 24 }],
    },
  })).status()).toBe(201);

  await switchAccount(page, ben);
  expect((await page.request.post(`${API}/social/friends`, { data: { code: friendCode } })).status()).toBe(201);
  await switchAccount(page, ana);
  const { incoming } = await (await page.request.get(`${API}/social/friends`)).json();
  expect((await page.request.post(`${API}/social/friends/${incoming[0].friendshipId}/accept`)).status()).toBe(200);

  await switchAccount(page, ben);
  await page.goto('/community');
  const workout = page.getByRole('listitem', { name: /^Ana L\.: / });
  await expect(workout).toBeVisible();
  await expect(workout.getByRole('list', { name: 'New personal records' })).toContainText('Goblet Squat');
  await workout.getByRole('button', { name: 'Cheer Ana L.' }).click();
  await expect(workout.getByRole('button', { name: 'Take back your cheer for Ana L.' })).toHaveAttribute('aria-pressed', 'true');
  await expect(workout.getByText('You cheered')).toBeVisible();

  await switchAccount(page, ana);
  await page.goto('/community');
  await expect(page.getByRole('listitem', { name: /^You: / }).getByText('Ben C. cheered')).toBeVisible();
});
