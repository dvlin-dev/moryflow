/**
 * 导航相关 E2E 测试
 * 这些测试需要模拟已登录状态
 */

import { test, expect, Page } from '@playwright/test';

// 模拟登录状态的辅助函数
async function mockAuthenticatedUser(page: Page) {
  await page.addInitScript(() => {
    // 模拟 Zustand auth store 的持久化状态
    const authState = {
      state: {
        admin: {
          id: 'test-admin-id',
          email: 'admin@example.com',
          name: 'Test Admin',
          isAdmin: true,
        },
        isAuthenticated: true,
      },
      version: 0,
    };
    localStorage.setItem('admin-auth', JSON.stringify(authState));
  });

  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'test-access-token' }),
    });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-admin-id',
        email: 'admin@example.com',
        name: 'Test Admin',
        isAdmin: true,
      }),
    });
  });
}

test.describe('Navigation (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test('should display sidebar navigation', async ({ page }) => {
    await page.goto('/');

    // 验证侧边栏导航项
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /users/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /subscriptions/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /orders/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /credits/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /logs/i })).toBeVisible();
  });

  test('should navigate to Users page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /users/i }).click();
    await expect(page).toHaveURL('/users');
    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
  });

  test('should navigate to Subscriptions page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /subscriptions/i }).click();
    await expect(page).toHaveURL('/subscriptions');
    await expect(page.getByRole('heading', { name: /subscriptions/i })).toBeVisible();
  });

  test('should navigate to Orders page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /orders/i }).click();
    await expect(page).toHaveURL('/orders');
    await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible();
  });

  test('should navigate to Credits page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /credits/i }).click();
    await expect(page).toHaveURL('/credits');
    await expect(page.getByRole('heading', { name: /credit/i })).toBeVisible();
  });

  test('should navigate to Logs page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /logs/i }).click();
    await expect(page).toHaveURL('/logs');
    await expect(page.getByRole('heading', { name: /log/i })).toBeVisible();
  });

  test('should highlight active navigation item', async ({ page }) => {
    await page.goto('/users');

    // 验证 Users 链接有 active 状态的样式
    const usersLink = page.getByRole('link', { name: /users/i });
    await expect(usersLink).toHaveAttribute('data-active', 'true');
  });
});

test.describe('Header', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test('should display user info in header', async ({ page }) => {
    await page.goto('/');

    // 验证用户信息显示
    await expect(page.getByText('admin@example.com')).toBeVisible();
  });

  test('should have logout button', async ({ page }) => {
    await page.goto('/');

    // 验证登出按钮存在
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();
  });
});
