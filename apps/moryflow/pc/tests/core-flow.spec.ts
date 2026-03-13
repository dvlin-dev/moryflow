import { test, expect } from '@playwright/test';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { PCHarnessSession } from './helpers/pc-harness.js';
import { createPCHarnessSession } from './helpers/pc-harness.js';
import { createRootNoteFromEmptyState } from './helpers/workspace-actions.js';

test.describe('Moryflow PC core flow', () => {
  let session: PCHarnessSession;

  test.beforeAll(async () => {
    session = await createPCHarnessSession({
      tempPrefix: 'moryflow-pc-e2e-',
    });
  });

  test.afterEach(async ({ page: _page }, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus) {
      return;
    }
    session.printFailureDiagnostics();
  });

  test.afterAll(async () => {
    await session.dispose();
  });

  test('create vault, autosave, settings, sites', async () => {
    const fileName = 'NewFile';
    const filePath = path.join(session.workspace.vaultPath, `${fileName}.md`);
    const { page } = session;

    await page.waitForFunction(() => Boolean(window.desktopAPI));
    await expect(page.getByTestId('workspace-shell')).toBeVisible();
    await expect(page.getByTestId('vault-empty-create-note')).toBeVisible();

    const { fileName: createdFileName } = await createRootNoteFromEmptyState(page);
    expect(createdFileName).toBe(fileName);
    const editor = page.locator('.notion-like-editor');
    await editor.click();
    await page.keyboard.type('Hello from E2E');

    await expect
      .poll(
        async () => {
          try {
            const content = await readFile(filePath, 'utf8');
            return content.includes('Hello from E2E');
          } catch {
            return false;
          }
        },
        { timeout: 10000 }
      )
      .toBe(true);

    await page.getByTestId('topbar-settings-button').click();
    await expect(page.getByTestId('settings-dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Sites' }).click();
    await expect(page.getByRole('heading', { name: 'Log in required' })).toBeVisible();
  });
});
