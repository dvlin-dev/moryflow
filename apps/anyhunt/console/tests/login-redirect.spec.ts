import { test, expect } from '@playwright/test';

test('shows login redirect helper page', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByText('Redirecting to login...')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Click here if not redirected' })).toBeVisible();
});
