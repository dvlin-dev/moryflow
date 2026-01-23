import { test, expect } from '@playwright/test';

test('renders admin login form', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByText('Anyhunt Admin')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});
