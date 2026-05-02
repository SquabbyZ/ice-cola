import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:1420',
    trace: 'on-first-retry',
    headless: true,
    channel: 'chrome',
    launchOptions: {
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});