import { test as base } from '@playwright/test';

export { expect, type Page } from '@playwright/test';

// A 1×1 transparent GIF.
const BLANK = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/**
 * Every test's page answers photos from Unsplash with a blank image, so the
 * tests don't depend on (or wait for) another site. "networkidle" never came
 * while those requests stalled.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(/^https:\/\/(images|plus)\.unsplash\.com\//, (route) => route.fulfill({ status: 200, contentType: 'image/gif', body: BLANK }));
    await use(page);
  },
});
