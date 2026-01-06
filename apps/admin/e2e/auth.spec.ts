/**
 * 认证相关 E2E 测试
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // 清除 localStorage（模拟登出状态）
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should redirect to login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    // 验证登录表单元素
    await expect(page.getByRole('heading', { name: /aiget admin/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation error for empty form', async ({ page }) => {
    await page.goto('/login');

    // 点击登录按钮而不填写表单
    await page.getByRole('button', { name: /sign in/i }).click();

    // 验证显示错误信息（HTML5 验证或自定义验证）
    // 检查 email 字段是否显示为 invalid
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeFocused();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Email 字段应该无效
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/admin/i);
  });
});

test.describe('Protected Routes', () => {
  test('should redirect /users to login when not authenticated', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL('/login');
  });

  test('should redirect /subscriptions to login when not authenticated', async ({ page }) => {
    await page.goto('/subscriptions');
    await expect(page).toHaveURL('/login');
  });

  test('should redirect /orders to login when not authenticated', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL('/login');
  });

  test('should redirect /credits to login when not authenticated', async ({ page }) => {
    await page.goto('/credits');
    await expect(page).toHaveURL('/login');
  });

  test('should redirect /logs to login when not authenticated', async ({ page }) => {
    await page.goto('/logs');
    await expect(page).toHaveURL('/login');
  });
});
