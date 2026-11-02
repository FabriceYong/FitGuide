import { expect, test } from './fixtures';
import { API, signUpAndSignIn } from './helpers';

test('progress shows a strength level for a logged lift', async ({ page }) => {
  await signUpAndSignIn(page, 'Bench Presser');
  // 70 kg body weight (the default); bench 60 × 5 is about 70 kg, 1× body weight.
  const now = Date.now();
  expect((await page.request.post(`${API}/sessions`, {
    data: {
      workoutSlug: 'core-power-blast', startedAt: new Date(now - 40 * 60e3).toISOString(), completedAt: new Date(now - 60e3).toISOString(), durationSec: 2300,
      sets: [{ exerciseName: 'Bench Press', setNumber: 1, reps: 5, weightKg: 60 }],
    },
  })).status()).toBe(201);

  await page.goto('/progress');
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Strength levels' }) });
  const bench = panel.getByRole('listitem').filter({ hasText: 'Bench press' });
  await expect(bench).toContainText('Intermediate');
  await expect(bench).toContainText('1× body weight');
  await expect(bench).toContainText('Estimated one-rep max 70 kg');
  await expect(bench).toContainText('to Advanced');
});
