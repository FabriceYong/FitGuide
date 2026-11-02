import fs from 'fs';
import { expect, test } from './fixtures';
import { API, signUpAndSignIn } from './helpers';

/** Width and height of a PNG, from its header. */
const pngSize = (bytes: Buffer) => [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];

test('the week card is saved as a picture where the browser cannot share files', async ({ page }) => {
  // Without Web Share for files (desktop browsers), the card is downloaded.
  await page.addInitScript(() => { Object.defineProperty(navigator, 'canShare', { value: undefined }); });
  await signUpAndSignIn(page, 'Sharer');
  const now = Date.now();
  expect((await page.request.post(`${API}/sessions`, {
    data: { workoutSlug: 'core-power-blast', startedAt: new Date(now - 30 * 60e3).toISOString(), completedAt: new Date(now - 5 * 60e3).toISOString(), durationSec: 25 * 60 },
  })).status()).toBe(201);

  await page.goto('/progress');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Share my week' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('fitguide-week.png');
  const bytes = fs.readFileSync(await file.path());
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  expect(pngSize(bytes)).toEqual([1080, 1350]);
  await expect(page.getByText('Picture saved. Post it wherever you like.')).toBeVisible();
});

test('a finished workout can be shared as a picture', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'canShare', { value: undefined }); });
  await signUpAndSignIn(page, 'Workout Sharer');
  await page.goto('/workouts/core-power-blast/play');
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(page.getByText('Saved to your progress')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Share my workout' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('fitguide-workout.png');
  expect(pngSize(fs.readFileSync(await file.path()))).toEqual([1080, 1350]);
});
