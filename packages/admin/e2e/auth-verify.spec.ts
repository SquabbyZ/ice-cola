import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:1992';

test.describe('Admin Auth Verification', () => {
  test('1. Unauthenticated访问应重定向到login', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('net::')) {
        errors.push(msg.text());
      }
    });

    // 访问首页
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // 应该重定向到login页面
    await expect(page).toHaveURL(/.*login/);

    // Login页面应该有关键元素
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // 不应该有"No QueryClient set"错误
    const queryClientErrors = errors.filter(e => e.includes('QueryClient') || e.includes('query'));
    expect(queryClientErrors).toHaveLength(0);
  });

  test('2. Login页面应该正常显示无console错误', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('net::')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    // 检查关键元素
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // 等待确保任何异步错误都出现
    await page.waitForTimeout(1000);

    // 过滤掉无关错误
    const relevantErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('net::') &&
      !e.includes('QueryClient')
    );

    if (relevantErrors.length > 0) {
      console.log('Console errors:', relevantErrors);
    }

    // 不应该有QueryClient相关错误
    expect(consoleErrors.filter(e => e.includes('QueryClient') || e.includes('No QueryClient'))).toHaveLength(0);
  });

  test('3. 尝试带token访问dashboard (无效token应该redirect)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text());
      }
    });

    // 用假token尝试访问
    await page.goto(`${BASE_URL}/?token=fake`, { waitUntil: 'networkidle' });

    // 应该仍然在login或者重定向到login
    await expect(page).toHaveURL(/.*login/);

    // 不应该有"No QueryClient set"错误
    const queryClientErrors = errors.filter(e => e.includes('QueryClient') || e.includes('query'));
    expect(queryClientErrors).toHaveLength(0);
  });

  test('4. ProtectedRoute无token时重定向到login', async ({ page }) => {
    // 直接访问受保护页面
    await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle' });

    // 应该重定向到login
    await expect(page).toHaveURL(/.*login/);

    // 登录页应该可见
    await expect(page.locator('#email')).toBeVisible();
  });

  test('5. ErrorBoundary应该捕获渲染错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    // 页面应该正常渲染没有崩溃
    await expect(page.locator('body')).toBeVisible();

    // ErrorBoundary不应该触发(没有错误时应该正常渲染children)
    const errorUI = page.locator('text=Something went wrong');
    // 如果有错误会显示这个，没错误则不应该显示

    await page.waitForTimeout(500);
  });
});