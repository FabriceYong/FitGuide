import { expect, test } from './fixtures';
import { signUpAndSignIn } from './helpers';

test('a new member sees their first-week steps tick off, and can hide them', async ({ page }) => {
  await signUpAndSignIn(page, 'First Weeker');
  const starter = page.getByRole('region', { name: 'Your first week' });
  await expect(starter).toContainText('0 of 7 first steps done');
  await expect(starter.getByRole('link', { name: /Log a meal/ })).toHaveAttribute('href', '/nutrition');

  // The readiness check-in is on the same page.
  const readiness = page.getByRole('region', { name: "Today's readiness" });
  await readiness.getByRole('radio', { name: 'Good' }).click();
  await readiness.getByRole('radio', { name: 'None' }).click();
  await readiness.getByRole('button', { name: 'See my readiness' }).click();
  await expect(readiness.getByText('Ready to push')).toBeVisible();
  await page.reload();
  await expect(starter).toContainText('1 of 7 first steps done');
  await expect(starter.getByRole('listitem').filter({ hasText: 'Check your readiness' })).toContainText('(done)');

  await starter.getByRole('button', { name: 'Hide your first week steps' }).click();
  await expect(starter).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('region', { name: "Today's readiness" })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your first week' })).toHaveCount(0);
});
