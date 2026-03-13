import { expect, test, type Page } from '@playwright/test';
import type { PCHarnessSession } from './helpers/pc-harness.js';
import { createPCHarnessSession } from './helpers/pc-harness.js';
import { createRootNoteFromEmptyState } from './helpers/workspace-actions.js';

const configureFakeAgentModel = async (page: Page, baseUrl: string | undefined) => {
  await page.waitForFunction(() => Boolean(window.desktopAPI?.agent?.updateSettings));
  await page.evaluate(async (resolvedBaseUrl) => {
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
          baseUrl: resolvedBaseUrl,
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
  }, baseUrl);
};

const openSelectByLabel = async (page: Page, label: string) => {
  await page.getByRole('combobox', { name: label }).click();
};

const chooseSelectOption = async (page: Page, label: string, option: string) => {
  await openSelectByLabel(page, label);
  await page.getByRole('option', { name: option }).click();
};

test.describe('Moryflow PC automations harness', () => {
  let session: PCHarnessSession | null = null;

  test.beforeEach(async () => {
    session = await createPCHarnessSession({
      tempPrefix: 'moryflow-pc-e2e-automations-',
      fakeLlm: {
        delayMs: 500,
        body: { error: { message: 'automations harness failure' } },
      },
      pageTimeoutMs: 30_000,
    });
  });

  test.afterEach(async ({ page: _page }, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus) {
      await session?.dispose();
      session = null;
      return;
    }
    session?.printFailureDiagnostics();
    await session?.dispose();
    session = null;
  });

  test('creates a keep-local automation from the Automations module and restores it after reload', async () => {
    if (!session) {
      throw new Error('Harness session not initialized.');
    }
    const { page } = session;

    await expect(page.getByTestId('workspace-shell')).toBeVisible();
    await page.getByRole('button', { name: 'Automations' }).click();
    await expect(page.getByText('Local scheduler')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New automation' })).toBeVisible();

    await page.getByRole('button', { name: 'New automation' }).click();
    await page.getByLabel('Name').fill('Daily local digest');
    await page.getByLabel('What to run').fill('Create a concise local-only digest for today.');
    await chooseSelectOption(page, 'Push result', 'Keep local only');

    await page.getByRole('button', { name: 'Create automation' }).click();
    await expect(page.getByText('Please confirm unattended execution permissions.')).toBeVisible();

    await page.getByRole('switch', { name: 'Confirm unattended execution' }).click();
    await page.getByRole('button', { name: 'Create automation' }).click();

    await expect(page.getByRole('button', { name: 'Daily local digest' })).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Automations' }).click();
    await expect(page.getByText('Local scheduler')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Daily local digest' })).toBeVisible();
  });

  test('opens the chat header automate entry and prefills the latest user message', async () => {
    if (!session) {
      throw new Error('Harness session not initialized.');
    }
    const { page, fakeLlm } = session;

    await page.getByRole('tab', { name: 'Home' }).click();
    await createRootNoteFromEmptyState(page);
    await configureFakeAgentModel(page, fakeLlm?.baseUrl);
    await expect(page.getByText('E2E Model')).toBeVisible();

    await page
      .getByRole('textbox', { name: 'Write something... Use @ to reference files' })
      .fill('Turn this into a scheduled weekly digest.');
    await page.getByRole('button', { name: 'Send Message' }).click();

    await expect(
      page
        .locator('[data-message-id]')
        .filter({ hasText: 'Turn this into a scheduled weekly digest.' })
        .first()
    ).toBeVisible();
    await expect(page.getByText('automations harness failure')).toBeVisible();

    const automateButton = page.getByRole('button', { name: 'Automate' });
    await expect(automateButton).toBeEnabled();
    await automateButton.click();

    await expect(page.getByRole('heading', { name: 'Create automation' })).toBeVisible();
    await expect(page.getByLabel('What to run')).toHaveValue(
      'Turn this into a scheduled weekly digest.'
    );
  });
});
