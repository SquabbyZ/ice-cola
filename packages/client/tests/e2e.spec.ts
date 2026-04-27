import { test, expect } from '@playwright/test';

test.describe('OpenClaw Desktop - 前两周开发成果验收', () => {
  
  test.beforeEach(async ({ page }) => {
    // 假设 Tauri 开发服务器运行在 1420 端口
    await page.goto('http://localhost:1420');
  });

  test('1. Dashboard 页面可视化检查', async ({ page }) => {
    // 检查侧边栏导航
    await expect(page.getByText('仪表盘')).toBeVisible();
    
    // 检查 Gateway 连接状态徽章
    const statusBadge = page.locator('.badge').filter({ hasText: /在线|离线/ });
    await expect(statusBadge).toBeVisible();

    // 检查用量统计卡片 (今日/本周/本月)
    await expect(page.getByText('今日')).toBeVisible();
    await expect(page.getByText('本周')).toBeVisible();
    await expect(page.getByText('本月')).toBeVisible();

    // 检查配额进度条
    await expect(page.getByText('月度配额使用情况')).toBeVisible();
    
    // 截图保存
    await page.screenshot({ path: 'test-results/dashboard-view.png' });
  });

  test('2. Chat 页面交互与流式响应检查', async ({ page }) => {
    // 切换到聊天页面
    await page.getByText('对话').click();
    
    // 检查输入框和发送按钮
    const textarea = page.locator('textarea[placeholder*="输入消息"]');
    await expect(textarea).toBeVisible();
    
    // 模拟发送消息
    await textarea.fill('Hello OpenClaw!');
    const sendButton = page.locator('button').getByRole('img', { name: /send/i }).first();
    await sendButton.click();

    // 检查消息是否出现在列表中
    await expect(page.getByText('Hello OpenClaw!')).toBeVisible();
    
    // 检查 AI 回复占位符或内容
    await expect(page.locator('.chat-message-assistant')).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: 'test-results/chat-interaction.png' });
  });

  test('3. Experts 专家系统页面检查', async ({ page }) => {
    await page.getByText('专家').click();
    
    // 检查标题和创建按钮
    await expect(page.getByText('专家系统')).toBeVisible();
    await expect(page.getByText('创建专家')).toBeVisible();

    // 检查 Tab 切换
    await page.getByText('我的专家').click();
    await page.getByText('专家市场').click();
    
    await page.screenshot({ path: 'test-results/experts-view.png' });
  });

  test('4. Skills 和 MCP 市场页面检查', async ({ page }) => {
    // 检查 Skills 市场
    await page.getByText('Skills').click();
    await expect(page.getByPlaceholder('搜索 Skill...')).toBeVisible();
    
    // 检查 MCP 市场
    await page.getByText('MCP').click();
    await expect(page.getByPlaceholder('搜索 MCP 服务...')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/marketplace-view.png' });
  });
});
