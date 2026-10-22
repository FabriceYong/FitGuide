import { expect, test } from '@playwright/test';
import { signUpAndSignIn } from './helpers';

// Runs on a phone-sized viewport (see playwright.config.ts).
for (const path of ['/workouts', '/programs', '/plus']) {
  test(`${path} fits a phone screen without sideways scrolling`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('the dashboard fits a phone, with a bottom bar and a menu for the rest', async ({ page }) => {
  await signUpAndSignIn(page, 'Phone Tester');
  const bar = page.getByRole('navigation', { name: 'Dashboard' }).last();
  await expect(bar.getByRole('button')).toHaveText(['Home', 'Explore', 'Programs', 'Progress', 'Profile'], { ignoreCase: true });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: 'Calculators' }).click();
  await expect(page).toHaveURL(/\?tab=tools$/);
  for (const tab of ['Home', 'Explore', 'Programs', 'Progress', 'Profile']) {
    // dispatchEvent: in dev mode the Next.js dev-tools badge covers the bar's corner.
    await bar.getByRole('button', { name: tab }).dispatchEvent('click');
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, tab).toBeLessThanOrEqual(1);
  }
});

test('the app can be installed (manifest and icons)', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await request.get(href!)).json();
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).status()).toBe(200);
  }
});
