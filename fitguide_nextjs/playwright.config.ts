import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests: `npm run test:e2e`. Starts its own API (with a
 * throwaway embedded Postgres) on 5055 and the web app on 3055, so it never
 * touches your dev database or servers.
 */
const WEB = 'http://localhost:3055';
const API = 'http://localhost:5055';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile.spec.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: [
    {
      command: 'node ../fitguide_api/scripts/e2eServer.js',
      url: `${API}/api/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: { E2E_API_PORT: '5055', E2E_WEB_ORIGIN: WEB },
    },
    {
      command: 'npx next dev -p 3055',
      url: WEB,
      timeout: 180_000,
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_API_URL: `${API}/api`, NEXT_PUBLIC_SITE_URL: WEB },
    },
  ],
});
