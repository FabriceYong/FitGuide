import { expect, test, type Page } from './fixtures';
import { API, emailedLink, newAccount, signUpAndSignIn } from './helpers';

const next = (page: Page, name: RegExp = /^continue$/i) => page.getByRole('button', { name }).last().click();

test('a friend who signs up with an invite link and works out gives you both a week of PLUS', async ({ page, browser }) => {
  await signUpAndSignIn(page, 'Ines Inviter');
  await page.goto('/community');
  const card = page.getByRole('region', { name: 'Invite a friend' });
  await expect(card).toContainText('No one has joined with your link yet.');
  const link = await card.getByRole('textbox', { name: 'Your invite link' }).inputValue();
  expect(link).toMatch(/\/\?signup=1&invite=[A-Z2-9]{8}$/);

  // The friend, in their own browser, follows the link straight into sign-up.
  const friendContext = await browser.newContext();
  const friend = await friendContext.newPage();
  await friend.route(/^https:\/\/(images|plus)\.unsplash\.com\//, (route) => route.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64') }));
  const account = newAccount('Fred Friend');
  await friend.goto(link);
  await next(friend, /get started/i);
  await next(friend);
  await friend.getByRole('button', { name: /^Male/ }).click();
  await next(friend);
  await next(friend);
  await friend.getByRole('button', { name: /Build muscle/ }).click();
  await next(friend);
  await next(friend);
  await next(friend);
  await next(friend);
  await friend.getByRole('button', { name: 'No equipment' }).click();
  await friend.getByRole('button', { name: '30 min' }).click();
  await friend.getByRole('button', { name: '3 per week' }).click();
  await next(friend);
  await expect(friend.getByText('A friend invited you.')).toBeVisible();
  await friend.getByLabel('Full name').fill(account.name);
  await friend.getByLabel('Email').fill(account.email);
  await friend.getByLabel('Password', { exact: true }).fill(account.password);
  await friend.getByRole('button', { name: 'Create account' }).click();
  await expect(friend.getByRole('heading', { name: 'Confirm your email' })).toBeVisible();
  await friend.goto(await emailedLink(friend, account.email, '/verify-email'));
  await expect(friend.getByText('Recommended for you')).toBeVisible();

  const now = Date.now();
  const saved = await friend.request.post(`${API}/sessions`, {
    data: { workoutSlug: 'core-power-blast', startedAt: new Date(now - 30 * 60e3).toISOString(), completedAt: new Date(now - 60e3).toISOString(), durationSec: 1700 },
  });
  expect((await saved.json()).inviteRewarded).toBe(true);
  await friendContext.close();

  await page.reload();
  await expect(card).toContainText('1 joined with your link, 1 finished a first workout.');
  await expect(card).toContainText('You have PLUS until');
  expect((await (await page.request.get(`${API}/auth/me`)).json()).user.plan).toBe('plus');
});
