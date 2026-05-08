import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 180000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:1420',
    headless: true,
    screenshot: 'on',
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--no-proxy-server'],
    },
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'reports/playwright-report' }]],
});
