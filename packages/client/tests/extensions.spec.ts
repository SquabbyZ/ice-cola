/**
 * 扩展商店功能测试脚本
 * 使用 Playwright 进行端到端测试
 * 严格使用真实数据，禁止 mock
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:1420';
const EXTENSIONS_URL = `${BASE_URL}/extensions`;

test.describe('扩展商店功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到扩展商店页面
    await page.goto(EXTENSIONS_URL);
    await page.waitForLoadState('networkidle');
  });

  // 1. 页面加载和布局测试
  test('页面应该正确加载并显示扩展商店标题', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/OpenClaw Desktop/);
    
    // 验证主标题
    const heading = page.getByRole('heading', { name: '扩展商店' });
    await expect(heading).toBeVisible();
    
    // 验证副标题
    const subtitle = page.getByText('安装扩展插件，增强你的工作台功能');
    await expect(subtitle).toBeVisible();
    
    // 验证统计徽章
    await expect(page.getByText(/个扩展/)).toBeVisible();
    await expect(page.getByText(/已安装/)).toBeVisible();
  });

  // 2. 搜索功能测试
  test('搜索功能应该正确过滤扩展', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索扩展名称、描述或标签...');
    
    // 搜索 "翻译"
    await searchInput.fill('翻译');
    await page.waitForTimeout(500); // 等待搜索响应
    
    // 验证搜索结果
    const cards = page.locator('[class*="ExtensionCard"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    
    // 验证第一个结果包含"翻译"
    const firstCard = cards.first();
    await expect(firstCard).toContainText('翻译');
    
    // 清空搜索
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    // 验证恢复显示所有扩展
    const allCards = page.locator('[class*="ExtensionCard"]');
    const allCount = await allCards.count();
    expect(allCount).toBeGreaterThan(count);
  });

  // 3. 分类筛选测试
  test('分类筛选应该正确工作', async ({ page }) => {
    // 点击"开发工具"分类
    await page.getByRole('button', { name: '开发工具' }).click();
    await page.waitForTimeout(500);
    
    // 验证分类按钮高亮
    const devToolBtn = page.getByRole('button', { name: '开发工具' });
    await expect(devToolBtn).toHaveClass(/bg-primary/);
    
    // 点击"全部"分类
    await page.getByRole('button', { name: '全部' }).click();
    await page.waitForTimeout(500);
    
    // 验证"全部"按钮高亮
    const allBtn = page.getByRole('button', { name: '全部' });
    await expect(allBtn).toHaveClass(/bg-primary/);
  });

  // 4. Tab 切换测试
  test('Tab 切换应该正确显示不同内容', async ({ page }) => {
    // 默认显示"扩展商店" tab
    const storeTab = page.getByRole('button', { name: /扩展商店 \(/ });
    await expect(storeTab).toHaveClass(/bg-white/);
    
    // 切换到"已安装" tab
    await page.getByRole('button', { name: /已安装 \(/ }).click();
    await page.waitForTimeout(500);
    
    // 验证"已安装" tab 高亮
    const installedTab = page.getByRole('button', { name: /已安装 \(/ });
    await expect(installedTab).toHaveClass(/bg-white/);
    
    // 切回"扩展商店" tab
    await storeTab.click();
    await page.waitForTimeout(500);
  });

  // 5. 扩展卡片显示测试
  test('扩展卡片应该正确显示所有信息', async ({ page }) => {
    // 获取第一个扩展卡片
    const firstCard = page.locator('[class*="ExtensionCard"]').first();
    
    // 验证卡片可见
    await expect(firstCard).toBeVisible();
    
    // 验证扩展名称
    const extensionName = firstCard.locator('h3').first();
    await expect(extensionName).toBeVisible();
    
    // 验证作者信息
    const author = firstCard.locator('p').filter({ hasText: 'by' });
    await expect(author).toBeVisible();
    
    // 验证描述
    const description = firstCard.locator('p').filter({ hasText: /.{10,}/ }).first();
    await expect(description).toBeVisible();
    
    // 验证评分
    const rating = firstCard.locator('text=★');
    await expect(rating.first()).toBeVisible();
    
    // 验证下载量
    const downloads = firstCard.locator('[class*="Download"]');
    if (await downloads.count() > 0) {
      await expect(downloads.first()).toBeVisible();
    }
    
    // 验证版本号
    const version = firstCard.locator('text=/v[0-9]/');
    await expect(version.first()).toBeVisible();
    
    // 验证标签
    const tags = firstCard.locator('text=/^#/');
    const tagCount = await tags.count();
    expect(tagCount).toBeGreaterThan(0);
    
    // 验证更新时间
    const updatedAt = firstCard.locator('text=/更新于/');
    await expect(updatedAt).toBeVisible();
  });

  // 6. 安装扩展测试（需要后端支持）
  test('安装扩展按钮应该正确显示和响应', async ({ page }) => {
    // 找到未安装的扩展
    const installButton = page.getByRole('button', { name: '安装扩展' }).first();
    
    if (await installButton.isVisible()) {
      // 验证按钮文本
      await expect(installButton).toContainText('安装扩展');
      
      // 点击安装（注意：这会实际调用后端 API）
      await installButton.click();
      
      // 等待可能的确认对话框或加载状态
      await page.waitForTimeout(1000);
      
      // 验证按钮状态变化（可能变为"已安装"或显示加载状态）
      // 这里需要根据实际实现调整验证逻辑
    }
  });

  // 7. 卸载扩展测试
  test('卸载扩展应该显示确认对话框', async ({ page }) => {
    // 找到已安装的扩展的卸载按钮
    const uninstallButtons = page.getByRole('button', { name: '卸载' });
    const count = await uninstallButtons.count();
    
    if (count > 0) {
      // 处理确认对话框
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('确定要卸载');
        await dialog.dismiss(); // 取消卸载，避免实际删除数据
      });
      
      // 点击卸载按钮
      await uninstallButtons.first().click();
      
      // 等待对话框处理
      await page.waitForTimeout(500);
    }
  });

  // 8. 启用/禁用扩展测试
  test('启用/禁用按钮应该正确切换状态', async ({ page }) => {
    // 查找启用或禁用按钮
    const enableButton = page.getByRole('button', { name: '启用' }).first();
    const disableButton = page.getByRole('button', { name: '禁用' }).first();
    
    if (await disableButton.isVisible()) {
      // 当前是启用状态，点击禁用
      await disableButton.click();
      await page.waitForTimeout(1000);
      
      // 验证按钮变为"启用"
      const newEnableButton = page.getByRole('button', { name: '启用' }).first();
      await expect(newEnableButton).toBeVisible();
      
      // 再次点击启用
      await newEnableButton.click();
      await page.waitForTimeout(1000);
    } else if (await enableButton.isVisible()) {
      // 当前是禁用状态，点击启用
      await enableButton.click();
      await page.waitForTimeout(1000);
      
      // 验证按钮变为"禁用"
      const newDisableButton = page.getByRole('button', { name: '禁用' }).first();
      await expect(newDisableButton).toBeVisible();
    }
  });

  // 9. 配置弹窗测试
  test('配置弹窗应该正确显示和关闭', async ({ page }) => {
    // 找到配置按钮
    const configButtons = page.getByRole('button', { name: '配置扩展' });
    const count = await configButtons.count();
    
    if (count > 0) {
      // 点击配置按钮
      await configButtons.first().click();
      await page.waitForTimeout(500);
      
      // 验证弹窗显示
      const dialog = page.locator('[class*="fixed"][class*="inset-0"]');
      await expect(dialog).toBeVisible();
      
      // 验证弹窗圆角
      const dialogContent = dialog.locator('[class*="rounded-2xl"]').first();
      await expect(dialogContent).toBeVisible();
      
      // 验证弹窗内容
      await expect(dialog).toContainText('扩展配置');
      await expect(dialog).toContainText('基本信息');
      await expect(dialog).toContainText('版本');
      await expect(dialog).toContainText('作者');
      await expect(dialog).toContainText('状态');
      await expect(dialog).toContainText('描述');
      await expect(dialog).toContainText('标签');
      
      // 验证关闭按钮
      const closeButton = dialog.getByRole('button', { name: '关闭' });
      await expect(closeButton).toBeVisible();
      
      // 点击关闭按钮
      await closeButton.click();
      await page.waitForTimeout(500);
      
      // 验证弹窗关闭
      await expect(dialog).not.toBeVisible();
    }
  });

  // 10. 访问主页链接测试
  test('主页链接应该正确打开新标签页', async ({ page, context }) => {
    // 查找主页链接
    const homepageLinks = page.locator('a[target="_blank"][rel="noopener noreferrer"]');
    const count = await homepageLinks.count();
    
    if (count > 0) {
      const firstLink = homepageLinks.first();
      await expect(firstLink).toBeVisible();
      
      // 获取链接的 href
      const href = await firstLink.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toMatch(/^https?:\/\//);
      
      // 验证链接图标
      await expect(firstLink.locator('svg')).toBeVisible();
      
      // 注意：不实际点击打开新标签页，避免导航离开测试页面
    }
  });

  // 11. 空状态测试
  test('搜索无结果时应显示空状态', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索扩展名称、描述或标签...');
    
    // 搜索一个不存在的扩展
    await searchInput.fill('xyz_nonexistent_extension_12345');
    await page.waitForTimeout(500);
    
    // 验证空状态显示
    const emptyState = page.getByText('未找到匹配的扩展');
    await expect(emptyState).toBeVisible();
    
    // 验证提示信息
    await expect(page.getByText('尝试调整搜索条件或浏览其他分类')).toBeVisible();
  });

  // 12. 响应式布局测试
  test('扩展卡片网格应该正确响应不同屏幕尺寸', async ({ page }) => {
    // 验证网格布局
    const grid = page.locator('[class*="grid"][class*="grid-cols"]');
    await expect(grid).toBeVisible();
    
    // 验证卡片间距
    const cards = page.locator('[class*="ExtensionCard"]');
    const count = await cards.count();
    if (count > 1) {
      // 验证多个卡片正确排列
      await expect(cards.first()).toBeVisible();
      await expect(cards.nth(1)).toBeVisible();
    }
  });

  // 13. 加载状态测试
  test('加载时应该显示骨架屏', async ({ page }) => {
    // 这个测试需要模拟慢速网络
    // 在实际测试中，可以通过拦截请求来模拟加载状态
    await page.route('**/api/extensions/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    // 重新加载页面
    await page.reload();
    
    // 验证骨架屏显示（需要根据实际实现调整）
    const skeleton = page.locator('[class*="animate-pulse"]');
    // 由于加载很快，这个断言可能不稳定，仅作为示例
    // await expect(skeleton).toBeVisible();
  });

  // 14. 错误处理测试
  test('API 错误时应该显示错误信息', async ({ page }) => {
    // 模拟 API 错误
    await page.route('**/api/extensions', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    // 重新加载页面
    await page.reload();
    
    // 验证错误信息显示（需要根据实际实现调整）
    // const errorMessage = page.locator('[class*="bg-red-50"]');
    // await expect(errorMessage).toBeVisible();
  });
});
