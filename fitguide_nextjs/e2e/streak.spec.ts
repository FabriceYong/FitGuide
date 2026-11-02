import { expect, test } from './fixtures';
import { API, signUpAndSignIn } from './helpers';

test('progress shows the week streak with this week against the goal', async ({ page }) => {
  await signUpAndSignIn(page, 'Steady Weeks');
  const now = Date.now();
  expect((await page.request.post(`${API}/sessions`, {
    data: { workoutSlug: 'core-power-blast', startedAt: new Date(now - 30 * 60e3).toISOString(), completedAt: new Date(now - 60e3).toISOString(), durationSec: 1700 },
  })).status()).toBe(201);

  await page.goto('/progress');
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Week streak' }) });
  await expect(panel).toContainText('0 weeks in a row training at least 3 days a week');
  await expect(panel).toContainText('1 of 3 days this week');
  await expect(panel.getByRole('list', { name: 'Recent weeks' }).getByRole('listitem')).toHaveCount(1);
});
