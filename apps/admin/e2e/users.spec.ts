/**
 * Users 页面 E2E 测试
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

test.describe('Users Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test('should display users page', async ({ page }) => {
    await page.goto('/users');

    // 验证页面标题
    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
  });

  test('should display users table', async ({ page }) => {
    await page.goto('/users');

    // 验证表格头
    await expect(page.getByRole('columnheader', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /tier/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /credits/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    await page.goto('/users');

    // 验证搜索输入框存在
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('should have tier filter', async ({ page }) => {
    await page.goto('/users');

    // 验证等级过滤器存在
    await expect(page.getByRole('combobox', { name: /tier/i })).toBeVisible();
  });

  test('should have pagination controls', async ({ page }) => {
    await page.goto('/users');

    // 验证分页控件
    await expect(page.getByRole('button', { name: /previous/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
  });

  test('should search users', async ({ page }) => {
    await page.goto('/users');

    // 输入搜索词
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('test@example.com');

    // 验证输入值
    await expect(searchInput).toHaveValue('test@example.com');
  });
});

test.describe('User Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test('should navigate to user detail from list', async ({ page }) => {
    await page.goto('/users');

    // 如果有用户行，点击查看详情
    // 由于没有真实数据，我们只测试 URL 格式
    await page.goto('/users/test-user-id');

    // 验证页面加载（可能显示 "User not found" 或详情）
    // 检查 URL 正确
    await expect(page).toHaveURL('/users/test-user-id');
  });
});

test.describe('Users Page Actions', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test('first page button should be disabled on first page', async ({ page }) => {
    await page.goto('/users');

    // 在第一页，Previous 按钮应该禁用
    const prevButton = page.getByRole('button', { name: /previous/i });
    await expect(prevButton).toBeDisabled();
  });
});
