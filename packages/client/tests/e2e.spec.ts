import { test, expect } from '@playwright/test';

test.describe('Ice Cola E2E Tests', () => {
  test('登录并访问 MCP 市场', async ({ page }) => {
    // Clear storage and go to login
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    
    // 登录
    await page.fill('input[type="email"]', '601709253@qq.com');
    await page.fill('input[type="password"]', 'Aa19980112z');
    await page.click('button[type="submit"]');

    // 等待跳转或错误
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);

    if (currentUrl.includes('/login')) {
      const errorText = await page.locator('.text-red-500, [class*="error"]').first().textContent().catch(() => 'No error visible');
      console.log('Login error:', errorText);
      await page.screenshot({ path: 'test-results/login-error-final.png' });
      throw new Error('登录失败: ' + errorText);
    }

    // 访问 MCP 市场
    await page.goto('/mcp');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/mcp-market-final.png' });

    const mcpTitle = await page.locator('h1').first().textContent();
    console.log('MCP Page Title:', mcpTitle);
  });

  test('登录并访问专家市场', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    
    await page.fill('input[type="email"]', '601709253@qq.com');
    await page.fill('input[type="password"]', 'Aa19980112z');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      await page.screenshot({ path: 'test-results/login-error-experts.png' });
      throw new Error('登录失败');
    }

    await page.goto('/experts');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/experts-market-final.png' });

    const expertTitle = await page.locator('h1').first().textContent();
    console.log('Experts Page Title:', expertTitle);
  });
});
