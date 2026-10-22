import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { API, signUpAndSignIn } from './helpers';

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
