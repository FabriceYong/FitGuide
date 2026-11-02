import { expect, test } from './fixtures';
import { API, signUpAndSignIn } from './helpers';

test("last month's recap plays as slides and ends with a picture to share", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'canShare', { value: undefined }); });
  await signUpAndSignIn(page, 'Recap Watcher');
  const now = new Date();
  const mid = new Date(now.getFullYear(), now.getMonth() - 1, 15, 12);
  for (const day of [0, 2]) {
    const done = new Date(mid.getTime() + day * 864e5);
    expect((await page.request.post(`${API}/sessions`, {
      data: { workoutSlug: 'core-power-blast', startedAt: new Date(done.getTime() - 30 * 60e3).toISOString(), completedAt: done.toISOString(), durationSec: 1800 },
    })).status()).toBe(201);
  }
  const monthName = mid.toLocaleDateString('en-GB', { month: 'long' });

  await page.goto('/progress');
  await page.getByRole('button', { name: 'Watch the recap' }).click();
  const story = page.getByRole('dialog', { name: new RegExp(`^${monthName} [0-9]{4} recap$`) });
  await expect(story.getByText(`Your ${monthName}`)).toBeVisible();
  await expect(story.getByText('2', { exact: true })).toBeVisible();
  await expect(story.getByText('workouts finished.')).toBeVisible();

  await story.getByRole('button', { name: 'Next' }).click();
  await expect(story.getByText('Time well spent')).toBeVisible();
  await expect(story.getByText('across 2 active days.')).toBeVisible();
  // On to the end.
  for (let i = 0; i < 6 && await story.getByRole('button', { name: 'Next' }).isVisible(); i++) await story.getByRole('button', { name: 'Next' }).click();
  await expect(story.getByText('Nice work')).toBeVisible();
  const download = page.waitForEvent('download');
  await story.getByRole('button', { name: 'Share my recap' }).click();
  expect((await download).suggestedFilename()).toMatch(/^fitguide-\d{4}-\d{2}\.png$/);
  await story.getByRole('button', { name: 'Done' }).click();
  await expect(story).toHaveCount(0);
});
