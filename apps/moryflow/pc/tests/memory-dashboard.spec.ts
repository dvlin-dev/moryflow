/**
 * Memory Dashboard E2E — covers Dashboard UI rendering, navigation, and state transitions.
 *
 * These tests run against the built Electron app without a real Memory backend,
 * so they verify the offline/unauthenticated UI paths.
 */

import { test, expect } from '@playwright/test';
import type { PCHarnessSession } from './helpers/pc-harness.js';
import { createPCHarnessSession } from './helpers/pc-harness.js';

test.describe('Memory Dashboard', () => {
  let session: PCHarnessSession;

  test.beforeAll(async () => {
    session = await createPCHarnessSession({
      tempPrefix: 'moryflow-pc-memory-e2e-',
    });
  });

  test.afterEach(async ({ page: _page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      session.printFailureDiagnostics();
    }
  });

  test.afterAll(async () => {
    await session.dispose();
  });

  test('navigate to Memory module and see dashboard heading', async () => {
    const { page } = session;

    await page.waitForFunction(() => Boolean(window.desktopAPI));
    await expect(page.getByTestId('workspace-shell')).toBeVisible();

    // Navigate to Memory via sidebar
    await page.getByRole('button', { name: 'Memory' }).click();

    // Dashboard h1 title should be visible
    await expect(page.getByRole('heading', { name: 'Memory', exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('unauthenticated user sees login-required or empty state', async () => {
    const { page } = session;

    // Wait for the dashboard to settle
    await page.waitForTimeout(2_000);

    // Should see either "Please log in" heading or "Your AI doesn't know you yet"
    const loginPrompt = page.getByText('Please log in to access Memory');
    const emptyState = page.getByText("Your AI doesn't know you yet");

    const hasLogin = await loginPrompt.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(hasLogin || hasEmpty).toBe(true);
  });

  test('search button is visible on Memory page', async () => {
    const { page } = session;

    const searchButton = page.locator('button').filter({
      has: page.locator('svg.lucide-search'),
    });
    await expect(searchButton.first()).toBeVisible({ timeout: 5_000 });
  });

  test('Connections card is hidden when no graph data', async () => {
    const { page } = session;

    // Without backend, there's no graph data
    await page.waitForTimeout(2_000);
    const connectionsText = page.getByText('Connections', { exact: false });
    // Should not see a Connections card (the sidebar button "Memory" contains no "Connections")
    // We check specifically for the card pattern: "N entities"
    const entitiesText = page.getByText('entities');
    const isVisible = await entitiesText.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('can navigate away and back to Memory', async () => {
    const { page } = session;

    // Navigate to Sites (another module)
    const sitesButton = page.getByRole('button', { name: 'Sites' });
    if (await sitesButton.isVisible().catch(() => false)) {
      await sitesButton.click();
      await page.waitForTimeout(1_000);
    }

    // Navigate back to Memory
    await page.getByRole('button', { name: 'Memory' }).click();
    await expect(page.getByRole('heading', { name: 'Memory', exact: true }).first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
