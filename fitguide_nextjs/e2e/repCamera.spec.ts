import { expect, test } from './fixtures';
import { API, signUpAndSignIn } from './helpers';

test('push-ups offer counting with the camera, which says when it has no camera access', async ({ page }) => {
  // The camera is turned down, as when someone says no to the browser's prompt.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' })) },
    });
  });
  await signUpAndSignIn(page, 'Camera Counter');
  const res = await page.request.post(`${API}/my-workouts`, { data: { title: 'Push day', exercises: [{ name: 'Push-Ups', sets: 1, reps: '10' }] } });
  expect(res.status()).toBe(201);
  const { workout } = await res.json();

  await page.goto(`/workouts/${workout.slug}/play`);
  await page.getByRole('button', { name: 'Count reps with the camera' }).click();
  const dialog = page.getByRole('dialog', { name: 'Count push-ups with the camera' });
  await expect(dialog.getByRole('alert')).toHaveText('Camera access was turned down. Allow it in the browser to count reps.');
  await expect(dialog.getByRole('button', { name: 'Log 0 reps' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
});
