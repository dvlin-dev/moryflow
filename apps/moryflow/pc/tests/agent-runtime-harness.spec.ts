import { test, expect } from '@playwright/test';
import type { PCHarnessSession } from './helpers/pc-harness.js';
import { createPCHarnessSession } from './helpers/pc-harness.js';
import { createRootNoteFromEmptyState } from './helpers/workspace-actions.js';

test.describe('Moryflow PC agent runtime harness', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });
  let session: PCHarnessSession;

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    session = await createPCHarnessSession({
      tempPrefix: 'moryflow-pc-e2e-agent-runtime-',
      fakeLlm: {
        delayMs: 500,
        body: { error: { message: 'agent runtime harness failure' } },
      },
      pageTimeoutMs: 30_000,
    });
  });

  test.afterAll(async () => {
    await session.dispose();
  });

  test('boots chat shell,发出 runtime 请求，并展示失败反馈同时保留当前文件引用', async () => {
    const { page, fakeLlm } = session;

    await page.waitForFunction(() => Boolean(window.desktopAPI?.agent?.updateSettings));
    await page.evaluate(async (baseUrl) => {
      await window.desktopAPI.agent.updateSettings({
        model: {
          defaultModel: 'e2e-provider/e2e-model',
        },
        providers: [],
        customProviders: [
          {
            providerId: 'e2e-provider',
            name: 'E2E Provider',
            enabled: true,
            apiKey: 'e2e-key',
            baseUrl,
            models: [{ id: 'e2e-model', enabled: true, isCustom: true, customName: 'E2E Model' }],
            defaultModelId: 'e2e-model',
          },
        ],
      });
    }, fakeLlm?.baseUrl);

    await expect(page.getByTestId('workspace-shell')).toBeVisible();
    await expect(page.getByText('E2E Model')).toBeVisible();
    await page.getByRole('tab', { name: 'Home' }).click();
    const { fileLabel: noteFileLabel } = await createRootNoteFromEmptyState(page);
    const editor = page.locator('.notion-like-editor');
    await editor.click();
    await page.keyboard.type('Harness content for current file chip.');

    const removeReferenceButtons = page.getByRole('button', { name: /remove reference/i });
    await expect(removeReferenceButtons).toHaveCount(1);

    const chatTextarea = page.locator('textarea[name="message"]');
    await chatTextarea.fill('Explain this file briefly.');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(removeReferenceButtons).toHaveCount(1);
    await expect.poll(() => fakeLlm?.getRequestCount() ?? 0).toBeGreaterThan(0);
    const userMessage = page
      .locator('[data-message-id]')
      .filter({ hasText: 'Explain this file briefly.' })
      .first();
    await expect(userMessage).toBeVisible();
    await expect(userMessage.getByText(noteFileLabel)).toBeVisible();
    await expect(page.getByText('agent runtime harness failure')).toBeVisible();
  });
});
