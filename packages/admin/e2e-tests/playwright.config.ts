import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:1992',
    trace: 'on-first-retry',
    headless: true,
    screenshot: 'on',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: [/api-keys\.spec\.ts/, /gateway-integration\.spec\.ts/],
      use: {
        browserName: 'chromium',
      },
    },
  ],
});
