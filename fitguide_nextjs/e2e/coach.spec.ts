import { expect, test } from './fixtures';
import { API, COACH_PROGRAM, E2E_COACH, signUpAndSignIn, switchAccount } from './helpers';

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('a member shares their progress, the coach sees them slipping and sends a note', async ({ page }) => {
  const member = await signUpAndSignIn(page, 'Riley Slipping');
  // Sessions on days 1 and 4 of each week: started 10 days ago, the first three were missed.
  const res = await page.request.post(`${API}/enrollments?tzOffset=${new Date().getTimezoneOffset()}`, {
    data: { programSlug: COACH_PROGRAM, startDate: ymd(new Date(Date.now() - 10 * 864e5)) },
  });
  expect(res.status()).toBe(201);

  await page.goto(`/programs/${COACH_PROGRAM}`);
  const share = page.getByRole('checkbox', { name: /Share my progress with Casey C\./ });
  await expect(share).not.toBeChecked();
  await share.click(); // checked once the API has saved it
  await expect(share).toBeChecked();

  await switchAccount(page, E2E_COACH);
  await page.goto('/studio');
  await page.getByRole('tab', { name: 'Clients' }).click();
  const riley = page.getByRole('listitem', { name: 'Riley Slipping' });
  await expect(riley).toBeVisible();
  await expect(riley.getByText('Missed the last 3 sessions')).toBeVisible();
  await expect(page.getByText('1 slipping')).toBeVisible();
  await riley.getByRole('button', { name: 'Send Riley a note' }).click();
  await riley.getByLabel('Note to Riley').fill('Missed you this week. Fancy a short one tomorrow?');
  await riley.getByRole('button', { name: 'Send note' }).click();
  await expect(riley.getByText('Note sent today')).toBeVisible();

  await switchAccount(page, member);
  const note = page.getByRole('region', { name: 'A note from Casey C.' });
  await expect(note.getByText('Fancy a short one tomorrow?')).toBeVisible();
  await note.getByRole('button', { name: 'Got it' }).click();
  await expect(note).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('region', { name: 'A note from Casey C.' })).toHaveCount(0);
});
