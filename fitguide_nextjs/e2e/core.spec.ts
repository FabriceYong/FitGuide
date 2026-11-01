import { expect, test } from '@playwright/test';
import { API, signUpAndSignIn } from './helpers';

test('private pages send signed-out visitors to sign in and back', async ({ page }) => {
  await page.goto('/nutrition');
  await expect(page).toHaveURL(/\/\?next=%2Fnutrition/);
  await expect(page.getByLabel('Email')).toBeVisible();
});

test('the workout catalog is server-rendered and browsable', async ({ page }) => {
  await page.goto('/workouts');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('link', { name: /Morning Sun Salutation Flow/ }).first().click();
  await expect(page).toHaveURL(/\/workouts\/morning-yoga-flow/);
  await expect(page.getByText('Morning Sun Salutation Flow').first()).toBeVisible();
});

test('sign in, build a plan and see it scheduled', async ({ page }) => {
  await signUpAndSignIn(page, 'Plan Tester');
  await page.goto('/plan');
  await expect(page.getByRole('heading', { name: 'Build your plan' })).toBeVisible();
  // Defaults come from the profile: Muscle goal, Intermediate level.
  await expect(page.getByRole('button', { name: 'Build strength and muscle' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByText('Dumbbells', { exact: true }).click();
  await page.getByRole('button', { name: 'Create my plan' }).click();
  await expect(page.getByRole('heading', { name: 'Your muscle plan' })).toBeVisible();
  await expect(page.getByText('Week 1', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start session' })).toBeVisible();
});

test('log food and see the day total', async ({ page }) => {
  await signUpAndSignIn(page, 'Food Tester');
  await page.goto('/nutrition');
  await page.getByRole('button', { name: 'Add food' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Search foods').fill('banana');
  await dialog.getByRole('button', { name: /Banana/ }).click();
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Banana', { exact: false }).first()).toBeVisible();
  // The day total (eaten of target, in the calorie ring) includes the banana.
  await expect(page.getByRole('group', { name: /^Eaten 105 of \d+ kcal$/ })).toBeVisible();
});

test('progress shows logged health data', async ({ page }) => {
  await signUpAndSignIn(page, 'Steps Tester');
  await page.goto('/progress');
  await page.getByLabel('Steps', { exact: true }).fill('8642');
  await page.getByRole('button', { name: 'Save' }).last().click();
  await expect(page.getByText('8,642').first()).toBeVisible();
});

test('the API refuses cross-site writes with the session cookie', async ({ page }) => {
  await signUpAndSignIn(page, 'Csrf Tester');
  const res = await page.request.put(`${API}/auth/profile`, { data: { name: 'Pwned' }, headers: { Origin: 'https://evil.example' } });
  expect(res.status()).toBe(403);
});
