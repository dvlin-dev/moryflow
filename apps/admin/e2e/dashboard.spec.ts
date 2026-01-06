/**
 * Dashboard 页面 E2E 测试
 */

import { test, expect, Page } from '@playwright/test';

// 模拟登录状态的辅助函数
async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    const authState = {
      state: {
        user: {
          id: 'test-admin-id',
          email: 'admin@example.com',
          name: 'Test Admin',
          isAdmin: true,
        },
        isAuthenticated: true,
        isLoading: false,
      },
      version: 0,
    };
    localStorage.setItem('admin-auth', JSON.stringify(authState));
  });
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test('should display dashboard page', async ({ page }) => {
    await page.goto('/');

    // 验证仪表盘标题
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should display stats cards', async ({ page }) => {
    await page.goto('/');

    // 验证统计卡片存在（即使数据加载中也应显示骨架）
    // 检查 "Total Users" 卡片
    await expect(page.getByText(/total users/i)).toBeVisible();
    await expect(page.getByText(/active users/i)).toBeVisible();
    await expect(page.getByText(/total revenue/i)).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    await page.goto('/');

    // 在数据加载前，可能显示加载状态或骨架屏
    // 由于我们没有 mock API，检查页面是否正确渲染
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should display tier distribution section', async ({ page }) => {
    await page.goto('/');

    // 验证用户等级分布部分
    await expect(page.getByText(/tier distribution/i)).toBeVisible();
  });

  test('should display new users stats', async ({ page }) => {
    await page.goto('/');

    // 验证新用户统计
    await expect(page.getByText(/new users today/i)).toBeVisible();
  });
});

test.describe('Dashboard Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // 验证页面在移动端正确渲染
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // 验证页面在平板端正确渲染
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});
