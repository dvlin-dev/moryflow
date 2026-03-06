import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdir, mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
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

test.describe('Moryflow PC core flow', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  let tempRoot = '';
  let userDataRoot = '';
  const stdoutLogs: string[] = [];
  const stderrLogs: string[] = [];

  test.beforeAll(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'moryflow-pc-e2e-'));
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
    const proc = electronApp.process();
    proc?.stdout?.on('data', (chunk) => stdoutLogs.push(chunk.toString()));
    proc?.stderr?.on('data', (chunk) => stderrLogs.push(chunk.toString()));
    page = await electronApp.firstWindow();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    page.on('console', (msg) => stdoutLogs.push(`[console:${msg.type()}] ${msg.text()}\n`));
    page.on('pageerror', (error) => stderrLogs.push(`[pageerror] ${error.message}\n`));
    await page.waitForLoadState('domcontentloaded');
    await page.addInitScript(() => {
      localStorage.setItem('moryflow_language', 'en');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async ({ page: _page }, testInfo) => {
    if (testInfo.status === testInfo.expectedStatus) {
      return;
    }
    const trimmedStdout = stdoutLogs.slice(-80).join('');
    const trimmedStderr = stderrLogs.slice(-80).join('');
    if (trimmedStdout) {
      console.log('[e2e stdout]\n', trimmedStdout);
    }
    if (trimmedStderr) {
      console.log('[e2e stderr]\n', trimmedStderr);
    }
    if (page) {
      console.log('[e2e page url]', page.url());
    }
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test('create vault, autosave, settings, sites', async () => {
    const fileName = 'e2e-note';
    const filePath = path.join(tempRoot, 'E2E Vault', `${fileName}.md`);

    await page.waitForFunction(() => Boolean(window.desktopAPI));
    await expect(page.getByTestId('workspace-shell')).toBeVisible();
    await expect(page.getByTestId('vault-empty-create-note')).toBeVisible();

    await page.getByTestId('vault-empty-create-note').click();
    await page.getByTestId('input-dialog-input').fill(fileName);
    await page.getByTestId('input-dialog-confirm').click();

    const editor = page.locator('.notion-like-editor');
    await expect(editor).toBeVisible();
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

    await page.getByTestId('sidebar-nav-sites').click();
    await expect(page.getByTestId('sites-empty-state')).toBeVisible();
  });
});
