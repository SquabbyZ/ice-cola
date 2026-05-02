const path = require('path');
const fs = require('fs');

// Resolve playwright-core from pnpm store
const pwCorePath = path.join('C:', 'Users', 'smallMark', 'Desktop', 'peaksclaw', 'ice-cola', 'node_modules', '.pnpm', 'playwright-core@1.59.1', 'node_modules', 'playwright-core');
const { chromium } = require(pwCorePath);

const BASE_URL = 'http://localhost:1994';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

async function runTests() {
  // Ensure screenshots directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log('Launching Chrome...');
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });

  const results = {
    testDate: new Date().toISOString(),
    pages: []
  };

  // Test pages
  const pages = [
    { path: '/login', name: 'Login', checks: ['#email', '#password', 'button[type="submit"]'] },
    { path: '/', name: 'Dashboard', checks: ['h2', '.card'] },
    { path: '/users', name: 'Users', checks: ['h2', 'table'] },
    { path: '/profile', name: 'Profile', checks: ['#email', '#name', '#currentPassword'] },
    { path: '/settings', name: 'Settings', checks: ['#resendApiKey', '#captchaSiteKey'] }
  ];

  for (const pageInfo of pages) {
    console.log(`\nTesting ${pageInfo.name}...`);
    const context = await browser.newContext();
    const page = await context.newPage();

    const pageResult = {
      name: pageInfo.name,
      url: pageInfo.path,
      passed: true,
      errors: [],
      elements: []
    };

    // Collect console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('net::')) {
        consoleErrors.push(msg.text());
      }
    });

    try {
      await page.goto(`${BASE_URL}${pageInfo.path}`, { waitUntil: 'networkidle', timeout: 10000 });

      // Wait a bit for React to render
      await page.waitForTimeout(2000);

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOTS_DIR, `${pageInfo.name.toLowerCase()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`  Screenshot saved: ${screenshotPath}`);
      pageResult.screenshot = screenshotPath;

      // Check for key elements
      for (const selector of pageInfo.checks) {
        const element = page.locator(selector).first();
        const isVisible = await element.isVisible().catch(() => false);
        pageResult.elements.push({ selector, visible: isVisible });
        if (!isVisible) {
          console.log(`  WARNING: Element ${selector} not visible`);
        }
      }

      // Check for console errors
      if (consoleErrors.length > 0) {
        pageResult.consoleErrors = consoleErrors;
        console.log(`  Console errors: ${consoleErrors.length}`);
      }

    } catch (error) {
      pageResult.passed = false;
      pageResult.errors.push(error.message);
      console.log(`  ERROR: ${error.message}`);
    }

    await context.close();
    results.pages.push(pageResult);
  }

  await browser.close();

  // Summary
  const passed = results.pages.filter(p => p.passed).length;
  const failed = results.pages.filter(p => !p.passed).length;
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

  return results;
}

runTests().then(results => {
  // Write results JSON
  const resultsPath = path.join(__dirname, '..', 'reports', 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${resultsPath}`);
}).catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});