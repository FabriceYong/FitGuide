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
