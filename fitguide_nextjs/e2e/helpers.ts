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

/** Register through the API, then sign in through the real login form. */
export async function signUpAndSignIn(page: Page, name?: string) {
  const account = newAccount(name);
  const res = await page.request.post(`${API}/auth/register`, { data: account });
  expect(res.status()).toBe(201);
  // Sign-in through the UI sets the session cookies and local session marker.
  await page.context().clearCookies();
  await page.goto('/');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByLabel('Email')).toHaveCount(0);
  return account;
}
