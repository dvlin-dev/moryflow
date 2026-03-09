import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createServer, type Server } from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mainEntry = path.join(appRoot, 'dist/main/index.js');
const rendererEntry = path.join(appRoot, 'dist/renderer/index.html');

const launchApp = async (userDataPath: string) => {
  const rendererUrl = pathToFileURL(rendererEntry).toString();
  return electron.launch({
    args: [mainEntry],
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: rendererUrl,
      MORYFLOW_E2E: 'true',
      MORYFLOW_E2E_USER_DATA: userDataPath,
    },
  });
};

const startFakeLlmServer = async (): Promise<{ server: Server; baseUrl: string }> => {
  const server = createServer((req, res) => {
    if (req.method === 'POST') {
      void req.resume();
    }
    setTimeout(() => {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'agent runtime harness failure' } }));
    }, 500);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start fake harness server.');
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
  };
};

test.describe('Moryflow PC agent runtime harness', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });
  let electronApp: ElectronApplication;
  let page: Page;
  let tempRoot = '';
  let userDataRoot = '';
  let fakeLlmServer: Server | null = null;
  let fakeLlmBaseUrl = '';

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    const fakeLlm = await startFakeLlmServer();
    fakeLlmServer = fakeLlm.server;
    fakeLlmBaseUrl = fakeLlm.baseUrl;

    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'moryflow-pc-e2e-agent-runtime-'));
    userDataRoot = path.join(tempRoot, 'user-data');
    await mkdir(userDataRoot, { recursive: true });

    const vaultName = 'E2E Vault';
    const vaultPath = path.join(tempRoot, vaultName);
    const vaultId = randomUUID();
    const storeDir = path.join(userDataRoot, 'stores');

    await mkdir(vaultPath, { recursive: true });
    await mkdir(storeDir, { recursive: true });
    await writeFile(
      path.join(storeDir, 'vault-store.json'),
      JSON.stringify({
        vaults: [{ id: vaultId, path: vaultPath, name: vaultName, addedAt: Date.now() }],
        activeVaultId: vaultId,
        migrated: true,
      })
    );

    electronApp = await launchApp(userDataRoot);
    page = await electronApp.firstWindow();
    page.setDefaultTimeout(30_000);
    await page.waitForLoadState('domcontentloaded');
    await page.addInitScript(() => {
      localStorage.setItem('moryflow_language', 'en');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
    if (fakeLlmServer) {
      await new Promise<void>((resolve, reject) => {
        fakeLlmServer?.close((error) => (error ? reject(error) : resolve()));
      });
    }
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test('boots chat shell and keeps current file reference after submit', async () => {
    const noteName = 'agent-runtime-harness-note';

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
    }, fakeLlmBaseUrl);

    await expect(page.getByTestId('workspace-shell')).toBeVisible();
    await expect(page.getByText('E2E Model')).toBeVisible();
    await page.getByRole('tab', { name: 'Home' }).click();
    await page.getByTestId('vault-empty-create-note').click();
    await page.getByTestId('input-dialog-input').fill(noteName);
    await page.getByTestId('input-dialog-confirm').click();

    const editor = page.locator('.notion-like-editor');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('Harness content for current file chip.');

    const removeReferenceButtons = page.getByRole('button', { name: /remove reference/i });
    await expect(removeReferenceButtons).toHaveCount(1);

    const chatTextarea = page.locator('textarea[name="message"]');
    await chatTextarea.fill('Explain this file briefly.');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(removeReferenceButtons).toHaveCount(1);
    const userMessage = page
      .locator('[data-message-id]')
      .filter({ hasText: 'Explain this file briefly.' })
      .first();
    await expect(userMessage).toBeVisible();
    await expect(userMessage.getByText(`${noteName}.md`)).toBeVisible();
  });
});
