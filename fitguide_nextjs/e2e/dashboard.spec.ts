import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './fixtures';
import { signUpAndSignIn } from './helpers';

const dashboardNav = (page: Page) => page.getByRole('navigation', { name: 'Dashboard' }).first();

test('the dashboard tabs load real data and keep the tab in the URL', async ({ page }) => {
  await signUpAndSignIn(page, 'Dash Tester');
  // Home: the profile drives the recommendations, and nothing invented is shown.
  await expect(page.getByRole('heading', { name: 'Recommended for you' })).toBeVisible();
  await expect(page.getByText('Matched to your level (Intermediate) and goal (Muscle)')).toBeVisible();
  await expect(page.getByText(/12,400|Marcus T\.|Dr\. Marcus Vance/)).toHaveCount(0);

  await dashboardNav(page).getByRole('button', { name: 'Explore' }).click();
  await expect(page).toHaveURL(/\?tab=explore$/);
  await expect(page.getByRole('heading', { name: /^\d+ workouts$/ })).toBeVisible();
  const total = Number((await page.getByRole('heading', { name: /^\d+ workouts$/ }).textContent())!.split(' ')[0]);
  await page.getByRole('button', { name: `Show all ${total}` }).click();
  await expect(page.locator('main a[href^="/workouts/"]')).toHaveCount(total);

  await page.getByRole('button', { name: 'Exercises', exact: true }).click();
  await expect(page.getByText(/^\d+ of \d+ exercises$/)).toBeVisible();
  await page.getByRole('button', { name: /Goblet Squat/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Goblet Squat' });
  await expect(dialog.getByRole('heading', { name: 'How to do it' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  // Back from a workout page returns to the same tab.
  await dashboardNav(page).getByRole('button', { name: 'Programs' }).click();
  await expect(page.getByRole('link', { name: 'Build my plan' })).toHaveAttribute('href', '/plan');
  await page.locator('main a[href^="/programs/"]').first().click();
  await expect(page).toHaveURL(/\/programs\//);
  await page.goBack();
  await expect(page).toHaveURL(/\?tab=programs$/);
  await expect(page.getByRole('heading', { name: 'Multi-week programs' })).toBeVisible();
});

test('favorites saved from Explore show up in Favorites', async ({ page }) => {
  await signUpAndSignIn(page, 'Fav Tester');
  await dashboardNav(page).getByRole('button', { name: 'Explore' }).click();
  await page.getByRole('button', { name: 'Add Morning Sun Salutation Flow to favorites' }).click();
  await expect(page.getByRole('button', { name: 'Remove Morning Sun Salutation Flow from favorites' })).toHaveAttribute('aria-pressed', 'true');

  await dashboardNav(page).getByRole('button', { name: 'Favorites' }).click();
  await expect(page.getByText('1 saved')).toBeVisible();
  await page.getByRole('button', { name: 'Remove Morning Sun Salutation Flow from favorites' }).click();
  await expect(page.getByText('No favorites yet')).toBeVisible();
});

test('a review is tied to the workout it reviews', async ({ page }) => {
  await signUpAndSignIn(page, 'Review Tester');
  await dashboardNav(page).getByRole('button', { name: 'Reviews' }).click();
  await page.getByRole('button', { name: 'Write a review' }).click();
  await page.getByLabel('Workout', { exact: true }).selectOption({ label: 'Morning Sun Salutation Flow' });
  // Click the star (the radio's label), as a mouse user would.
  await page.locator('label').filter({ has: page.getByRole('radio', { name: '4 stars' }) }).click();
  await expect(page.getByRole('radio', { name: '4 stars' })).toBeChecked();
  await page.getByLabel('Your review').fill('Calm and clear. Written by the end-to-end test.');
  await page.getByRole('button', { name: 'Post review' }).click();
  const review = page.locator('main ul li').filter({ hasText: 'Written by the end-to-end test.' });
  await expect(review.getByRole('link', { name: 'Morning Sun Salutation Flow' })).toHaveAttribute('href', '/workouts/morning-yoga-flow');
  await expect(review.getByRole('img', { name: '4 out of 5 stars' })).toBeVisible();
});

test('the calculators use the profile', async ({ page }) => {
  await signUpAndSignIn(page, 'Calc Tester');
  await dashboardNav(page).getByRole('button', { name: 'Calculators' }).click();
  await page.getByRole('button', { name: 'Daily calories' }).click();
  // The test account was born in 1990.
  await expect(page.getByLabel('Age', { exact: true })).toHaveValue(String(new Date().getFullYear() - 1990));
  // The test account has no sex, height or weight on file, so the result waits for them.
  await expect(page.getByText('Enter your age, height, weight and sex.')).toBeVisible();
  await page.getByLabel('Height (cm)').fill('170');
  await page.getByLabel('Weight (kg)').fill('65');
  await page.getByRole('button', { name: 'female' }).click();
  await expect(page.getByText('To keep your current weight')).toBeVisible();
  await expect(page.getByRole('link', { name: /Nutrition page/ })).toHaveAttribute('href', '/nutrition');
});

test('no serious accessibility issues on the dashboard tabs', async ({ page }) => {
  await signUpAndSignIn(page, 'Dash Axe Tester');
  for (const tab of ['Home', 'Explore', 'Programs', 'Favorites', 'Progress', 'Reviews', 'Calculators', 'Profile']) {
    await dashboardNav(page).getByRole('button', { name: tab }).click();
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`), tab).toEqual([]);
  }
});
