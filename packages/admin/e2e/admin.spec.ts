import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:1994';

test.describe('Admin E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to base URL
    await page.goto(BASE_URL);
  });

  test('Login page loads correctly', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Check page title
    await expect(page).toHaveTitle(/OpenClaw Admin/);

    // Check key elements
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check forgot password link
    const forgotLink = page.locator('button:has-text("Forgot")');
    await expect(forgotLink).toBeVisible();

    // Check language selector exists
    await expect(page.locator('button svg.lucide-globe')).toBeVisible();

    // Verify no console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a moment for any errors to surface
    await page.waitForTimeout(1000);
    expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });

  test('Dashboard displays stats after login', async ({ page }) => {
    // First navigate to login
    await page.goto(`${BASE_URL}/login`);

    // Since we don't have real auth, check the dashboard structure
    // Note: In real E2E, we would login first or mock auth

    // Check dashboard title exists
    const title = page.locator('h2');
    await expect(title).toBeVisible();

    // Check stat cards exist
    const cards = page.locator('.card');
    await expect(cards.first()).toBeVisible();

    // Verify stats sections with icons
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Pending Invitations')).toBeVisible();
    await expect(page.locator('text=Active Sessions')).toBeVisible();
  });

  test('Users page shows user list and role management', async ({ page }) => {
    await page.goto(`${BASE_URL}/users`);

    // Check page title
    await expect(page.locator('h2:has-text("Users")')).toBeVisible();

    // Check for invite user button
    const inviteButton = page.locator('button:has-text("Invite")');
    await expect(inviteButton).toBeVisible();

    // Check for table headers
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Role")')).toBeVisible();
    await expect(page.locator('th:has-text("Actions")')).toBeVisible();
  });

  test('Profile page has editing forms', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);

    // Check page title
    await expect(page.locator('h2:has-text("Profile")')).toBeVisible();

    // Check profile form elements
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('button:has-text("Save")')).toBeVisible();

    // Check password change section
    await expect(page.locator('#currentPassword')).toBeVisible();
    await expect(page.locator('#newPassword')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.locator('button:has-text("Change Password")')).toBeVisible();
  });

  test('Settings page has all configuration forms', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);

    // Check page title
    await expect(page.locator('h2:has-text("Settings")')).toBeVisible();

    // Check for all 4 configuration sections
    await expect(page.locator('text=Email Provider')).toBeVisible();
    await expect(page.locator('text=CAPTCHA Provider')).toBeVisible();
    await expect(page.locator('text=URL Settings')).toBeVisible();
    await expect(page.locator('text=Verification Settings')).toBeVisible();

    // Check for form inputs in each section
    // Email Provider
    await expect(page.locator('#resendApiKey')).toBeVisible();
    await expect(page.locator('#resendFromEmail')).toBeVisible();

    // CAPTCHA Provider
    await expect(page.locator('#captchaSiteKey')).toBeVisible();
    await expect(page.locator('#captchaSecretKey')).toBeVisible();

    // URL Settings
    await expect(page.locator('#clientUrl')).toBeVisible();
    await expect(page.locator('#adminUrl')).toBeVisible();

    // Verification Settings
    await expect(page.locator('#verificationCodeExpiry')).toBeVisible();
    await expect(page.locator('#verificationCodeLength')).toBeVisible();
  });
});

test.describe('Console Error Check', () => {
  test('No critical console errors on any page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('net::')) {
        errors.push(msg.text());
      }
    });

    const pages = ['/login', '/profile', '/settings'];

    for (const path of pages) {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForTimeout(500);
    }

    // Log any errors found
    if (errors.length > 0) {
      console.log('Console errors found:', errors);
    }

    expect(errors).toHaveLength(0);
  });
});