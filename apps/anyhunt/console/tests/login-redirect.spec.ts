import { test, expect } from '@playwright/test';

test('shows local login form', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByText('Anyhunt Console')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
