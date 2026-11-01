import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { API, emailedLink, newAccount, registerConfirmed, signUpAndSignIn } from './helpers';

const openProfile = (page: Page) => page.getByRole('navigation', { name: 'Dashboard' }).first().getByRole('button', { name: 'Profile' }).click();
const NEW_PASSWORD = 'e2e-new-password-456';

test('changing the password keeps you signed in', async ({ page }) => {
  const account = await signUpAndSignIn(page, 'Password Tester');
  await openProfile(page);
  await page.getByRole('button', { name: 'Change password' }).click();
  const dialog = page.getByRole('dialog', { name: 'Change password' });

  const axe = await new AxeBuilder({ page }).include('dialog').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);

  // A wrong current password is reported, and doesn't sign you out.
  await dialog.getByLabel('Current password').fill('not-my-password');
  await dialog.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD);
  await dialog.getByLabel('Repeat new password').fill(NEW_PASSWORD);
  await dialog.getByRole('button', { name: 'Change password' }).click();
  await expect(dialog.getByRole('alert')).toHaveText(/current password is incorrect/);

  await dialog.getByLabel('Current password').fill(account.password);
  await dialog.getByRole('button', { name: 'Change password' }).click();
  await expect(dialog.getByRole('status')).toContainText('Password changed');
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toHaveCount(0);

  // Still signed in after a reload, and only the new password works.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Delete account' })).toBeVisible();
  const login = (password: string) => page.request.post(`${API}/auth/login`, { data: { email: account.email, password } });
  expect((await login(account.password)).status()).toBe(401);
  expect((await login(NEW_PASSWORD)).status()).toBe(200);
});

test('reminders are saved and turned on in this browser', async ({ page }) => {
  // Headless Chromium has no push service, so the browser's side is faked.
  await page.addInitScript(() => {
    let current: object | null = null;
    const endpoint = `https://fcm.googleapis.com/fcm/send/e2e-${Date.now()}`;
    const fake = {
      endpoint,
      toJSON: () => ({ endpoint, keys: { p256dh: 'BKey', auth: 'secret' } }),
      unsubscribe: async () => { current = null; return true; },
    };
    Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
    Notification.requestPermission = async () => 'granted';
    PushManager.prototype.getSubscription = async () => current as PushSubscription | null;
    PushManager.prototype.subscribe = async () => (current = fake) as unknown as PushSubscription;
  });
  await signUpAndSignIn(page, 'Reminder Tester');
  await openProfile(page);
  await page.getByRole('button', { name: 'Reminders' }).click();
  const dialog = page.getByRole('dialog', { name: 'Reminders' });
  await expect(dialog.getByText('Off in this browser.')).toBeVisible();

  const axe = await new AxeBuilder({ page }).include('dialog').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);

  await dialog.getByRole('button', { name: 'Monday' }).click();
  await dialog.getByRole('button', { name: 'Thursday' }).click();
  await expect(dialog.getByRole('button', { name: 'Thursday' })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByLabel('Time').fill('07:15');
  await dialog.getByRole('checkbox', { name: /Keep my streak going/ }).check();
  await dialog.getByRole('button', { name: 'Save reminders' }).click();
  await expect(dialog.getByRole('button', { name: 'Saved' })).toBeVisible();

  const subscribed = page.waitForResponse((r) => r.url().endsWith('/api/reminders/push') && r.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Turn on in this browser' }).click();
  expect((await subscribed).status()).toBe(201);
  await expect(dialog.getByText('On in this browser.')).toBeVisible();

  const { settings, upcoming } = await (await page.request.get(`${API}/reminders`)).json();
  expect(settings).toMatchObject({ days: [1, 4], time: '07:15', streak: true });
  expect(settings.timeZone).toBeTruthy();
  expect(upcoming.length).toBeGreaterThanOrEqual(3);

  const unsubscribed = page.waitForResponse((r) => r.url().endsWith('/api/reminders/push') && r.request().method() === 'DELETE');
  await dialog.getByRole('button', { name: 'Turn off in this browser' }).click();
  expect((await unsubscribed).status()).toBe(200);
  await expect(dialog.getByText('Off in this browser.')).toBeVisible();
});

test('a new account confirms its email before it can sign in', async ({ page }) => {
  const account = newAccount('Confirm Tester');
  expect((await page.request.post(`${API}/auth/register`, { data: account })).status()).toBe(201);
  await page.goto('/');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // The right password, but not confirmed yet: check your inbox.
  await expect(page.getByRole('heading', { name: 'Confirm your email' })).toBeVisible();
  await expect(page.getByText(`We've sent a link to ${account.email}.`)).toBeVisible();
  await expect(page.getByRole('button', { name: /Resend email \(\d+ s\)/ })).toBeDisabled();
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);

  // The emailed link confirms the email and signs in.
  const link = await emailedLink(page, account.email, '/verify-email?token=');
  await page.goto(link);
  await expect(page.getByRole('navigation', { name: 'Dashboard' }).first()).toBeVisible();

  // It works once; a used link offers a new one.
  await page.goto(link);
  await expect(page.getByRole('heading', { name: 'This link has expired' })).toBeVisible();
  await page.getByLabel('Email').fill(account.email);
  await page.getByRole('button', { name: 'Send a new link' }).click();
  await expect(page.getByRole('status').filter({ hasText: /new link/ })).toBeVisible();
});

test('a forgotten password can be reset from the emailed link', async ({ page }) => {
  const account = newAccount('Reset Tester');
  await registerConfirmed(page, account);
  await page.context().clearCookies();
  await page.goto('/');
  await page.getByLabel('Email').fill(account.email);
  await page.getByRole('button', { name: 'Forgot password?' }).click();

  // The email typed on the sign-in page is carried over.
  await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue(account.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

  const link = await emailedLink(page, account.email, '/reset-password?token=');
  await page.goto(link);
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  await page.getByLabel('New password').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Set new password' }).click();

  // Signed straight in, and only the new password works.
  await expect(page.getByRole('navigation', { name: 'Dashboard' }).first()).toBeVisible();
  const login = (password: string) => page.request.post(`${API}/auth/login`, { data: { email: account.email, password } });
  expect((await login(account.password)).status()).toBe(401);
  expect((await login(NEW_PASSWORD)).status()).toBe(200);

  // The link works once.
  await page.goto(link);
  await page.getByLabel('New password').fill('another-new-password');
  await page.getByRole('button', { name: 'Set new password' }).click();
  await expect(page.getByRole('heading', { name: 'This link has expired' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Send a new link' })).toHaveAttribute('href', '/?forgot=1');
});

test('deleting the account signs you out for good', async ({ page }) => {
  const account = await signUpAndSignIn(page, 'Delete Tester');
  await openProfile(page);
  await page.getByRole('button', { name: 'Delete account' }).click();

  const confirm = page.getByRole('dialog', { name: 'Delete your account?' });
  await expect(confirm).toContainText('can’t be undone');
  await confirm.getByRole('button', { name: 'Continue' }).click();

  const dialog = page.getByRole('dialog', { name: 'Delete account' });
  await dialog.getByLabel('Password').fill('not-my-password');
  await dialog.getByRole('button', { name: 'Delete my account' }).click();
  await expect(dialog.getByRole('alert')).toHaveText(/password is incorrect/);

  await dialog.getByLabel('Password').fill(account.password);
  await dialog.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page.getByLabel('Email')).toBeVisible();

  const login = await page.request.post(`${API}/auth/login`, { data: { email: account.email, password: account.password } });
  expect(login.status()).toBe(401);
});

test('guests have no password or account to manage', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fitguide_user', JSON.stringify({ id: 'guest', name: 'Guest Tester', isGuest: true, fitnessLevel: 'Beginner' }));
  });
  await page.goto('/?tab=profile');
  const main = page.getByRole('main');
  await expect(main.getByRole('button', { name: 'Leave guest mode' })).toBeVisible();
  await expect(main.getByRole('button', { name: 'Change password' })).toHaveCount(0);
  await expect(main.getByRole('button', { name: 'Delete account' })).toHaveCount(0);
});

test('weights and heights follow the units chosen in the profile', async ({ page }) => {
  await signUpAndSignIn(page, 'Pound Tester');
  expect((await page.request.put(`${API}/auth/profile`, { data: { height: 170, weight: 70, targetWeight: 65 } })).status()).toBe(200);
  await page.reload();
  await openProfile(page);
  await expect(page.getByText('70 kg', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Edit profile' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit profile' });
  await dialog.getByRole('button', { name: 'lb · ft/in' }).click();
  // What's in the form is converted.
  await expect(dialog.getByLabel('Weight (lb)')).toHaveValue('154.3');
  await expect(dialog.getByLabel('Height (ft)')).toHaveValue('5');
  await expect(dialog.getByLabel('Height (in)')).toHaveValue('7');
  await dialog.getByLabel('Target (lb)').fill('140');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toHaveCount(0);

  await expect(page.getByText('154.3 lb', { exact: true })).toBeVisible();
  await expect(page.getByText('5′ 7″', { exact: true })).toBeVisible();
  // Stored in metric: 140 lb is 63.5 kg.
  const me = (await (await page.request.get(`${API}/auth/me`)).json()).user;
  expect(me.units).toBe('imperial');
  expect(Math.round(me.targetWeight * 10) / 10).toBe(63.5);

  // A weigh-in is entered in pounds and saved in kg.
  await page.goto('/progress');
  const log = page.locator('form').filter({ hasText: 'Log measurements' });
  await log.getByLabel('Weight (lb)').fill('150');
  await log.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('150 lb', { exact: true }).first()).toBeVisible();
  const { metrics } = await (await page.request.get(`${API}/body-metrics`)).json();
  expect(Math.round(metrics[0].weightKg * 10) / 10).toBe(68);
});

test('your data downloads as JSON and CSV files', async ({ page }) => {
  const account = await signUpAndSignIn(page, 'Export Tester');
  expect((await page.request.post(`${API}/body-metrics`, { data: { weightKg: 72.5 } })).status()).toBe(201);
  await openProfile(page);
  await page.getByRole('button', { name: 'Download my data' }).click();
  const dialog = page.getByRole('dialog', { name: 'Download my data' });

  const axe = await new AxeBuilder({ page }).include('dialog').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);

  const [json] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Download Everything (JSON)' }).click()]);
  expect(json.suggestedFilename()).toMatch(/^fitguide-data-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(await (await import('node:fs/promises')).readFile(await json.path(), 'utf8'));
  expect(data.profile.email).toBe(account.email);
  expect(data.bodyMetrics[0].weightKg).toBe(72.5);
  await expect(dialog.getByRole('status')).toHaveText(`Saved ${json.suggestedFilename()}.`);

  const [csv] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Download Body measurements (CSV)' }).click()]);
  expect(csv.suggestedFilename()).toMatch(/^fitguide-body-.*\.csv$/);
  expect(await (await import('node:fs/promises')).readFile(await csv.path(), 'utf8')).toContain(',72.5,');
});
