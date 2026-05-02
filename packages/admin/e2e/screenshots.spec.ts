import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:1992';

test('Capture screenshots for verification report', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('net::')) {
      errors.push(msg.text());
    }
  });

  // Test 1: Unauthenticated access redirects to login
  console.log('=== Test 1: Unauthenticated redirect ===');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/.*login/);
  await page.screenshot({ path: 'screenshots/01-redirect-to-login.png', fullPage: true });
  console.log('Screenshot: 01-redirect-to-login.png');

  // Test 2: Login page loads without errors
  console.log('=== Test 2: Login page ===');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await page.screenshot({ path: 'screenshots/02-login-page.png', fullPage: true });
  console.log('Screenshot: 02-login-page.png');

  // Test 3: Protected route (users) redirects when not authenticated
  console.log('=== Test 3: Protected route (users) ===');
  await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/.*login/);
  await page.screenshot({ path: 'screenshots/03-protected-users-redirect.png', fullPage: true });
  console.log('Screenshot: 03-protected-users-redirect.png');

  // Test 4: Root path (dashboard) redirects when not authenticated
  console.log('=== Test 4: Root path (dashboard) ===');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/.*login/);
  await page.screenshot({ path: 'screenshots/04-root-redirect.png', fullPage: true });
  console.log('Screenshot: 04-root-redirect.png');

  // Test 5: Settings redirects
  console.log('=== Test 5: Settings redirect ===');
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/.*login/);
  await page.screenshot({ path: 'screenshots/05-settings-redirect.png', fullPage: true });
  console.log('Screenshot: 05-settings-redirect.png');

  // Test 6: Profile redirects
  console.log('=== Test 6: Profile redirect ===');
  await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/.*login/);
  await page.screenshot({ path: 'screenshots/06-profile-redirect.png', fullPage: true });
  console.log('Screenshot: 06-profile-redirect.png');

  // Check for QueryClient errors
  const queryClientErrors = errors.filter(e => e.includes('QueryClient') || e.includes('No QueryClient'));
  if (queryClientErrors.length > 0) {
    console.log('FAIL: QueryClient errors found:', queryClientErrors);
  } else {
    console.log('PASS: No QueryClient errors found!');
  }
});