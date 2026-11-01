import { expect, test } from './fixtures';
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

test('a barcode fills in a packaged food to check and log', async ({ page }) => {
  await signUpAndSignIn(page, 'Barcode Tester');
  await page.goto('/nutrition');
  await page.getByRole('button', { name: 'Add food' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Barcode' }).click();
  // The e2e API's Open Food Facts stand-in knows only this product.
  await dialog.getByLabel(/barcode/i).fill('4000000000000');
  await dialog.getByRole('button', { name: 'Look up' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('We couldn’t find that product. Enter it manually instead.');

  await dialog.getByLabel(/barcode/i).fill('3017620422003');
  await dialog.getByRole('button', { name: 'Look up' }).click();
  await expect(dialog.getByLabel('Name')).toHaveValue('Nutella Hazelnut spread (15 g)');
  await expect(dialog.getByLabel(/^calories/i)).toHaveValue('81');
  await dialog.getByRole('button', { name: 'Per 100 g' }).click();
  await expect(dialog.getByLabel(/^calories/i)).toHaveValue('539');
  await dialog.getByRole('button', { name: /^Per serving/ }).click();
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Nutella Hazelnut spread (15 g)').first()).toBeVisible();
});

test('water is counted a glass at a time on the home page', async ({ page }) => {
  await signUpAndSignIn(page, 'Water Tester');
  const add = page.getByRole('button', { name: 'Add a glass of water (250 ml)' });
  await expect(add).toBeEnabled();
  await add.click();
  await expect(page.getByText('250 ml of 2.5 l')).toBeVisible();
  await add.click();
  await expect(page.getByText('500 ml of 2.5 l')).toBeVisible();
  await page.getByRole('button', { name: 'Remove a glass of water' }).click();
  await expect(page.getByText('250 ml of 2.5 l')).toBeVisible();
  await page.reload();
  await expect(page.getByText('250 ml of 2.5 l')).toBeVisible();
});

test('progress shows achievements and the muscles trained this week', async ({ page }) => {
  await signUpAndSignIn(page, 'Badge Tester');
  const now = Date.now();
  expect((await page.request.post(`${API}/sessions`, { data: {
    workoutSlug: 'core-power-blast',
    startedAt: new Date(now - 40 * 60_000).toISOString(),
    completedAt: new Date(now - 60_000).toISOString(),
    durationSec: 30 * 60,
    sets: [{ exerciseName: 'Barbell Back Squat', reps: 5, weightKg: 80 }],
  } })).status()).toBe(201);
  await page.goto('/progress');

  const badges = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Achievements' }) });
  // The squat set is a personal record too.
  await expect(badges.getByText(/^2 of \d+$/)).toBeVisible();
  await expect(badges.getByRole('listitem').filter({ hasText: 'First workout' })).toContainText('Earned');
  await expect(badges.getByRole('listitem').filter({ hasText: 'First record' })).toContainText('Earned');
  await expect(badges.getByRole('progressbar', { name: '10 workouts: 1 of 10' })).toBeVisible();

  const muscles = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Muscles this week' }) });
  await expect(muscles.getByText(/^Legs · 1 workout$/)).toBeVisible();
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
