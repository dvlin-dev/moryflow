import { test, expect } from '@playwright/test';
import type { PCHarnessSession } from './helpers/pc-harness.js';
import { createPCHarnessSession } from './helpers/pc-harness.js';
import { createRootNoteFromEmptyState } from './helpers/workspace-actions.js';
const isMac = process.platform === 'darwin';
const selectAllShortcut = isMac ? 'Meta+A' : 'Control+A';

test.describe('Moryflow PC chat chips flow', () => {
  let session: PCHarnessSession;

  test.beforeAll(async () => {
    session = await createPCHarnessSession({
      tempPrefix: 'moryflow-pc-e2e-chat-chips-',
      fakeLlm: {
        delayMs: 3_000,
        body: { error: { message: 'e2e delayed failure' } },
      },
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

  test('clears selection chip immediately after submit while keeping current file chip and rendering both chips in user message', async () => {
    const selectedSnippet = 'E2E selection snippet alpha beta gamma';
    const userPrompt = 'Summarize the selected text.';
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
            models: [
              {
                id: 'e2e-model',
                enabled: true,
                isCustom: true,
                customName: 'E2E Model',
              },
            ],
            defaultModelId: 'e2e-model',
          },
        ],
      });
    }, fakeLlm?.baseUrl);

    await expect(page.getByText('E2E Model')).toBeVisible();
    await expect(page.getByTestId('workspace-shell')).toBeVisible();
    await page.getByRole('tab', { name: 'Home' }).click();
    const { fileLabel: noteFileLabel } = await createRootNoteFromEmptyState(page);
    const editor = page.locator('.notion-like-editor');
    await editor.click();
    await page.keyboard.type(`${selectedSnippet}\nAdditional line for chat chip e2e.`);

    await editor.click();
    await page.keyboard.press(selectAllShortcut);

    const removeReferenceButtons = page.getByRole('button', { name: /remove reference/i });
    await expect(removeReferenceButtons).toHaveCount(2);

    const chatTextarea = page.locator('textarea[name="message"]');
    await expect(chatTextarea).toBeVisible();
    await chatTextarea.fill(userPrompt);
    await page.getByRole('button', { name: /send/i }).click();
    await expect(removeReferenceButtons).toHaveCount(1);

    const userMessage = page.locator('[data-message-id]').filter({ hasText: userPrompt }).first();
    await expect(userMessage).toBeVisible();
    await expect(userMessage.getByText(noteFileLabel)).toBeVisible();
    await expect(userMessage.getByText(selectedSnippet)).toBeVisible();

    await page.waitForTimeout(3_200);
  });
});
