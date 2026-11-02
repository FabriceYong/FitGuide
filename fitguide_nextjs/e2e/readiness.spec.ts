import { expect, test } from './fixtures';
import { signUpAndSignIn } from './helpers';

test('the morning check-in gives a readiness score, and can be changed', async ({ page }) => {
  await signUpAndSignIn(page, 'Ready Freddie');
  const card = page.getByRole('region', { name: "Today's readiness" });
  await expect(card).toBeVisible();
  const see = card.getByRole('button', { name: 'See my readiness' });
  await expect(see).toBeDisabled();

  await card.getByRole('radiogroup', { name: 'Energy' }).getByRole('radio', { name: 'Great' }).click();
  await card.getByRole('radiogroup', { name: 'Soreness' }).getByRole('radio', { name: 'None' }).click();
  await see.click();
  await expect(card.getByRole('img', { name: 'Readiness 86 out of 100' })).toBeVisible();
  await expect(card.getByText('Ready to push')).toBeVisible();
  await expect(card.getByRole('list', { name: 'What went into it' })).toContainText('Feeling great');

  await card.getByRole('button', { name: 'Change my answers' }).click();
  await expect(card.getByRole('radio', { name: 'Great' })).toHaveAttribute('aria-checked', 'true');
  await card.getByRole('radio', { name: 'Drained' }).click();
  await card.getByRole('radio', { name: 'Very' }).click();
  await card.getByRole('button', { name: 'See my readiness' }).click();
  await expect(card.getByText('Take it easy')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: "Today's readiness" }).getByRole('img', { name: 'Readiness 30 out of 100' })).toBeVisible();
});
