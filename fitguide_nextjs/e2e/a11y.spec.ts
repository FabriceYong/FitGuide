import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signUpAndSignIn } from './helpers';

/**
 * Automated accessibility checks (WCAG 2.1 A/AA) on the pages built in the
 * rework. Serious and critical issues fail the test.
 */
const PUBLIC_PAGES = ['/workouts', '/programs', '/plus', '/offline'];
const PRIVATE_PAGES = ['/plan', '/nutrition', '/community', '/progress'];

async function expectNoSeriousViolations(page: import('@playwright/test').Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`), path).toEqual([]);
}

for (const path of PUBLIC_PAGES) {
  test(`no serious accessibility issues on ${path}`, async ({ page }) => {
    await expectNoSeriousViolations(page, path);
  });
}

test('no serious accessibility issues on signed-in pages', async ({ page }) => {
  await signUpAndSignIn(page, 'Axe Tester');
  for (const path of PRIVATE_PAGES) await expectNoSeriousViolations(page, path);
});

test('the skip link moves focus to the main content', async ({ page }) => {
  await page.goto('/workouts');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});
