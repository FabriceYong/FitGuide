import { expect, type Page } from '@playwright/test';

export const API = 'http://localhost:5055/api';
// The e2e API keeps emails here instead of sending them (fitguide_api/scripts/e2eServer.js).
export const MAILBOX = 'http://127.0.0.1:5056';

let counter = 0;

/** A fresh account for each test, created through the API. */
export function newAccount(name = 'E2E Tester') {
  counter += 1;
  return { name, email: `e2e-${Date.now()}-${counter}@example.test`, password: 'e2e-password-123', goal: 'Muscle', fitnessLevel: 'Intermediate', birthYear: 1990 };
}

/** The link containing `path` in the latest email to `email`, once it has arrived. */
export async function emailedLink(page: Page, email: string, path: string) {
  let link = '';
  await expect.poll(async () => {
    const res = await page.request.get(`${MAILBOX}/?to=${encodeURIComponent(email)}`);
    const text: string = res.ok() ? (await res.json()).text : '';
    link = text.match(/https?:\/\/\S+/g)?.find((url) => url.includes(path)) ?? '';
    return link;
  }).toContain(path);
  return link;
}

/** Register through the API and confirm the email with the emailed link. */
export async function registerConfirmed(page: Page, account: ReturnType<typeof newAccount>) {
  expect((await page.request.post(`${API}/auth/register`, { data: account })).status()).toBe(201);
  const token = new URL(await emailedLink(page, account.email, '/verify-email')).searchParams.get('token');
  expect((await page.request.post(`${API}/auth/verify-email`, { data: { token } })).status()).toBe(200);
}

/** Register (with the email confirmed), then sign in through the real login form. */
export async function signUpAndSignIn(page: Page, name?: string) {
  const account = newAccount(name);
  await registerConfirmed(page, account);
  // Sign-in through the UI sets the session cookies and local session marker.
  await page.context().clearCookies();
  await page.goto('/');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByLabel('Email')).toHaveCount(0);
  return account;
}

// The approved coach and program the e2e API seeds (fitguide_api/scripts/e2eServer.js).
export const E2E_COACH = { name: 'Casey Coach', email: 'coach@e2e.test', password: 'e2e-coach-password-123' };
export const COACH_PROGRAM = 'e2e-coach-club';

/** Sign out through the profile menu, then sign in as `account` through the login form. */
export async function switchAccount(page: Page, account: { email: string; password: string }) {
  await page.goto('/');
  await page.locator('header button[aria-haspopup="menu"]').click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByLabel('Email')).toHaveCount(0);
}
