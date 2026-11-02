import { expect, test } from './fixtures';
import { API, signUpAndSignIn } from './helpers';

declare global {
  interface Window { said: string[] }
}

test("the player says last time's numbers and praises a set that beats them", async ({ page }) => {
  // Keep what the player says instead of speaking it.
  await page.addInitScript(() => {
    window.said = [];
    (window as any).SpeechSynthesisUtterance = class { text: string; rate = 1; constructor(text: string) { this.text = text; } };
    Object.defineProperty(window, 'speechSynthesis', { value: { speak: (u: { text: string }) => window.said.push(u.text), cancel: () => {} } });
  });
  await signUpAndSignIn(page, 'Voice Coached');
  const made = await page.request.post(`${API}/my-workouts`, { data: { title: 'Squat day', exercises: [{ name: 'Goblet Squat', sets: 1, reps: '8' }, { name: 'Plank', sets: 1, seconds: 30 }] } });
  expect(made.status()).toBe(201);
  const { workout } = await made.json();
  const now = Date.now();
  expect((await page.request.post(`${API}/sessions`, {
    data: {
      workoutSlug: workout.slug, startedAt: new Date(now - 3 * 864e5).toISOString(), completedAt: new Date(now - 3 * 864e5 + 600e3).toISOString(), durationSec: 600,
      sets: [{ exerciseName: 'Goblet Squat', setNumber: 1, reps: 8, weightKg: 20 }],
    },
  })).status()).toBe(201);

  await page.goto(`/workouts/${workout.slug}/play`);
  await expect(page.getByText(/Last time \(/)).toBeVisible();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect.poll(() => page.evaluate(() => window.said.join(' | '))).toContain('Last time, 20 kilos for 8.');

  await page.getByLabel('Reps done').fill('8');
  await page.getByLabel('Weight in kilograms').fill('22.5');
  await page.getByRole('button', { name: 'Skip to next step' }).click();
  await expect.poll(() => page.evaluate(() => window.said.join(' | '))).toContain("That's 2.5 kilos more than last time. Nice work!");
});
